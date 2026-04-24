import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from config import ARCHIVE_DIR
from database import Archive, get_session
from services import google_sync

router = APIRouter(prefix="/api", tags=["archive"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


# ---------------------------------------------------------------------------
# POST /api/archive
# ---------------------------------------------------------------------------

@router.post("/archive", status_code=201)
async def create_archive(
    background_tasks: BackgroundTasks,
    author_name: str = Form(...),
    font_name: str = Form(...),
    features_used: str = Form(...),      # JSON-encoded list
    settings_snapshot: str = Form(...),  # JSON-encoded dict
    preview_image: UploadFile = File(...),
    db: Session = Depends(get_session),
):
    # Validate image type
    if preview_image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Preview must be JPEG, PNG, or WebP")

    content = await preview_image.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (max 5 MB)")

    # Validate JSON fields
    try:
        json.loads(features_used)
        json.loads(settings_snapshot)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in features_used or settings_snapshot")

    # Sanitise author name
    author_name = author_name.strip()[:120]
    if not author_name:
        raise HTTPException(400, "author_name is required")

    # Save image to disk
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(preview_image.content_type, ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    (ARCHIVE_DIR / filename).write_bytes(content)

    # Persist to DB
    record = Archive(
        author_name=author_name,
        font_name=font_name[:255],
        features_used=features_used,
        settings_snapshot=settings_snapshot,
        preview_image_path=filename,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Google Drive + Sheets 동기화 (백그라운드, 실패해도 응답에 영향 없음)
    mime_type = preview_image.content_type or "image/jpeg"
    background_tasks.add_task(google_sync.sync, record, content, mime_type)

    return _to_response(record)


# ---------------------------------------------------------------------------
# GET /api/archives
# ---------------------------------------------------------------------------

@router.get("/archives")
def list_archives(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_session),
):
    total = db.query(Archive).count()
    items = (
        db.query(Archive)
        .order_by(Archive.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_to_response(r) for r in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ---------------------------------------------------------------------------
# GET /api/archives/{id}
# ---------------------------------------------------------------------------

@router.get("/archives/{archive_id}")
def get_archive(archive_id: int, db: Session = Depends(get_session)):
    record = db.get(Archive, archive_id)
    if not record:
        raise HTTPException(404, "Archive not found")
    d = _to_response(record)
    d["settings_snapshot"] = json.loads(record.settings_snapshot)
    return d


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(record: Archive) -> dict:
    return {
        "id": record.id,
        "author_name": record.author_name,
        "font_name": record.font_name,
        "features_used": json.loads(record.features_used),
        "created_at": record.created_at.replace(tzinfo=timezone.utc).isoformat() if record.created_at else None,
        "preview_image_url": f"/archive-images/{record.preview_image_path}",
        "google_drive_url": record.google_drive_url or None,
    }
