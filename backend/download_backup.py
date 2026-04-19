"""Railway 현재 배포에서 아카이브 데이터를 로컬로 백업하는 스크립트.

사용법:
    python download_backup.py [BASE_URL]

예시:
    python download_backup.py https://www.skeletype.space

배포 전에 실행하세요. backup/ 폴더에 metadata.json과 이미지 파일이 저장됩니다.
"""

import json
import os
import ssl
import sys
import time
import urllib.request
from pathlib import Path

# 로컬 백업 스크립트 전용 — SSL 검증 비활성화 (macOS 인증서 문제 우회)
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

BASE_URL = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://www.skeletype.space"

BACKUP_DIR = Path(__file__).parent / "backup"
IMAGES_DIR = BACKUP_DIR / "images"
BACKUP_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30, context=_ssl_ctx) as resp:
        return json.loads(resp.read())


def download_file(url: str, dest: Path) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=30, context=_ssl_ctx) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception as e:
        print(f"  [경고] 다운로드 실패 {url}: {e}")
        return False


def main():
    print(f"백업 대상: {BASE_URL}")
    print(f"저장 위치: {BACKUP_DIR.resolve()}\n")

    # 전체 아카이브 목록 수집
    all_archives = []
    page = 1
    while True:
        url = f"{BASE_URL}/api/archives?page={page}&page_size=100"
        print(f"페이지 {page} 조회 중...")
        try:
            data = fetch_json(url)
        except Exception as e:
            print(f"API 호출 실패: {e}")
            sys.exit(1)

        items = data.get("items", [])
        all_archives.extend(items)
        print(f"  → {len(items)}개 로드 (누적 {len(all_archives)}/{data.get('total', '?')})")

        if len(all_archives) >= data.get("total", 0) or not items:
            break
        page += 1
        time.sleep(0.2)

    if not all_archives:
        print("백업할 아카이브가 없습니다.")
        return

    # 상세 정보 (settings_snapshot 포함) 가져오기
    print(f"\n상세 정보 수집 중 ({len(all_archives)}개)...")
    detailed = []
    for i, archive in enumerate(all_archives):
        try:
            detail = fetch_json(f"{BASE_URL}/api/archives/{archive['id']}")
            detailed.append(detail)
            print(f"  [{i+1}/{len(all_archives)}] id={archive['id']} ✓")
        except Exception as e:
            print(f"  [{i+1}/{len(all_archives)}] id={archive['id']} 실패: {e}")
            detailed.append(archive)
        time.sleep(0.1)

    # 메타데이터 저장
    meta_path = BACKUP_DIR / "metadata.json"
    meta_path.write_text(json.dumps(detailed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n메타데이터 저장 완료: {meta_path}")

    # 이미지 다운로드
    print(f"\n이미지 다운로드 중 ({len(detailed)}개)...")
    success = 0
    for i, archive in enumerate(detailed):
        img_url_path = archive.get("preview_image_url", "")
        if not img_url_path:
            continue
        filename = img_url_path.split("/")[-1]
        dest = IMAGES_DIR / filename
        if dest.exists():
            print(f"  [{i+1}] {filename} (이미 존재)")
            success += 1
            continue
        img_url = BASE_URL + img_url_path
        ok = download_file(img_url, dest)
        if ok:
            print(f"  [{i+1}] {filename} ✓")
            success += 1
        time.sleep(0.05)

    print(f"\n백업 완료: {success}/{len(detailed)}개 이미지")
    print(f"metadata.json: {meta_path}")
    print(f"images/: {IMAGES_DIR}")
    print("\n다음 단계:")
    print("1. Railway 대시보드에서 Volume 추가 (Mount path: /app/backend/data)")
    print("2. git push 로 새 코드 배포")
    print("3. 배포 완료 후 restore 엔드포인트로 데이터 복원")


if __name__ == "__main__":
    main()
