# Hanguel Skeletype Converter Plugin

Glyphs 3용 플러그인: 한글 글리프를 스켈레톤 타입(SVG centerline)으로 변환하는 통합 도구

## 개요

이 플러그인은 Glyphs 3에서 선택한 글리프를 자동으로 PNG로 내보낸 후, SVG centerline으로 변환하여 "SVG Import" 레이어에 import합니다.

## 주요 기능

- **자동 PNG 내보내기**: 선택한 글리프를 PNG로 내보내기
- **SVG 변환**: ImageMagick과 Autotrace를 사용하여 PNG → BMP → SVG 변환
- **자동 Import**: 변환된 SVG를 "SVG Import" 레이어에 자동 import
- **레이어 관리**: SVG Import 레이어 자동 생성 및 visibility 설정

## 필수 요구사항

- **Glyphs 3**: 최신 버전 권장
- **ImageMagick**: `brew install imagemagick`
- **Autotrace**: `brew install autotrace`

## 설치 방법

### 방법 1: 스크립트로 설치 (현재)

1. `00_Hanguel_Skeletype_Converter.py` 파일을 Glyphs 3 Scripts 폴더에 복사:
   ```
   ~/Library/Application Support/Glyphs 3/Scripts/
   ```

2. Glyphs 3를 재시작하거나 Script 메뉴에서 "Hanguel Skeletype Converter"를 실행

### 방법 2: 플러그인으로 설치 (개발 중)

플러그인 번들(.glyphsPlugin)로 제작 예정

## 사용 방법

1. Glyphs 3에서 변환하고 싶은 글리프 선택
2. Script > Run Script... 또는 Script 메뉴에서 "Hanguel Skeletype Converter" 실행
3. 자동으로 PNG → SVG 변환 후 "SVG Import" 레이어에 import됨

## 워크플로우

1. 선택한 글리프를 임시 폴더에 PNG로 내보내기
2. PNG → BMP → SVG 변환 (ImageMagick + Autotrace)
3. SVG를 원본 글리프의 "SVG Import" 레이어에 Import
4. 임시 파일 정리

## 개발 상태

- [x] 기본 스크립트 기능 구현
- [x] SVG Import 레이어 자동 생성
- [x] 레이어 visibility 자동 설정
- [ ] 플러그인 번들(.glyphsPlugin) 제작
- [ ] 베타 테스트
- [ ] 공유 준비

## 참고 자료

- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK](https://github.com/schriftgestalt/GlyphsSDK)

## 라이선스

개별 연구 프로젝트용

