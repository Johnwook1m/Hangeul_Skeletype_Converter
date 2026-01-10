# 스크립트 vs 플러그인: 차이점 가이드

## 개요

Glyphs 3에서는 **스크립트(Script)**와 **플러그인(Plugin)** 두 가지 확장 방식을 제공합니다. 각각의 특징과 차이점을 이해하면 프로젝트에 적합한 방식을 선택할 수 있습니다.

## 주요 차이점 비교

### 1. 구조

#### 스크립트 (Script)
- **단일 Python 파일**
- 간단한 구조
- 예: `00_Hanguel_Skeletype_Converter.py`

```
00_Hanguel_Skeletype_Converter.py
├── #MenuTitle: Hanguel Skeletype Converter
├── import 문들
└── 실행 코드
```

#### 플러그인 (Plugin)
- **macOS 번들 구조** (.glyphsPlugin)
- 복잡한 구조
- 예: `HanguelSkeletypeConverter.glyphsPlugin`

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # 메타데이터
│   └── Resources/
│       └── HanguelSkeletypeConverter.py
```

### 2. 설치 위치

#### 스크립트
```
~/Library/Application Support/Glyphs 3/Scripts/
```

#### 플러그인
```
~/Library/Application Support/Glyphs 3/Plugins/
```

### 3. 실행 방식

#### 스크립트
- **메뉴**: `Script` > `Run Script...` 또는 `Script` 메뉴에서 직접 선택
- `#MenuTitle:` 주석으로 메뉴에 표시
- 즉시 실행되는 코드

```python
#MenuTitle: Hanguel Skeletype Converter
#!/usr/bin/env python3

# 바로 실행되는 코드
Glyphs.clearLog()
print("스크립트 실행")
# ... 메인 로직
```

#### 플러그인
- **메뉴**: `Plug-ins` 메뉴 또는 특정 위치 (타입에 따라)
- 클래스 기반 구조
- `run()` 메서드 호출 시 실행

```python
class HanguelSkeletypeConverter(GeneralPlugin):
    def settings(self):
        self.name = "Hanguel Skeletype Converter"
    
    def run(self):
        # 실행되는 코드
        Glyphs.clearLog()
        print("플러그인 실행")
        # ... 메인 로직
```

### 4. 기능 범위

#### 스크립트
- ✅ 간단한 작업에 적합
- ✅ 빠른 프로토타이핑
- ✅ 일회성 작업
- ❌ UI 추가 어려움
- ❌ 지속적인 상태 관리 어려움
- ❌ 메뉴 통합 제한적

#### 플러그인
- ✅ 복잡한 기능 구현 가능
- ✅ UI 추가 가능 (팔레트, 툴바 등)
- ✅ 지속적인 상태 관리
- ✅ 다양한 플러그인 타입 지원
  - **Filter**: 글리프 처리
  - **Reporter**: 정보 표시
  - **Tool**: 도구 추가
  - **Palette**: 팔레트 항목
  - **General**: 일반 기능

### 5. 개발 복잡도

#### 스크립트
- ⭐ **간단함**
- 단일 파일 작성
- 즉시 테스트 가능
- 디버깅 쉬움

#### 플러그인
- ⭐⭐⭐ **복잡함**
- 번들 구조 생성 필요
- Info.plist 작성 필요
- 클래스 구조 이해 필요
- 재시작 후 테스트 필요

### 6. 배포

#### 스크립트
- 단일 `.py` 파일 공유
- GitHub, 이메일 등으로 간단히 공유

#### 플러그인
- `.glyphsPlugin` 번들 공유
- Plugin Manager를 통한 배포 가능
- 더 전문적인 배포 방식

## 현재 프로젝트의 경우

### 스크립트 버전 (`00_Hanguel_Skeletype_Converter.py`)
```python
#MenuTitle: Hanguel Skeletype Converter
#!/usr/bin/env python3

# 바로 실행되는 코드
Glyphs.clearLog()
# ... 메인 로직
```

**장점:**
- 간단하고 빠르게 개발 가능
- 즉시 테스트 가능
- 수정 후 바로 반영

**단점:**
- Plugin Manager에 나타나지 않음
- 메뉴 통합 제한적

### 플러그인 버전 (`HanguelSkeletypeConverter.glyphsPlugin`)
```python
class HanguelSkeletypeConverter(GeneralPlugin):
    def settings(self):
        self.name = "Hanguel Skeletype Converter"
    
    def run(self):
        # 메인 로직
```

**장점:**
- Plugin Manager에서 관리 가능
- 더 전문적인 구조
- 향후 확장 가능 (UI 추가 등)

**단점:**
- 개발 복잡도 높음
- 재시작 필요
- 디버깅 어려움

## 언제 무엇을 사용할까?

### 스크립트를 사용하는 경우
- ✅ 간단한 작업
- ✅ 빠른 프로토타이핑
- ✅ 개인 사용
- ✅ 일회성 작업
- ✅ 빠른 개발이 필요한 경우

### 플러그인을 사용하는 경우
- ✅ 복잡한 기능
- ✅ 공유/배포 예정
- ✅ UI가 필요한 경우
- ✅ 지속적인 상태 관리 필요
- ✅ 전문적인 도구

## 현재 프로젝트 권장사항

**개발 단계**: 스크립트 사용 권장
- 빠른 개발과 테스트
- 기능 검증

**배포 단계**: 플러그인으로 변환
- 공유 및 배포
- 사용자 편의성

## 참고 자료

- [Glyphs Handbook - Scripts](https://handbook.glyphsapp.com/extensions/scripts/)
- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK](https://github.com/schriftgestalt/GlyphsSDK)

