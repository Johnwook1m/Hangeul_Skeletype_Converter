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
from database import Archive, engine

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
    image_count = len(list(ARCHIVE_DIR.glob("*")))
    return {"record_count": record_count, "image_count": image_count}
