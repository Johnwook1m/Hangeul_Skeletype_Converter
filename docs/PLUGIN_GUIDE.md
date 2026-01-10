# Hanguel Skeletype Converter 플러그인 가이드

Glyphs 3 플러그인 개발, 설치, 사용, 배포에 대한 종합 가이드입니다.

---

## 목차

1. [개발 현황](#개발-현황)
2. [플러그인 구조](#플러그인-구조)
3. [설치 및 사용](#설치-및-사용)
4. [베타 테스트](#베타-테스트)
5. [문제 해결](#문제-해결)
6. [배포](#배포)

---

## 개발 현황

### 개발 단계

#### 1단계: 스크립트 정리 (완료 ✅)
- ✅ 기본 기능 구현
- ✅ 레이어 관리 기능 추가

#### 2단계: 플러그인 번들 제작 (완료 ✅)
- ✅ Info.plist 작성
- ✅ 번들 구조 생성
- ✅ 스크립트를 플러그인 구조로 변환
- ✅ MacOS 실행 파일 추가

#### 3단계: 테스트 및 디버깅 (완료 ✅)
- ✅ 플러그인 번들 구조 확인
- ✅ SDK 템플릿과 비교 및 수정
- ✅ Edit 메뉴에서 플러그인 확인 (정상 작동)
- ✅ 플러그인 실행 테스트 (성공: 11개, 실패: 3개)
- ✅ GeneralPlugin 특성 확인 (Plugin Manager에 나타나지 않는 것이 정상)

#### 4단계: 배포 준비 (진행 중)
- [ ] 문서화 완료
- [ ] 라이선스 결정
- [ ] 공유 준비

---

## 플러그인 구조

### 플러그인 타입

현재 플러그인은 **General Plugin (.glyphsPlugin)** 타입입니다.

**특징:**
- ✅ GitHub에 배포 가능
- ✅ 다른 사람들이 설치 가능
- ❌ Plugin Manager의 "설치됨" 탭에 나타나지 않음 (정상)
- ✅ Edit 메뉴에서 접근 가능

### 번들 구조

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # 플러그인 메타데이터
│   ├── MacOS/
│   │   └── plugin          # 실행 파일
│   └── Resources/
│       └── plugin.py       # 메인 Python 코드
```

---

## 설치 및 사용

### 필수 요구사항

- **Glyphs 3** (최신 버전)
- **ImageMagick**: `brew install imagemagick`
- **Autotrace**: `brew install autotrace`

### 설치 방법

#### 방법 1: 드래그 앤 드롭 (권장)

1. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 Finder에서 찾기
2. **Glyphs 3 앱 아이콘**에 드래그 앤 드롭
3. "복사" 선택
4. Glyphs 3 재시작

#### 방법 2: 수동 복사

1. Finder에서 다음 경로로 이동:
   ```
   ~/Library/Application Support/Glyphs 3/Plugins/
   ```
   
   또는 터미널에서:
   ```bash
   open ~/Library/Application\ Support/Glyphs\ 3/Plugins/
   ```

2. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 이 폴더에 복사
3. Glyphs 3 재시작

### 사용 방법

1. **Glyphs 3 실행**
2. **폰트 파일 열기**
3. **중심선을 추출하고 싶은 글리프 선택**
4. **Edit 메뉴** > **"Hanguel Skeletype Converter"** 클릭
5. **Macro Panel** (`Window` > `Macro Panel`)에서 진행 상황 확인
6. **"SVG Import" 레이어**에서 결과 확인

### 플러그인 확인

**정상 설치 확인:**
- Glyphs 3 재시작 후
- `Edit` 메뉴에 **"Hanguel Skeletype Converter"** 항목이 있는지 확인
- 있으면 정상 설치됨!

---

## 베타 테스트

### 베타 테스터를 위한 설치

베타 테스터에게 필요한 것은 **플러그인 번들 파일 하나**만 있으면 됩니다:

```
HanguelSkeletypeConverter.glyphsPlugin
```

이 파일 하나만 전달하면 됩니다!

### 베타 테스터 필수 요구사항

#### 1. ImageMagick

터미널에서 설치:
```bash
brew install imagemagick
```

설치 확인:
```bash
which magick || which convert
```

#### 2. Autotrace

터미널에서 설치:
```bash
brew install autotrace
```

설치 확인:
```bash
which autotrace
```

#### 3. Homebrew가 없는 경우

먼저 Homebrew 설치:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 베타 테스터 피드백 수집

베타 테스터에게 다음 정보를 요청하세요:

1. **설치 성공 여부**
   - 플러그인이 Edit 메뉴에 나타나는지

2. **기능 테스트 결과**
   - 몇 개의 글리프를 테스트했는지
   - 성공/실패 개수
   - 실패한 경우 어떤 오류 메시지가 나타났는지

3. **사용성 피드백**
   - 사용하기 쉬운지
   - 개선이 필요한 부분
   - 버그 리포트

4. **시스템 정보** (문제 발생 시)
   - macOS 버전
   - Glyphs 3 버전
   - ImageMagick/Autotrace 버전

### 전달 방법

- 이메일 첨부 (약 168KB)
- 클라우드 저장소 (Google Drive, Dropbox 등) 링크 공유
- GitHub Releases (비공개 저장소도 가능)

---

## 문제 해결

### Plugin Manager에서 플러그인이 보이지 않는 경우

#### 1. Glyphs 3 재시작 확인
- 플러그인 설치 후 **반드시 Glyphs 3를 완전히 종료하고 재시작**해야 합니다
- Dock에서 Glyphs 3를 완전히 종료 (Cmd+Q)

#### 2. 플러그인 설치 위치 확인
```bash
ls -la ~/Library/Application\ Support/Glyphs\ 3/Plugins/
```

#### 3. GeneralPlugin 특성
`GeneralPlugin` 타입은 Plugin Manager에 나타나지 않습니다. 대신:
- `Edit` 메뉴에 추가된 항목 확인
- 정상 설치되었다면 Edit 메뉴에 "Hanguel Skeletype Converter"가 보입니다

### 플러그인 실행 오류

#### 1. 필수 도구 확인
```bash
# ImageMagick 확인
which magick || which convert

# Autotrace 확인
which autotrace
```

#### 2. 콘솔 로그 확인

**방법 1: Macro Panel (가장 쉬움)**
1. Glyphs 3 실행
2. `Window` > `Macro Panel` 열기
3. 플러그인 실행 시 로그 확인

**방법 2: macOS 콘솔 앱**
1. `Spotlight` (Cmd+Space) → "콘솔" 검색 → 실행
2. 왼쪽 사이드바에서 `로그 보고서` > `Glyphs` 또는 `GlyphsApp` 찾기
3. 상단 검색창에 "plugin" 또는 "Hanguel" 입력
4. 최근 로그 확인

**방법 3: 터미널**
```bash
# Glyphs 관련 로그 확인
log show --predicate 'process == "Glyphs"' --last 30m | grep -i "plugin\|error\|hanguel"
```

#### 3. 플러그인 재설치
```bash
# 기존 플러그인 제거
rm -rf ~/Library/Application\ Support/Glyphs\ 3/Plugins/HanguelSkeletypeConverter.glyphsPlugin

# 새로 복사
cp -r "/path/to/HanguelSkeletypeConverter.glyphsPlugin" \
  ~/Library/Application\ Support/Glyphs\ 3/Plugins/

# Glyphs 3 재시작
```

---

## 배포

### GitHub를 통한 플러그인 배포

Glyphs 3의 Plugin Manager는 GitHub 저장소를 자동으로 스캔하여 플러그인을 찾습니다.

### 1단계: GitHub 저장소 구조 준비

#### 필수 구조

```
hanguel-skeletype-converter/  (저장소 이름)
├── HanguelSkeletypeConverter.glyphsPlugin/  (플러그인 번들)
│   ├── Contents/
│   │   ├── Info.plist
│   │   ├── MacOS/
│   │   │   └── plugin
│   │   └── Resources/
│   │       └── plugin.py
├── README.md
└── LICENSE (선택사항)
```

**중요:**
- 저장소 루트에 **플러그인 번들**이 있어야 합니다
- 저장소는 **Public**이어야 Plugin Manager에서 찾을 수 있습니다

### 2단계: GitHub 저장소 생성 및 설정

#### 저장소 생성

1. **GitHub에 로그인**
2. **새 저장소 생성** (New repository)
   - Repository name: `hanguel-skeletype-converter` (또는 원하는 이름)
   - Description: "Glyphs 3 plugin for extracting centerlines from Korean glyphs"
   - **Public** 선택 (필수! Plugin Manager에서 찾으려면 Public이어야 함)
   - Initialize with README 체크 해제 (이미 README.md가 있음)

#### 로컬 저장소와 GitHub 연결

```bash
cd /path/to/project

# GitHub 저장소 URL 추가 (YOUR_USERNAME을 실제 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/hanguel-skeletype-converter.git

# 또는 SSH 사용 시
git remote add origin git@github.com:YOUR_USERNAME/hanguel-skeletype-converter.git

# 브랜치 이름을 main으로 설정 (필요한 경우)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

#### 인증 설정

**HTTPS 사용 시:**
- Personal Access Token 필요
- GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
- `repo` 권한 선택

**SSH 사용 시:**
- SSH 키가 GitHub에 등록되어 있어야 함
- `~/.ssh/id_rsa.pub` 파일의 내용을 GitHub에 추가

### 3단계: 플러그인 번들 준비

```bash
# 저장소 디렉토리로 이동 (또는 새로 생성)
mkdir -p ~/hanguel-skeletype-converter
cd ~/hanguel-skeletype-converter

# 플러그인 번들 복사
cp -R "/path/to/HanguelSkeletypeConverter.glyphsPlugin" .

# README.md 복사
cp "/path/to/README.md" .
```

### 4단계: Git 초기화 및 푸시

```bash
cd ~/hanguel-skeletype-converter

# Git 초기화
git init

# .gitignore 생성
cat > .gitignore << EOF
.DS_Store
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
EOF

# 파일 추가
git add .

# 첫 커밋
git commit -m "Initial release: Hanguel Skeletype Converter v1.0"

# GitHub 저장소 연결
git remote add origin https://github.com/YOUR_USERNAME/hanguel-skeletype-converter.git

# 브랜치 이름 설정
git branch -M main

# 푸시
git push -u origin main
```

### 5단계: Plugin Manager에서 확인

1. **Glyphs 3 실행**
2. **Window > Plugin Manager** 열기
3. **"설치 안 됨"** 탭 클릭
4. **검색창에 "Hanguel" 또는 "skeletype" 입력**
5. 플러그인이 나타나면 **"설치"** 버튼 클릭

### 6단계: 버전 관리 및 업데이트

#### 새 버전 배포

```bash
cd ~/hanguel-skeletype-converter

# 플러그인 번들 업데이트
cp -R "/path/to/updated/HanguelSkeletypeConverter.glyphsPlugin" .

# Info.plist에서 버전 번호 업데이트
# CFBundleVersion과 CFBundleShortVersionString 수정

# 변경사항 커밋
git add .
git commit -m "Update to v1.1: [변경사항 설명]"

# 푸시
git push origin main
```

#### 릴리스 태그 생성

```bash
# 태그 생성
git tag -a v1.0 -m "Release version 1.0"

# 태그 푸시
git push origin v1.0
```

---

## 참고 자료

- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK - GitHub](https://github.com/schriftgestalt/GlyphsSDK)
- [Writing Plug-ins Tutorial](https://handbook.glyphsapp.com/plugins/)
- [Glyphs Plugin Manager](https://glyphsapp.com/learn/plugins)
