from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.utils.config import settings
from app.routes import convert, jobs, health

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Roman Urdu Converter API  |  port {settings.PORT}")
    print(f"🤖 Model : {settings.GROQ_MODEL}")
    print(f"🌐 CORS  : {settings.CORS_ORIGINS}")
    yield


app = FastAPI(
    title="Roman Urdu Converter API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,  prefix="/api")
app.include_router(convert.router, prefix="/api/convert")
app.include_router(jobs.router,    prefix="/api/jobs")

app.mount("/files", StaticFiles(directory=settings.OUTPUT_DIR), name="files")


@app.get("/")
async def root():
    return {"app": "Roman Urdu Converter", "version": "2.0.0", "docs": "/docs"}
