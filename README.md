# Hanguel Skeletype Web

폰트 파일에서 중심선(스켈레톤)을 추출하고, 스트로크 파라미터를 조정해 새로운 서체를 생성하는 웹 애플리케이션입니다.

## 요구 사항

### 시스템 도구

```bash
# macOS (Homebrew)
brew install imagemagick autotrace fontforge
```

### Python 3.10+

```bash
cd hanguel-skeletype-web
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Node.js 18+

```bash
cd frontend
npm install
```

## 실행 방법

### 1. 백엔드 서버 (포트 8000)

```bash
cd backend
source ../venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### 2. 프론트엔드 개발 서버 (포트 5173)

```bash
cd frontend
npm run dev
```

### 또는 개발 스크립트 사용

```bash
./scripts/dev.sh
```

브라우저에서 http://localhost:5173 접속

## 사용법

1. **폰트 업로드**: .ttf, .otf, .woff 파일 드래그 앤 드롭
2. **중심선 추출**: "중심선 추출" 버튼 클릭
3. **글리프 선택**: 그리드에서 글리프 클릭하여 미리보기
4. **스트로크 조정**: 우측 패널에서 Width, Line Cap, Line Join 조정
5. **폰트 내보내기**: Export 버튼으로 새 폰트 다운로드

## 기술 스택

- **백엔드**: Python, FastAPI, fontTools, FreeTypePen
- **프론트엔드**: React 19, Vite, TailwindCSS 4, Zustand
- **중심선 추출**: ImageMagick + Autotrace
- **폰트 생성**: FontForge CLI

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/font/upload` | 폰트 업로드 |
| GET | `/api/font/{id}/glyphs` | 글리프 목록 |
| POST | `/api/font/{id}/extract` | 중심선 추출 (SSE) |
| GET | `/api/font/{id}/centerline/{name}` | 중심선 데이터 |
| POST | `/api/font/{id}/export` | 폰트 생성/다운로드 |

## 프로젝트 구조

```
hanguel-skeletype-web/
├── backend/
│   ├── main.py              # FastAPI 서버
│   ├── routers/             # API 엔드포인트
│   ├── services/            # 비즈니스 로직
│   └── models/              # Pydantic 모델
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # 메인 컴포넌트
│   │   ├── components/      # UI 컴포넌트
│   │   └── stores/          # Zustand 상태
│   └── index.html
└── scripts/
    ├── dev.sh               # 개발 서버 실행
    └── check_deps.sh        # 의존성 확인
```
