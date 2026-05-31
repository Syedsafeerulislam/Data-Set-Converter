from fastapi import APIRouter, HTTPException
from app.services.job_store import job_store

router = APIRouter()


@router.get("/{job_id}")
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("")
async def list_jobs():
    return sorted(job_store.all(), key=lambda j: j.get("created_at", ""), reverse=True)


@router.delete("/{job_id}")
async def delete_job(job_id: str):
    if not job_store.delete(job_id):
        raise HTTPException(404, "Job not found")
    return {"deleted": job_id}
