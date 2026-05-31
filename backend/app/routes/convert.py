import uuid
import os
import traceback
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from app.utils.config import settings
from app.models.schemas import ConvertRequest, TextConvertRequest, TextConvertResponse, UploadResponse
from app.services.dataset_service import (
    read_dataset, detect_text_columns, detect_dominant_language,
    convert_dataset_job, SUPPORTED_EXT,
)
from app.services.job_store import job_store
from app.services.groq_service import get_translator, detect_language

router = APIRouter()


# ── Single text ───────────────────────────────────────────────────
@router.post("/text", response_model=TextConvertResponse)
async def convert_text(req: TextConvertRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Empty text")

    src = req.source_language
    tgt = req.target_language

    if src == tgt and src != "auto":
        raise HTTPException(400, "source and target language are the same")

    try:
        translator = get_translator()
        if src == "auto":
            src = detect_language(req.text)
        if src == tgt:
            return TextConvertResponse(
                original=req.text, converted=req.text,
                source_language=src, target_language=tgt,
            )
        result = translator.translate_sync(req.text, src, tgt)
        return TextConvertResponse(
            original=req.text, converted=result,
            source_language=src, target_language=tgt,
        )
    except Exception as e:
        print("\n❌ /convert/text error:")
        traceback.print_exc()
        raise HTTPException(500, f"{type(e).__name__}: {e}")


# ── Upload dataset ────────────────────────────────────────────────
@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXT:
        raise HTTPException(400, f"Unsupported type: {ext}. Allowed: CSV, TSV, XLSX, XLS")

    if file.size and file.size > 150 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 150 MB)")

    job_id = uuid.uuid4().hex[:12]
    upload_path = Path(settings.UPLOAD_DIR) / f"{job_id}_{file.filename}"

    data = await file.read()
    upload_path.write_bytes(data)

    try:
        df = read_dataset(str(upload_path))
    except Exception as e:
        upload_path.unlink(missing_ok=True)
        traceback.print_exc()
        raise HTTPException(400, f"Could not parse file: {e}")

    if df.empty:
        raise HTTPException(400, "Dataset is empty")

    text_cols = detect_text_columns(df)
    lang = detect_dominant_language(df, text_cols)

    job_store.create(job_id, file.filename)
    job_store.update(
        job_id,
        detected_columns=df.columns.tolist(),
        text_columns=text_cols,
        source_language=lang,
        total_rows=len(df),
        upload_path=str(upload_path),
    )

    preview = df.head(10).fillna("").to_dict(orient="records")
    return UploadResponse(
        job_id=job_id,
        filename=file.filename,
        total_rows=len(df),
        columns=df.columns.tolist(),
        preview=preview,
        detected_language=lang,
    )


# ── Start conversion ──────────────────────────────────────────────
@router.post("/start")
async def start_conversion(req: ConvertRequest, bg: BackgroundTasks):
    job = job_store.get(req.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] == "processing":
        raise HTTPException(409, "Already processing")

    upload_path = job.get("upload_path")
    if not upload_path or not os.path.exists(upload_path):
        raise HTTPException(404, "Upload file missing — please re-upload")

    cols = req.text_columns or job.get("text_columns", [])
    if not cols:
        raise HTTPException(400, "No text columns selected")

    src = req.source_language
    tgt = req.target_language

    if src != "auto" and src == tgt:
        raise HTTPException(400, "source and target language are the same")

    job_store.update(
        req.job_id,
        text_columns=cols,
        source_language=src,
        target_language=tgt,
        status="processing",
        progress=0.0,
        processed_rows=0,
    )

    bg.add_task(convert_dataset_job, req.job_id, upload_path, cols, src, tgt)
    return {"job_id": req.job_id, "status": "processing"}


# ── Download ──────────────────────────────────────────────────────
@router.get("/download/{job_id}")
async def download(job_id: str, fmt: str = "csv"):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "completed":
        raise HTTPException(409, "Conversion not finished yet")

    files = job.get("output_files", {})
    # allow "excel" or "xlsx"
    key = "excel" if fmt in ("excel", "xlsx") else "csv"
    filename = files.get(key)
    if not filename:
        raise HTTPException(404, f"Format '{fmt}' not available")

    path = Path(settings.OUTPUT_DIR) / filename
    if not path.exists():
        raise HTTPException(404, "Output file missing from server")

    media = "text/csv" if key == "csv" else \
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return FileResponse(path, filename=filename, media_type=media)
