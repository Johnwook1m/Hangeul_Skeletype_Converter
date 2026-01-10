# 플러그인 설치 가이드

## 플러그인 구조

생성된 플러그인 번들:

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # 플러그인 메타데이터
│   └── Resources/
│       └── HanguelSkeletypeConverter.py  # 메인 플러그인 코드
```

## 설치 방법

### 방법 1: 드래그 앤 드롭 (권장)

1. Finder에서 `HanguelSkeletypeConverter.glyphsPlugin` 파일을 찾습니다
2. Glyphs 3 앱 아이콘에 드래그 앤 드롭합니다
3. Glyphs 3를 재시작합니다

### 방법 2: 수동 복사

1. 플러그인 폴더 열기:
   ```
   ~/Library/Application Support/Glyphs 3/Plugins/
   ```
   
   또는 터미널에서:
   ```bash
   open ~/Library/Application\ Support/Glyphs\ 3/Plugins/
   ```

2. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 이 폴더에 복사합니다

3. Glyphs 3를 재시작합니다

## 플러그인 확인

플러그인이 제대로 설치되었는지 확인:

1. Glyphs 3를 실행합니다
2. 메뉴에서 `Plug-ins` > `Hanguel Skeletype Converter` 확인
3. 또는 `Window` > `Plugin Manager`에서 확인

## 사용 방법

1. Glyphs 3에서 중심선을 추출하고 싶은 글리프 선택
2. `Plug-ins` > `Hanguel Skeletype Converter` 실행
3. 자동으로 중심선이 추출되어 "SVG Import" 레이어에 생성됨

## 문제 해결

### 플러그인이 보이지 않는 경우

1. Glyphs 3를 완전히 종료하고 재시작
2. 플러그인 폴더 경로 확인:
   ```bash
   ls ~/Library/Application\ Support/Glyphs\ 3/Plugins/
   ```
3. 콘솔 로그 확인:
   - `Window` > `Plugin Manager` > `Console` 탭

### 플러그인 실행 오류

1. 필수 도구 확인:
   - ImageMagick: `brew install imagemagick`
   - Autotrace: `brew install autotrace`

2. 콘솔 로그에서 오류 메시지 확인

3. 플러그인 재설치 시도

## 제거 방법

1. 플러그인 폴더에서 삭제:
   ```bash
   rm -rf ~/Library/Application\ Support/Glyphs\ 3/Plugins/HanguelSkeletypeConverter.glyphsPlugin
   ```

2. Glyphs 3 재시작

