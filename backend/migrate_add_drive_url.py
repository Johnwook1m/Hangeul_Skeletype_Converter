"""기존 archives.db에 google_drive_url 컬럼을 추가하는 일회성 마이그레이션 스크립트.

백엔드 서버를 처음 실행하기 전에 한 번만 실행하면 됩니다.
이미 컬럼이 있으면 아무것도 하지 않고 종료합니다.

사용법:
    cd backend
    python migrate_add_drive_url.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "archives.db"


def main():
    if not DB_PATH.exists():
        print("DB 파일이 없습니다. 서버를 먼저 실행해 DB를 생성하세요.")
        return

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # 이미 컬럼이 있는지 확인
    cur.execute("PRAGMA table_info(archives)")
    columns = [row[1] for row in cur.fetchall()]

    if "google_drive_url" in columns:
        print("google_drive_url 컬럼이 이미 존재합니다. 마이그레이션 불필요.")
    else:
        cur.execute("ALTER TABLE archives ADD COLUMN google_drive_url TEXT")
        con.commit()
        print("google_drive_url 컬럼 추가 완료.")

    con.close()


if __name__ == "__main__":
    main()
