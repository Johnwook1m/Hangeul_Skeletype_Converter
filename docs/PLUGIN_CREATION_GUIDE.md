# Glyphs 3 플러그인 제작 가이드

## 플러그인 제작에 필요한 것들

### 1. 필수 도구 및 환경

- **Glyphs 3**: 최신 버전 설치
- **Python 3**: Glyphs 3에 내장된 Python 사용 (일반적으로 Python 3.x)
- **macOS**: 플러그인은 macOS 번들 구조를 사용
- **텍스트 에디터**: Info.plist와 Python 파일 편집용

### 2. Glyphs SDK

- **다운로드**: [GlyphsSDK GitHub](https://github.com/schriftgestalt/GlyphsSDK)
- **용도**: 플러그인 템플릿과 예제 코드 참고
- **설치**: 클론하여 예제 플러그인 구조 확인

### 3. 플러그인 구조 이해

Glyphs 플러그인은 **macOS 번들(Bundle)** 구조를 따릅니다:

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # 플러그인 메타데이터 (필수)
│   └── Resources/          # 리소스 파일
│       └── main.py         # 메인 Python 스크립트
```

### 4. 플러그인 타입

현재 스크립트는 **General Plug-in (.glyphsPlugin)** 타입으로 변환합니다.

다른 플러그인 타입:
- **Reporter** (.glyphsReporter): Edit View에 정보 표시
- **Filter** (.glyphsFilter): 글리프 레이어 처리
- **Palette** (.glyphsPalette): Palette에 항목 추가
- **Tool** (.glyphsTool): 툴바에 도구 추가
- **File Format** (.glyphsFileFormat): 파일 형식 지원

## 플러그인 제작 단계

### 1단계: Info.plist 작성

`Info.plist`는 플러그인의 메타데이터를 정의합니다:

**필수 키:**
- `CFBundleIdentifier`: 플러그인 고유 ID
- `CFBundleName`: 플러그인 이름
- `CFBundleVersion`: 버전 번호
- `NSHumanReadableCopyright`: 저작권 정보
- `NSPrincipalClass`: 메인 클래스 이름 (Python 파일명)
- `GlyphsPlugin`: Glyphs 관련 설정

**예시 구조:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.yourname.hanguelSkeletypeConverter</string>
    <key>CFBundleName</key>
    <string>Hanguel Skeletype Converter</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2025</string>
    <key>NSPrincipalClass</key>
    <string>HanguelSkeletypeConverter</string>
    <key>GlyphsPlugin</key>
    <dict>
        <key>MinimumGlyphsVersion</key>
        <string>3000</string>
    </dict>
</dict>
</plist>
```

### 2단계: Python 스크립트 변환

현재 스크립트를 플러그인 클래스로 변환:

**기본 구조:**
```python
# -*- coding: utf-8 -*-
from GlyphsApp import *
from GlyphsApp.plugins import *

class HanguelSkeletypeConverter(GeneralPlugin):
    def settings(self):
        self.name = "Hanguel Skeletype Converter"
    
    def start(self):
        # 플러그인 시작 시 실행
        pass
    
    def run(self):
        # 플러그인 실행 시 실행되는 메인 코드
        # 현재 스크립트의 메인 로직을 여기에
        pass
```

**또는 간단한 함수 기반:**
현재 스크립트는 이미 실행 가능한 형태이므로, 클래스 없이도 작동할 수 있습니다.

### 3단계: 번들 구조 생성

터미널에서 번들 구조 생성:

```bash
# 플러그인 번들 생성
mkdir -p "HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources"

# 파일 복사
cp src/00_Hanguel_Skeletype_Converter.py \
   "HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources/main.py"

# Info.plist 생성 (별도 작성 필요)
```

### 4단계: 설치 및 테스트

1. **수동 설치:**
   - 플러그인 번들을 Glyphs 앱 아이콘에 드래그 앤 드롭
   - 또는 `~/Library/Application Support/Glyphs 3/Plugins/` 폴더에 복사

2. **테스트:**
   - Glyphs 3 재시작
   - 플러그인이 로드되었는지 확인
   - 기능 테스트

## 참고 자료

- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK - GitHub](https://github.com/schriftgestalt/GlyphsSDK)
- [Writing Plug-ins Tutorial](https://glyphsapp.com/learn/plugins)

## 다음 단계

1. ✅ 플러그인 구조 이해
2. ⏳ Info.plist 작성
3. ⏳ Python 스크립트 플러그인 형식으로 변환
4. ⏳ 번들 구조 생성
5. ⏳ 테스트 및 디버깅

