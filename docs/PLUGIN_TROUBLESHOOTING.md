# 플러그인 문제 해결 가이드

## Plugin Manager에서 플러그인이 보이지 않는 경우

### 1. Glyphs 3 재시작 확인
- 플러그인 설치 후 **반드시 Glyphs 3를 완전히 종료하고 재시작**해야 합니다
- Dock에서 Glyphs 3를 완전히 종료 (Cmd+Q)

### 2. 플러그인 설치 위치 확인
```bash
ls -la ~/Library/Application\ Support/Glyphs\ 3/Plugins/
```

### 3. 콘솔 로그 확인
1. Glyphs 3 실행
2. `Window` > `Plugin Manager` 열기
3. `Console` 탭에서 오류 메시지 확인

### 4. GeneralPlugin 특성
`GeneralPlugin` 타입은 Plugin Manager에 나타나지 않을 수 있습니다. 대신:
- 메뉴에서 `Plug-ins` > `Hanguel Skeletype Converter` 확인
- 또는 `Edit` 메뉴에 추가된 항목 확인

### 5. 플러그인 수동 실행
플러그인이 로드되었는지 확인:
1. Glyphs 3 실행
2. 글리프 선택
3. `Plug-ins` 메뉴에서 플러그인 찾기
4. 또는 `Window` > `Macro Panel` > `Run Script`에서 확인

### 6. 플러그인 재설치
```bash
# 기존 플러그인 제거
rm -rf ~/Library/Application\ Support/Glyphs\ 3/Plugins/HanguelSkeletypeConverter.glyphsPlugin

# 새로 복사
cp -r "/Users/johnn/Desktop/05_개별연구1/02_WIP/260110_WIP_06_MainPlugin/HanguelSkeletypeConverter.glyphsPlugin" \
  ~/Library/Application\ Support/Glyphs\ 3/Plugins/

# Glyphs 3 재시작
```

## 플러그인 실행 오류

### 1. 필수 도구 확인
```bash
# ImageMagick 확인
which magick || which convert

# Autotrace 확인
which autotrace
```

### 2. Python 문법 오류 확인
```bash
python3 -m py_compile ~/Library/Application\ Support/Glyphs\ 3/Plugins/HanguelSkeletypeConverter.glyphsPlugin/Contents/Resources/HanguelSkeletypeConverter.py
```

### 3. 콘솔 로그에서 오류 메시지 확인
Glyphs 3 > `Window` > `Plugin Manager` > `Console` 탭

