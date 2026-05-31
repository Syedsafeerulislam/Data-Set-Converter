from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# Only these 3 languages are supported
Language = Literal["urdu", "english", "roman_urdu", "auto"]

# The 3 possible conversion targets
TargetLanguage = Literal["urdu", "english", "roman_urdu"]


class ConvertRequest(BaseModel):
    job_id: str
    source_language: Language = "auto"
    target_language: TargetLanguage = "roman_urdu"
    text_columns: List[str] = Field(default_factory=list)
    output_format: Literal["csv", "excel", "both"] = "both"


class JobStatus(BaseModel):
    job_id: str
    filename: str
    status: Literal["uploaded", "processing", "completed", "failed"]
    progress: float = 0.0
    total_rows: int = 0
    processed_rows: int = 0
    source_language: Language = "auto"
    target_language: TargetLanguage = "roman_urdu"
    detected_columns: List[str] = []
    text_columns: List[str] = []
    error: Optional[str] = None
    output_files: dict = Field(default_factory=dict)
    preview: Optional[List[dict]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    total_rows: int
    columns: List[str]
    preview: List[dict]
    detected_language: Language


class TextConvertRequest(BaseModel):
    text: str
    source_language: Language = "auto"
    target_language: TargetLanguage = "roman_urdu"


class TextConvertResponse(BaseModel):
    original: str
    converted: str
    source_language: str
    target_language: str
