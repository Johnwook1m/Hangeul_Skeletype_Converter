"""Google Drive + Sheets 자동 동기화 서비스.

아카이브 생성 후 백그라운드에서 호출됩니다.
config.py의 GOOGLE_SYNC_ENABLED가 False면 아무것도 하지 않습니다.
"""

from __future__ import annotations

import io
import json
import logging
import os
from functools import lru_cache

logger = logging.getLogger(__name__)

# Google Sheets 헤더 행 (최초 1회 자동 생성)
SHEET_HEADERS = [
    "ID",
    "Author",
    "Font",
    "Features",
    "Layers",
    "BG Color",
    "Created At",
    "Drive Image URL",
]


def _build_credentials():
    """서비스 계정으로 Google API 자격증명 생성.

    우선순위:
    1. GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT 환경변수 (JSON 문자열) ← Railway 권장
    2. GOOGLE_SERVICE_ACCOUNT_JSON 환경변수 (파일 경로) ← 로컬 레거시
    """
    import json
    from config import GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT
    from google.oauth2 import service_account

    scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]

    if GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT:
        info = json.loads(GOOGLE_SERVICE_ACCOUNT_JSON_CONTENT)
        return service_account.Credentials.from_service_account_info(info, scopes=scopes)

    return service_account.Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_JSON, scopes=scopes
    )


@lru_cache(maxsize=1)
def _get_clients():
    """Drive / Sheets API 클라이언트를 캐싱해서 반환."""
    from googleapiclient.discovery import build

    creds = _build_credentials()
    drive = build("drive", "v3", credentials=creds)
    sheets = build("sheets", "v4", credentials=creds)
    return drive, sheets


# 날짜별 폴더 ID 캐시 (프로세스 재시작 전까지 유지)
_folder_cache: dict[str, str] = {}


def _get_or_create_date_folder(drive, date_str: str) -> str:
    """Drive 루트 폴더 아래에 날짜 폴더(YYYY-MM-DD)를 조회하거나 생성합니다."""
    from config import GOOGLE_DRIVE_ROOT_FOLDER_ID

    if date_str in _folder_cache:
        return _folder_cache[date_str]

    # 기존 폴더 검색
    query = (
        f"name='{date_str}' "
        f"and '{GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents "
        f"and mimeType='application/vnd.google-apps.folder' "
        f"and trashed=false"
    )
    result = drive.files().list(q=query, fields="files(id)").execute()
    files = result.get("files", [])

    if files:
        folder_id = files[0]["id"]
    else:
        # 새 폴더 생성
        metadata = {
            "name": date_str,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [GOOGLE_DRIVE_ROOT_FOLDER_ID],
        }
        folder = drive.files().create(body=metadata, fields="id").execute()
        folder_id = folder["id"]

    _folder_cache[date_str] = folder_id
    return folder_id


def _upload_image(drive, date_str: str, filename: str, image_bytes: bytes, mime_type: str) -> str:
    """이미지를 날짜 폴더에 업로드하고 공유 URL을 반환합니다."""
    from googleapiclient.http import MediaIoBaseUpload

    folder_id = _get_or_create_date_folder(drive, date_str)

    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }
    media = MediaIoBaseUpload(io.BytesIO(image_bytes), mimetype=mime_type, resumable=False)
    uploaded = drive.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, webViewLink",
    ).execute()

    # 누구나 볼 수 있도록 권한 설정 (view only)
    drive.permissions().create(
        fileId=uploaded["id"],
        body={"type": "anyone", "role": "reader"},
    ).execute()

    return uploaded.get("webViewLink", "")


def _ensure_sheet_headers(sheets, spreadsheet_id: str, sheet_name: str) -> None:
    """시트가 비어있을 때 헤더 행을 추가합니다."""
    result = (
        sheets.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=f"{sheet_name}!A1:A1")
        .execute()
    )
    if not result.get("values"):
        sheets.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A1",
            valueInputOption="RAW",
            body={"values": [SHEET_HEADERS]},
        ).execute()


def _append_row(sheets, spreadsheet_id: str, sheet_name: str, row: list) -> None:
    """Sheets 시트에 데이터 행 한 줄을 추가합니다."""
    sheets.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=f"{sheet_name}!A1",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]},
    ).execute()


def sync(record, image_bytes: bytes, mime_type: str = "image/jpeg") -> None:
    """아카이브 레코드를 Google Drive + Sheets에 동기화합니다.

    실패 시 예외를 삼키고 로그만 남겨, 로컬 아카이브에 영향을 주지 않습니다.

    Parameters
    ----------
    record : database.Archive
        DB에서 막 커밋된 아카이브 레코드.
    image_bytes : bytes
        업로드할 원본 이미지 바이트.
    mime_type : str
        이미지 MIME 타입 (기본 image/jpeg).
    """
    from config import GOOGLE_SHEET_NAME, GOOGLE_SPREADSHEET_ID, GOOGLE_SYNC_ENABLED

    if not GOOGLE_SYNC_ENABLED:
        return

    try:
        drive, sheets = _get_clients()

        # 날짜 문자열 (UTC)
        created_at = record.created_at
        date_str = created_at.strftime("%Y-%m-%d") if created_at else "unknown"
        created_at_iso = created_at.isoformat() if created_at else ""

        # Drive 업로드
        drive_url = _upload_image(
            drive, date_str, record.preview_image_path, image_bytes, mime_type
        )
        logger.info("Google Drive 업로드 완료: %s → %s", record.preview_image_path, drive_url)

        # settings_snapshot에서 레이어 수, 배경 색 추출
        try:
            snapshot = json.loads(record.settings_snapshot)
            layer_count = len(snapshot.get("layers", []))
            bg_color = snapshot.get("bgColor", "")
        except Exception:
            layer_count = ""
            bg_color = ""

        # features_used 배열 → 쉼표 구분 문자열
        try:
            features_str = ", ".join(json.loads(record.features_used))
        except Exception:
            features_str = record.features_used

        # Sheets에 행 추가
        _ensure_sheet_headers(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME)
        row = [
            record.id,
            record.author_name,
            record.font_name,
            features_str,
            layer_count,
            bg_color,
            created_at_iso,
            drive_url,
        ]
        _append_row(sheets, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME, row)
        logger.info("Google Sheets 행 추가 완료 (archive id=%d)", record.id)

        # DB에 drive_url 저장 — 새 세션으로 직접 commit (background task는 request 세션이 닫힌 후 실행됨)
        try:
            from database import Archive, engine
            from sqlalchemy.orm import Session as OrmSession
            with OrmSession(engine) as db:
                obj = db.get(Archive, record.id)
                if obj is not None:
                    obj.google_drive_url = drive_url
                    db.commit()
        except Exception as e:
            logger.warning("google_drive_url DB 업데이트 실패 (archive id=%s): %s", record.id, e)

    except Exception as exc:
        import traceback
        logger.error(
            "Google 동기화 실패 (archive id=%s): %s\n%s",
            getattr(record, "id", "?"), exc, traceback.format_exc(),
        )
