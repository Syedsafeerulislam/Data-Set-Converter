import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))

    # Groq
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_TEMPERATURE: float = float(os.getenv("GROQ_TEMPERATURE", "0.1"))

    # Storage — on Railway use /tmp (ephemeral but fine for single requests)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", str(BASE_DIR / "outputs"))

    # Tuning
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "8"))
    MAX_CONCURRENT: int = int(os.getenv("MAX_CONCURRENT", "4"))

    # CORS — set to your Vercel URL in prod
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")


settings = Settings()
