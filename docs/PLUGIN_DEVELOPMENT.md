# 플러그인 개발 가이드

## Glyphs 플러그인 타입

현재 스크립트는 **General plug-in (.glyphsPlugin)** 타입으로 변환할 수 있습니다.

## 플러그인 구조

Glyphs 플러그인은 macOS 번들 구조를 따릅니다:

```
HanguelSkeletypeConverter.glyphsPlugin/
├── Contents/
│   ├── Info.plist          # 플러그인 메타데이터
│   ├── Resources/          # 리소스 파일
│   └── Scripts/            # Python 스크립트
│       └── main.py
└── (기타 번들 파일)
```

## 개발 단계

### 1단계: 스크립트 정리 (완료)
- ✅ 기본 기능 구현
- ✅ 레이어 관리 기능 추가

### 2단계: 플러그인 번들 제작 (진행 예정)
- [ ] Info.plist 작성
- [ ] 번들 구조 생성
- [ ] 스크립트를 플러그인 구조로 변환

### 3단계: 테스트
- [ ] 로컬 테스트
- [ ] 베타 테스터 모집
- [ ] 피드백 수집

### 4단계: 배포 준비
- [ ] 문서화 완료
- [ ] 라이선스 결정
- [ ] 공유 준비

## 참고 자료

- [Glyphs Handbook - Plug-ins](https://handbook.glyphsapp.com/plugins/)
- [Glyphs SDK - GitHub](https://github.com/schriftgestalt/GlyphsSDK)
- [Writing Plug-ins Tutorial](https://handbook.glyphsapp.com/plugins/)

## 다음 단계

1. Glyphs SDK 템플릿 다운로드
2. 플러그인 번들 구조 생성
3. 스크립트를 플러그인으로 변환
4. 테스트 및 배포

