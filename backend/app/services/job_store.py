import threading
from datetime import datetime
from typing import Dict, Optional


class JobStore:
    def __init__(self):
        self._jobs: Dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self, job_id: str, filename: str) -> dict:
        with self._lock:
            self._jobs[job_id] = {
                "job_id": job_id,
                "filename": filename,
                "status": "uploaded",
                "progress": 0.0,
                "total_rows": 0,
                "processed_rows": 0,
                "source_language": "auto",
                "target_language": "roman_urdu",
                "detected_columns": [],
                "text_columns": [],
                "error": None,
                "output_files": {},
                "upload_path": None,
                "preview": None,
                "created_at": datetime.utcnow().isoformat(),
            }
            return dict(self._jobs[job_id])

    def get(self, job_id: str) -> Optional[dict]:
        with self._lock:
            return dict(self._jobs[job_id]) if job_id in self._jobs else None

    def update(self, job_id: str, **kwargs) -> Optional[dict]:
        with self._lock:
            if job_id not in self._jobs:
                return None
            self._jobs[job_id].update(kwargs)
            self._jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
            return dict(self._jobs[job_id])

    def all(self) -> list:
        with self._lock:
            return [dict(j) for j in self._jobs.values()]

    def delete(self, job_id: str) -> bool:
        with self._lock:
            return self._jobs.pop(job_id, None) is not None


job_store = JobStore()
