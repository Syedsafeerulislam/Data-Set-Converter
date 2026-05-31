from fastapi import APIRouter
from app.utils.config import settings

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "groq_model": settings.GROQ_MODEL,
        "supported_languages": ["urdu", "english", "roman_urdu"],
        "supported_conversions": [
            "urdu → roman_urdu",
            "urdu → english",
            "english → roman_urdu",
            "english → urdu",
            "roman_urdu → urdu",
            "roman_urdu → english",
        ],
    }
