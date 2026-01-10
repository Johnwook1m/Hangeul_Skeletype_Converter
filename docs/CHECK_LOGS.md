# Glyphs 3 로그 확인 방법

## 방법 1: Glyphs 3 내부 콘솔 (가장 쉬움)

1. Glyphs 3 실행
2. `Window` > `Plugin Manager` 열기
3. `Console` 탭 클릭
4. 여기서 플러그인 로드 오류 메시지 확인

## 방법 2: macOS 콘솔 앱

1. `응용 프로그램` > `유틸리티` > `콘솔` 열기
2. 왼쪽 사이드바에서:
   - `로그 보고서` > `Glyphs` 또는 `GlyphsApp` 찾기
   - 또는 상단 검색창에 "Glyphs" 입력
3. 최근 로그 확인

## 방법 3: 터미널에서 로그 확인

```bash
# Glyphs 관련 로그 확인
log show --predicate 'process == "Glyphs"' --last 5m

# 또는 시스템 로그에서 검색
log show --predicate 'subsystem == "com.schriftgestalt.Glyphs"' --last 5m
```

## 방법 4: Glyphs 로그 파일 직접 확인

```bash
# Glyphs 로그 파일 위치 확인
ls -la ~/Library/Logs/Glyphs/

# 또는
ls -la ~/Library/Application\ Support/Glyphs\ 3/Logs/
```

