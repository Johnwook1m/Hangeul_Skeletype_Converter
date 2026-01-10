# GitHub 설정 가이드

## GitHub 저장소 생성

1. GitHub에 로그인
2. 새 저장소 생성 (New repository)
   - Repository name: `hanguel-skeletype-converter` (또는 원하는 이름)
   - Description: "Glyphs 3 plugin for converting Korean glyphs to skeleton type (SVG centerline)"
   - Public 또는 Private 선택
   - **Initialize with README 체크 해제** (이미 README.md가 있음)

## 로컬 저장소와 GitHub 연결

### 방법 1: 새 저장소인 경우

```bash
cd /Users/johnn/Desktop/05_개별연구1/02_WIP/260110_WIP_06_MainPlugin

# GitHub 저장소 URL 추가 (YOUR_USERNAME과 REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 또는 SSH 사용 시
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git

# 브랜치 이름을 main으로 설정 (필요한 경우)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

### 방법 2: 기존 저장소가 있는 경우

```bash
# 원격 저장소 확인
git remote -v

# 원격 저장소 추가/변경
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 푸시
git push -u origin main
```

## 인증 설정

### HTTPS 사용 시
- Personal Access Token 필요
- GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
- `repo` 권한 선택

### SSH 사용 시
- SSH 키가 GitHub에 등록되어 있어야 함
- `~/.ssh/id_rsa.pub` 파일의 내용을 GitHub에 추가

## 다음 단계

1. GitHub 저장소 생성
2. 원격 저장소 연결
3. 코드 푸시
4. README.md 확인 및 업데이트
5. Issues, Projects 등 설정 (선택사항)

