"""Google OAuth 2.0 인증 1회 설정 스크립트.

브라우저가 열리면 Google 계정으로 로그인하세요.
완료되면 oauth_token.json이 생성되어 이후 자동으로 사용됩니다.

사용법:
    cd backend
    python3 setup_oauth.py
"""

from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]

CLIENT_SECRET = Path(__file__).parent / "oauth_client.json"
TOKEN_FILE = Path(__file__).parent / "oauth_token.json"

def main():
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
    creds = flow.run_local_server(port=0)

    TOKEN_FILE.write_text(creds.to_json())
    print(f"\n인증 완료! 토큰 저장됨: {TOKEN_FILE}")

if __name__ == "__main__":
    main()
