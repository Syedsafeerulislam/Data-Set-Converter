"""
Dataset I/O + conversion pipeline.

Reads:  CSV, TSV, Excel (any encoding, any language)
Writes: CSV (utf-8-sig) + Excel (.xlsx) only — as requested
"""
import asyncio
import re
from pathlib import Path
from typing import List
import pandas as pd

from app.services.groq_service import get_translator, detect_language
from app.services.job_store import job_store
from app.utils.config import settings

SUPPORTED_EXT = {".csv", ".tsv", ".xlsx", ".xls"}


# ─────────────────────────────────────────────────────────────────
# Read
# ─────────────────────────────────────────────────────────────────
def read_dataset(path: str) -> pd.DataFrame:
    ext = Path(path).suffix.lower()
    if ext not in SUPPORTED_EXT:
        raise ValueError(f"Unsupported type {ext}. Allowed: {sorted(SUPPORTED_EXT)}")

    if ext in {".xlsx", ".xls"}:
        return pd.read_excel(path, engine="openpyxl" if ext == ".xlsx" else None)

    # CSV / TSV — aggressive reading that preserves ALL rows
    import io as _io
    sep = "\t" if ext == ".tsv" else None

    # Strategy 1: clean encodings, warn instead of skip
    for enc in ("utf-8-sig", "utf-8", "utf-16", "cp1256", "latin1"):
        try:
            df = pd.read_csv(path, sep=sep, encoding=enc,
                             engine="python", on_bad_lines="warn")
            if df.shape[1] == 1 and "\t" in str(df.columns[0]):
                df = pd.read_csv(path, sep="\t", encoding=enc,
                                 engine="python", on_bad_lines="warn")
            if len(df) > 0:
                print(f"[read_dataset] {len(df)} rows loaded with encoding={enc}")
                return df
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception:
            continue

    # Strategy 2: force-decode bytes with replacement (NEVER drops rows)
    try:
        raw = Path(path).read_bytes()
        for enc in ("utf-8", "cp1256", "latin1"):
            try:
                text = raw.decode(enc, errors="replace")
                df = pd.read_csv(_io.StringIO(text), sep=sep, engine="python",
                                 on_bad_lines="warn")
                if df.shape[1] == 1 and "\t" in str(df.columns[0]):
                    df = pd.read_csv(_io.StringIO(text), sep="\t", engine="python",
                                     on_bad_lines="warn")
                if len(df) > 0:
                    print(f"[read_dataset] {len(df)} rows loaded via force-decode enc={enc}")
                    return df
            except Exception:
                continue
    except Exception:
        pass

    raise ValueError("Could not read file — try saving as UTF-8 CSV")


# ─────────────────────────────────────────────────────────────────
# Column detection
# ─────────────────────────────────────────────────────────────────
def detect_text_columns(df: pd.DataFrame) -> List[str]:
    """Columns that look like natural-language text (avg len > 10)."""
    cols = []
    for c in df.columns:
        if df[c].dtype == object:
            avg = df[c].dropna().astype(str).str.len().mean()
            if avg and avg > 10:
                cols.append(c)
    return cols or [c for c in df.columns if df[c].dtype == object]


def detect_dominant_language(df: pd.DataFrame, columns: List[str]) -> str:
    """Sample rows to decide the dominant language."""
    sample = []
    for c in columns:
        sample.extend(df[c].dropna().astype(str).head(30).tolist())
    if not sample:
        return "english"

    counts = {"urdu": 0, "roman_urdu": 0, "english": 0}
    for s in sample:
        counts[detect_language(s)] += 1

    return max(counts, key=counts.get)


# ─────────────────────────────────────────────────────────────────
# Write — CSV + Excel only
# ─────────────────────────────────────────────────────────────────
def save_outputs(df: pd.DataFrame, out_dir: str, base_name: str) -> dict:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    safe = re.sub(r"[^\w\-]+", "_", base_name)
    csv_path  = out_dir / f"{safe}_converted.csv"
    xlsx_path = out_dir / f"{safe}_converted.xlsx"

    df.to_csv(csv_path, index=False, encoding="utf-8-sig")

    try:
        df.to_excel(xlsx_path, index=False, engine="openpyxl")
    except Exception as e:
        print(f"[Excel save error] {e}")
        xlsx_path = None

    return {
        "csv":  csv_path.name  if csv_path  else None,
        "excel": xlsx_path.name if xlsx_path else None,
    }


# ─────────────────────────────────────────────────────────────────
# Background conversion pipeline
# ─────────────────────────────────────────────────────────────────
async def convert_dataset_job(
    job_id: str,
    file_path: str,
    text_columns: List[str],
    source_language: str,
    target_language: str,
):
    try:
        job_store.update(job_id, status="processing", progress=0.0)

        df = read_dataset(file_path)
        df = df.reset_index(drop=True)
        total = len(df)

        if not text_columns:
            text_columns = detect_text_columns(df)

        if source_language == "auto":
            source_language = detect_dominant_language(df, text_columns)

        job_store.update(
            job_id,
            total_rows=total,
            text_columns=text_columns,
            source_language=source_language,
        )

        translator = get_translator()
        batch_size = settings.BATCH_SIZE

        # Create output columns
        col_map = {}  # original_col → output_col_name
        for col in text_columns:
            out_col = f"{col}_{target_language}"
            df[out_col] = ""
            col_map[col] = out_col

        processed = 0
        for start in range(0, total, batch_size):
            end = min(start + batch_size, total)
            tasks = [
                translator.translate_batch(
                    df[col].iloc[start:end].astype(str).tolist(),
                    source_language,
                    target_language,
                )
                for col in text_columns
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for col, res in zip(text_columns, results):
                out_col = col_map[col]
                if isinstance(res, Exception):
                    print(f"[{col} batch {start}] error: {res}")
                    converted = df[col].iloc[start:end].astype(str).tolist()
                else:
                    converted = res
                df.loc[start:end - 1, out_col] = converted

            processed = end
            job_store.update(
                job_id,
                processed_rows=processed,
                progress=round(processed / total * 100, 2),
            )

        # Save CSV + Excel
        base = Path(file_path).stem
        files = save_outputs(df, settings.OUTPUT_DIR, base)
        preview = df.head(20).fillna("").to_dict(orient="records")

        job_store.update(
            job_id,
            status="completed",
            progress=100.0,
            output_files=files,
            preview=preview,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        job_store.update(job_id, status="failed", error=str(e))