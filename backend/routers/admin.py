"""임시 관리자 엔드포인트 — 데이터 복원용.

Railway Volume 설정 후 재배포 시 데이터 복원에 사용합니다.
복원 완료 후 이 파일과 main.py의 admin 라우터 등록을 삭제하세요.
"""

import io
import json
import os
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import ARCHIVE_DIR
from database import Archive, Subscriber, engine

router = APIRouter(prefix="/api/admin", tags=["admin"])

_SECRET = os.environ.get("ADMIN_SECRET", "")


def _check_secret(x_admin_secret: str = Header(default="")):
    if not _SECRET:
        raise HTTPException(503, "ADMIN_SECRET 환경변수가 설정되지 않았습니다.")
    if x_admin_secret != _SECRET:
        raise HTTPException(403, "Forbidden")


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    x_admin_secret: str = Header(default=""),
):
    """backup/ 폴더를 zip으로 묶어 업로드하면 DB와 이미지를 복원합니다.

    zip 구조:
        metadata.json       — download_backup.py가 생성한 아카이브 목록
        images/             — 이미지 파일들
    """
    _check_secret(x_admin_secret)

    content = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        raise HTTPException(400, "유효한 zip 파일이 아닙니다.")

    # metadata.json 파싱
    try:
        meta_bytes = zf.read("metadata.json")
        archives = json.loads(meta_bytes)
    except KeyError:
        raise HTTPException(400, "zip 안에 metadata.json이 없습니다.")
    except json.JSONDecodeError:
        raise HTTPException(400, "metadata.json 파싱 실패.")

    # 이미지 파일 복원
    restored_images = 0
    for name in zf.namelist():
        if name.startswith("images/") and not name.endswith("/"):
            filename = name.split("/", 1)[1]
            if not filename:
                continue
            dest = ARCHIVE_DIR / filename
            if not dest.exists():
                dest.write_bytes(zf.read(name))
                restored_images += 1

    # DB 레코드 복원 (이미 존재하는 id는 건너뜀)
    restored_records = 0
    skipped = 0
    with Session(engine) as db:
        existing_ids = {row[0] for row in db.query(Archive.id).all()}
        for item in archives:
            if item.get("id") in existing_ids:
                skipped += 1
                continue

            # created_at 파싱
            created_at = None
            raw_ts = item.get("created_at")
            if raw_ts:
                try:
                    created_at = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except Exception:
                    created_at = datetime.now(timezone.utc)

            # settings_snapshot: 상세 조회 결과엔 dict, 목록엔 없을 수도 있음
            snapshot = item.get("settings_snapshot", {})
            snapshot_str = json.dumps(snapshot, ensure_ascii=False) if isinstance(snapshot, dict) else (snapshot or "{}")

            features = item.get("features_used", [])
            features_str = json.dumps(features, ensure_ascii=False) if isinstance(features, list) else (features or "[]")

            record = Archive(
                id=item["id"],
                author_name=item.get("author_name", ""),
                font_name=item.get("font_name", ""),
                features_used=features_str,
                settings_snapshot=snapshot_str,
                preview_image_path=item.get("preview_image_url", "").split("/")[-1],
                created_at=created_at,
                google_drive_url=item.get("google_drive_url"),
            )
            db.add(record)
            restored_records += 1

        db.commit()

    return {
        "status": "ok",
        "restored_records": restored_records,
        "skipped_records": skipped,
        "restored_images": restored_images,
    }


@router.get("/status")
async def admin_status(x_admin_secret: str = Header(default="")):
    """현재 DB 레코드 수와 이미지 파일 수를 반환합니다."""
    _check_secret(x_admin_secret)
    with Session(engine) as db:
        record_count = db.query(Archive).count()
        subscriber_count = db.query(Subscriber).count()
    image_count = len(list(ARCHIVE_DIR.glob("*")))
    return {"record_count": record_count, "image_count": image_count, "subscriber_count": subscriber_count}


@router.get("/subscribers")
async def list_subscribers(x_admin_secret: str = Header(default="")):
    """구독자 이메일 목록을 반환합니다."""
    _check_secret(x_admin_secret)
    with Session(engine) as db:
        rows = db.query(Subscriber).order_by(Subscriber.created_at.desc()).all()
    return {
        "total": len(rows),
        "subscribers": [{"id": r.id, "email": r.email, "created_at": r.created_at.isoformat()} for r in rows],
    }


@router.post("/sync-all")
async def sync_all(x_admin_secret: str = Header(default="")):
    """google_drive_url이 없는 아카이브를 Google Drive + Sheets에 소급 동기화합니다."""
    _check_secret(x_admin_secret)

    from config import GOOGLE_SHEET_NAME, GOOGLE_SPREADSHEET_ID, GOOGLE_SYNC_ENABLED
    from services import google_sync

    if not GOOGLE_SYNC_ENABLED:
        raise HTTPException(503, "Google 동기화가 비활성화 상태입니다.")

    with Session(engine) as db:
        records = db.query(Archive).order_by(Archive.created_at.asc()).all()

    results = []
    for record in records:
        if getattr(record, "google_drive_url", None):
            results.append({"id": record.id, "status": "skipped"})
            continue

        image_path = ARCHIVE_DIR / record.preview_image_path
        if not image_path.exists():
            results.append({"id": record.id, "status": "no_image"})
            continue

        suffix = image_path.suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        mime_type = mime_map.get(suffix, "image/jpeg")
        image_bytes = image_path.read_bytes()

        try:
            import json as _json
            drive, sheets = google_sync._get_clients()
            date_str = record.created_at.strftime("%Y-%m-%d") if record.created_at else "unknown"
            drive_url = google_sync._upload_image(drive, date_str, record.preview_image_path, image_bytes, mime_type)

            google_sync._ensure_sheet_headers(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME)

            try:
                snapshot = _json.loads(record.settings_snapshot)
                layer_count = len(snapshot.get("layers", []))
                bg_color = snapshot.get("bgColor", "")
            except Exception:
                layer_count, bg_color = "", ""

            try:
                features_str = ", ".join(_json.loads(record.features_used))
            except Exception:
                features_str = record.features_used

            google_sync._append_row(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME, [
                record.id, record.author_name, record.font_name,
                features_str, layer_count, bg_color,
                record.created_at.isoformat() if record.created_at else "",
                drive_url,
            ])

            with Session(engine) as db:
                r = db.get(Archive, record.id)
                if r:
                    r.google_drive_url = drive_url
                    db.commit()

            results.append({"id": record.id, "status": "ok", "drive_url": drive_url})

        except Exception as exc:
            results.append({"id": record.id, "status": "failed", "error": str(exc)})

    return {"results": results}
