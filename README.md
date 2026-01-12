# Hanguel Skeletype Converter Plugin

Glyphs 3용 플러그인: 한글 글리프를 스켈레톤 타입(SVG centerline)으로 변환하는 통합 도구

## 개요

이 플러그인은 Glyphs 3에서 선택한 글리프의 중심선(centerline)을 자동으로 추출하여 "Converted Skeletype" 레이어에 생성합니다. 한글 글리프를 스켈레톤 타입으로 변환하는 데 유용합니다.

## 주요 기능

- **중심선 추출**: 선택한 글리프의 중심선을 자동으로 추출
- **자동 레이어 생성**: 추출된 중심선을 "Converted Skeletype" 레이어에 자동 생성
- **정렬 및 스케일링**: 원본 글리프에 맞춰 자동 정렬 및 크기 조정
- **레이어 관리**: Converted Skeletype 레이어 자동 생성 및 visibility 설정

## 필수 요구사항

- **Glyphs 3**: 최신 버전 권장
- **ImageMagick**: `brew install imagemagick`
- **Autotrace**: `brew install autotrace`

## 설치 방법

### 플러그인 설치

1. `HanguelSkeletypeConverter.glyphsPlugin` 파일을 **Glyphs 3 앱 아이콘**에 드래그 앤 드롭
2. "복사" 선택
3. Glyphs 3 재시작
4. `Edit` 메뉴에서 "Hanguel Skeletype Converter" 확인

자세한 설치 방법은 [docs/PLUGIN_GUIDE.md](docs/PLUGIN_GUIDE.md)를 참고하세요.

## 사용 방법

1. Glyphs 3에서 중심선을 추출하고 싶은 글리프 선택
2. `Edit` 메뉴 > **"Hanguel Skeletype Converter"** 클릭
3. `Window` > `Macro Panel`에서 진행 상황 확인
4. 자동으로 중심선이 추출되어 **"Converted Skeletype" 레이어**에 생성됨

## 작동 원리

플러그인은 내부적으로 다음 과정을 거쳐 중심선을 추출합니다:
1. 선택한 글리프를 임시 폴더에 PNG로 렌더링
2. ImageMagick과 Autotrace를 사용하여 PNG → BMP → SVG centerline 변환
3. 변환된 중심선을 원본 글리프의 "Converted Skeletype" 레이어에 Import
4. 원본 글리프에 맞춰 자동 정렬 및 크기 조정
5. 임시 파일 정리

## 개발 상태

- [x] 중심선 추출 기능 구현
- [x] Converted Skeletype 레이어 자동 생성
- [x] 원본 글리프에 맞춘 자동 정렬 및 스케일링
- [x] 레이어 visibility 자동 설정
- [x] 플러그인 번들(.glyphsPlugin) 제작 완료
- [x] 플러그인 테스트 완료
- [ ] 베타 테스트
- [ ] 공유 준비

## 문서

- [플러그인 가이드](docs/PLUGIN_GUIDE.md) - 개발, 설치, 사용, 배포 가이드

## 참고 자료

- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK](https://github.com/schriftgestalt/GlyphsSDK)

## 라이선스

Copyright (c) 2025 Jongwook Kim, Jangho Park. All Rights Reserved.

This software is protected by copyright law. For permission requests, please contact johnwkim82@gmail.com or jpzawakun@gmail.com.

개별 연구 프로젝트용

자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.
