"""Hanguel Skeletype Web - FastAPI Backend"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import check_dependencies
from routers import font_upload, glyphs, centerline, export

app = FastAPI(
    title="Hanguel Skeletype Web",
    description="Font centerline extraction and stroke-based font generation",
    version="0.1.0",
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(font_upload.router)
app.include_router(glyphs.router)
app.include_router(centerline.router)
app.include_router(export.router)


@app.get("/api/health")
async def health_check():
    """Check server status and external dependencies."""
    deps = check_dependencies()
    return {
        "status": "ok",
        "dependencies": deps,
    }
