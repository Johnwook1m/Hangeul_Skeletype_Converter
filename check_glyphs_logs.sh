#!/bin/bash

echo "=== Glyphs 3 플러그인 로그 확인 ==="
echo ""

# 방법 1: 시스템 로그에서 Glyphs 관련 메시지 찾기
echo "1. 시스템 로그에서 Glyphs 관련 오류 검색:"
echo "----------------------------------------"
log show --predicate 'process == "Glyphs"' --last 30m 2>/dev/null | grep -i -E "plugin|error|hanguel|skeletype|crash|exception|failed" | tail -20

echo ""
echo "2. 콘솔 앱에서 확인하는 방법:"
echo "   - 응용 프로그램 > 유틸리티 > 콘솔 열기"
echo "   - 검색창에 'Glyphs' 또는 'plugin' 입력"
echo ""

echo "3. Glyphs 3 내부 콘솔 확인:"
echo "   - Window > Plugin Manager > Console 탭"
echo ""
