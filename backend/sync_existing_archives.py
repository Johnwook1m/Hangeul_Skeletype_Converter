"""기존 아카이브를 Google Drive + Sheets에 소급 동기화하는 스크립트.

사용법:
    cd backend
    python3 sync_existing_archives.py

이미 google_drive_url이 저장된 항목은 건너뜁니다 (중복 방지).
"""

import sys
from pathlib import Path

# backend 디렉토리를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).parent))

# .env 로드
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from config import ARCHIVE_DIR, GOOGLE_SYNC_ENABLED
from database import Archive, engine
from services import google_sync
from sqlalchemy.orm import Session


def main():
    if not GOOGLE_SYNC_ENABLED:
        print("Google 동기화가 비활성화 상태입니다. .env 파일을 확인하세요.")
        return

    with Session(engine) as db:
        records = db.query(Archive).order_by(Archive.created_at.asc()).all()

    total = len(records)
    if total == 0:
        print("동기화할 아카이브가 없습니다.")
        return

    print(f"총 {total}개 아카이브 동기화 시작...\n")

    success = 0
    skipped = 0
    failed = 0

    for i, record in enumerate(records, 1):
        # 이미 동기화된 항목 건너뜀
        if getattr(record, "google_drive_url", None):
            print(f"[{i}/{total}] SKIP  id={record.id} ({record.author_name}) — 이미 동기화됨")
            skipped += 1
            continue

        image_path = ARCHIVE_DIR / record.preview_image_path
        if not image_path.exists():
            print(f"[{i}/{total}] FAIL  id={record.id} — 이미지 파일 없음: {image_path}")
            failed += 1
            continue

        # MIME 타입 추정
        suffix = image_path.suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
        mime_type = mime_map.get(suffix, "image/jpeg")

        image_bytes = image_path.read_bytes()

        try:
            # google_sync.sync는 내부에서 예외를 잡으므로 여기선 직접 호출
            drive, sheets = google_sync._get_clients()

            date_str = record.created_at.strftime("%Y-%m-%d") if record.created_at else "unknown"
            drive_url = google_sync._upload_image(drive, date_str, record.preview_image_path, image_bytes, mime_type)

            from config import GOOGLE_SHEET_NAME, GOOGLE_SPREADSHEET_ID
            import json

            google_sync._ensure_sheet_headers(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME)

            try:
                snapshot = json.loads(record.settings_snapshot)
                layer_count = len(snapshot.get("layers", []))
                bg_color = snapshot.get("bgColor", "")
            except Exception:
                layer_count = ""
                bg_color = ""

            try:
                features_str = ", ".join(json.loads(record.features_used))
            except Exception:
                features_str = record.features_used

            row = [
                record.id,
                record.author_name,
                record.font_name,
                features_str,
                layer_count,
                bg_color,
                record.created_at.isoformat() if record.created_at else "",
                drive_url,
            ]
            google_sync._append_row(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME, row)

            # DB에 drive_url 저장
            with Session(engine) as db:
                r = db.get(Archive, record.id)
                if r and hasattr(r, "google_drive_url"):
                    r.google_drive_url = drive_url
                    db.commit()

            print(f"[{i}/{total}] OK    id={record.id} ({record.author_name}) → {drive_url}")
            success += 1

        except Exception as exc:
            print(f"[{i}/{total}] FAIL  id={record.id} ({record.author_name}) — {exc}")
            failed += 1

    print(f"\n완료: 성공 {success}개 / 건너뜀 {skipped}개 / 실패 {failed}개")


if __name__ == "__main__":
    main()
