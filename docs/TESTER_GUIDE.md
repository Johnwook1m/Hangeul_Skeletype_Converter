# Hanguel Skeletype Converter - 테스터 가이드

베타 테스터를 위한 설치 및 사용 가이드입니다.


---
## 프로젝트 소개
이 프로젝트는 저(김종욱)의 개별연구 수업에서 시작되었습니다. 

---

## 플러그인 소개

**Hanguel Skeletype Converter**는 Glyphs 3에서 한글 글리프의 중심선(centerline)을 자동으로 추출하는 플러그인입니다.

### 주요 기능
- 선택한 글리프의 중심선을 자동으로 추출
- 추출된 중심선을 "Converted Skeletype" 레이어에 자동 생성
- 원본 글리프에 맞춰 자동 정렬 및 크기 조정

### 사용 목적
- 한글 폰트의 스켈레톤 타입 제작
- 폰트 구조 분석 및 연구
- 중심선 기반 폰트 디자인 워크플로우

---

## 필수 요구사항

플러그인이 작동하려면 다음 3가지가 모두 필요합니다:

1. ✅ **Glyphs 3** (최신 버전)
2. ✅ **ImageMagick** (시스템에 설치 필요)
3. ✅ **Autotrace** (시스템에 설치 필요)

**⚠️ 중요:** 플러그인 파일만으로는 작동하지 않습니다. ImageMagick과 Autotrace를 별도로 설치해야 합니다.

---

## 설치 방법

### 1단계: ImageMagick 설치

터미널 앱을 열고 다음 명령어를 실행하세요:

```bash
brew install imagemagick
```

**설치 확인:**
```bash
which magick || which convert
```

명령어 실행 후 경로가 표시되면 설치 성공입니다.

### 2단계: Autotrace 설치

터미널에서 다음 명령어를 실행하세요:

```bash
brew install autotrace
```

**설치 확인:**
```bash
which autotrace
```

명령어 실행 후 경로가 표시되면 설치 성공입니다.

### 3단계: Homebrew가 없는 경우

Homebrew가 설치되어 있지 않다면 먼저 설치하세요:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 후 위의 1단계와 2단계를 진행하세요.

### 4단계: 플러그인 설치

#### 방법 1: 드래그 앤 드롭 (권장)

1. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 Finder에서 찾기
2. **Glyphs 3 앱 아이콘**에 드래그 앤 드롭
3. "복사" 선택
4. **Glyphs 3 완전히 종료 후 재시작** (중요!)

#### 방법 2: 수동 복사

1. 터미널에서 다음 명령어 실행:
   ```bash
   open ~/Library/Application\ Support/Glyphs\ 3/Plugins/
   ```
2. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 열린 폴더에 복사
3. **Glyphs 3 완전히 종료 후 재시작** (중요!)

### 5단계: 설치 확인

Glyphs 3 재시작 후:

1. `Edit` 메뉴를 열어보세요
2. **"Hanguel Skeletype Converter"** 항목이 보이면 정상 설치된 것입니다!

---

## 사용 방법

### 기본 사용법

1. **Glyphs 3 실행**
2. **폰트 파일 열기**
3. **중심선을 추출하고 싶은 글리프 선택** (하나 또는 여러 개)
4. **Edit 메뉴** > **"Hanguel Skeletype Converter"** 클릭
5. 변환 완료 후 **"Converted Skeletype" 레이어**에서 결과 확인

### 결과 확인

- 변환된 중심선은 **"Converted Skeletype"** 레이어에 생성됩니다
- 원본 글리프와 같은 위치에 자동 정렬됩니다
- 레이어는 자동으로 보이도록 설정됩니다

---

## 테스트 시나리오

다음 시나리오들을 테스트해주세요:

### 기본 테스트

- [ ] 단일 글리프 선택 후 실행
- [ ] 여러 글리프 선택 후 실행
- [ ] "Converted Skeletype" 레이어가 생성되는지 확인
- [ ] 중심선이 올바르게 추출되는지 확인

### 다양한 글리프 테스트

- [ ] 기본 자모 (ㄱ, ㄴ, ㄷ, ㅏ, ㅓ 등)
- [ ] 복잡한 글자 (한, 글, 폰트 등)
- [ ] 다양한 조합형 글자

### 다양한 폰트 스타일 테스트

- [ ] 세리프 폰트
- [ ] 산세리프 폰트
- [ ] 손글씨/스크립트 폰트
- [ ] 굵은 폰트
- [ ] 얇은 폰트

### 특수 케이스 테스트

- [ ] 매우 작은 글리프
- [ ] 매우 큰 글리프
- [ ] 복잡한 구조의 글리프
- [ ] 이미 "Converted Skeletype" 레이어가 있는 글리프 (덮어쓰기 확인)

---

## 문제 해결

### 플러그인이 Edit 메뉴에 나타나지 않는 경우

#### 1. Glyphs 3 재시작 확인
- 플러그인 설치 후 **반드시 Glyphs 3를 완전히 종료하고 재시작**해야 합니다
- Dock에서 Glyphs 3를 완전히 종료 (Cmd+Q)

#### 2. 플러그인 설치 위치 확인
터미널에서 확인:
```bash
ls -la ~/Library/Application\ Support/Glyphs\ 3/Plugins/
```

`HanguelSkeletypeConverter.glyphsPlugin`이 보여야 합니다.

### 플러그인 실행 오류

#### 1. 필수 도구 확인

터미널에서 확인:
```bash
# ImageMagick 확인
which magick || which convert

# Autotrace 확인
which autotrace
```

둘 다 경로가 표시되지 않으면 설치가 안 된 것입니다. 위의 "설치 방법"을 다시 확인하세요.

#### 2. 오류 메시지 확인

**Macro Panel에서 확인 (가장 쉬움):**
1. Glyphs 3 실행
2. `Window` > `Macro Panel` 열기
3. 플러그인 실행 시 로그 확인

**macOS 콘솔 앱에서 확인:**
1. Spotlight (Cmd+Space) → "콘솔" 검색 → 실행
2. 왼쪽 사이드바에서 `로그 보고서` > `Glyphs` 또는 `GlyphsApp` 찾기
3. 상단 검색창에 "plugin" 또는 "Hanguel" 입력
4. 최근 로그 확인

#### 3. 일반적인 오류

**"ImageMagick을 찾을 수 없습니다"**
- ImageMagick이 설치되지 않았거나 PATH에 없는 경우
- `brew install imagemagick` 다시 실행

**"Autotrace를 찾을 수 없습니다"**
- Autotrace가 설치되지 않았거나 PATH에 없는 경우
- `brew install autotrace` 다시 실행

**"글리프를 선택해주세요"**
- 플러그인 실행 전에 글리프를 선택해야 합니다
- 글리프를 선택한 후 다시 실행하세요

---

**테스트해주셔서 감사합니다!** 
