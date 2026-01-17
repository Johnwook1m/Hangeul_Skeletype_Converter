# TODO: 향후 개선 사항

## 현재 상태
- 기본적인 SVG 변환 및 Import 기능 구현 완료
- 시각적 중심(visual center) 기반 정렬 로직 구현
- 중심선 기준 스케일링 로직 구현
- 컴포넌트 자동 분해 기능 추가 (2025-01-17)
- PNG 생성 및 BMP 변환 검증 완료

## 긴급 문제 (Critical)

### 0. Autotrace + pstoedit 호환성 문제 🔴
**현재 상태:**
- PNG 생성: ✅ 정상 (21KB, 2 colors)
- BMP 변환: ✅ 정상 (3.5MB)
- SVG 변환: ❌ 실패 - Autotrace 0.40.0 + pstoedit 4.3 버전 불일치
- 에러: `wrong version of pstoedit`
- 결과: 빈 SVG (113 bytes)만 생성됨

**영향:**
- 일부 글리프 (`ba-ko`, `kwi-ko`, `go-ko`, `pa-ko` 등)에서 중심선 추출 실패
- Autotrace의 `-centerline` 옵션이 작동하지 않음

**해결 방안:**
1. **ImageMagick + Potrace로 전환** (권장) ⭐
   - `magick -morphology Thinning:-1 Skeleton` + `potrace -s`
   - pstoedit 의존성 제거
   - 더 안정적이고 최신 도구
   - 구현 예상 시간: 1-2시간

2. Autotrace 다운그레이드
   - 오래된 버전 사용
   - 장기적으로 유지보수 어려움

3. 수동 워크플로우 (임시)
   - 문제 글리프만 Glyphs에서 컴포넌트 분해 후 재시도

**우선순위:** 최우선 (플러그인 핵심 기능 차단)
**예상 작업 시간:** 1-2시간

## 알려진 문제점

### 1. Scale 문제
**현재 상태:**
- 원본 중심선 기준 좌우 길이의 93%로 고정 스케일 적용
- 일부 글리프에서 스케일이 적절하지 않음

**문제점:**
- 글리프마다 형태가 다르므로 고정된 93% 스케일이 모든 경우에 적합하지 않음
- 사용자가 수동으로 스케일을 조정해야 하는 경우 발생

**개선 방향:**
- 글리프 형태에 따라 동적으로 스케일 값 조정
- 각 글리프의 실제 면적 비율을 고려한 스케일 계산
- 사용자 설정 가능한 스케일 범위 제공

### 2. Registration (정렬) 문제
**현재 상태:**
- 원본 중심선 기준으로 SVG를 이동 후 스케일 적용
- 시각적 중심(visual center) 계산 사용

**문제점:**
- 일부 글리프에서 'Converted Skeletype'이 면의 중앙이 아닌 다른 위치에 생성됨
- 왼쪽 면의 중심선 기준으로 좌우 길이가 동일해야 하는데, 실제로는 다를 수 있음

**개선 방향:**
- 더 정확한 시각적 중심 계산 방법 연구
- 글리프의 실제 면적 분포를 고려한 중심점 계산
- 각 스트로크(stroke)의 무게를 고려한 중심점 계산
- Optical center 계산 알고리즘 적용 검토
- autotrace 옵션 조정으로 중심선 추출 품질 개선 검토
  - `-error-threshold`: 곡선 피팅 정확도 조정
  - `-filter-iterations`: 중심선 스무딩 조정
  - `-despeckle-level`: 노이즈 제거

## 향후 작업 계획

### 우선순위 0: Autotrace 문제 해결 (긴급) 🔴
**목표:** SVG 변환 실패 문제 해결
1. ImageMagick Skeleton morphology + Potrace로 변환 로직 재구현
2. `convert_bmp_to_svg` 함수 수정
3. 테스트 및 검증
4. 문서 업데이트

**예상 시간:** 1-2시간
**담당:** 개발자
**완료 조건:** 모든 한글 자소가 중심선 추출 성공

### 우선순위 1: Registration 정확도 개선
1. 현재 정렬 로직의 문제점 분석
2. 다양한 글리프 형태에 대한 테스트
3. 더 정확한 중심선 계산 방법 연구
4. Optical center 계산 알고리즘 구현
5. autotrace 옵션 조정으로 중심선 추출 품질 개선 검토

### 우선순위 2: 동적 스케일 계산
1. 글리프 형태 분석을 통한 스케일 값 자동 조정
2. 면적 기반 스케일 계산 방법 연구
3. 사용자 설정 가능한 스케일 범위 제공

### 우선순위 3: 사용자 피드백 수집
1. 베타 테스터들의 피드백 수집
2. 문제가 발생하는 글리프 유형 분류
3. 개선 우선순위 결정

## 기술적 고려사항

### 시각적 중심 계산
- 현재: 노드들의 min/max 범위 중심
- 개선 필요: 실제 면적 분포, 스트로크 무게 고려

### 스케일 계산
- 현재: 원본 중심선 기준 좌우 길이의 93%
- 개선 필요: 글리프 형태에 따른 동적 조정

### 정렬 로직
- 현재: 원본 중심선으로 이동 → 스케일 적용
- 개선 필요: 더 정확한 중심선 계산 및 정렬

## 참고 자료
- Glyphs API 문서: 시각적 중심 계산 관련 메서드 확인 필요
- Typography 관련 자료: Optical center 계산 방법 연구
- 기존 플러그인 분석: 유사한 기능을 가진 플러그인의 구현 방법 참고
- ImageMagick Morphology: https://imagemagick.org/Usage/morphology/#skeleton
- Potrace: http://potrace.sourceforge.net/

## 진행 상황 로그

### 2025-01-17
- ✅ 컴포넌트 자동 분해 기능 추가
- ✅ PNG 생성 검증 (21KB, 2 colors)
- ✅ BMP 변환 검증 (3.5MB)
- ❌ Autotrace + pstoedit 호환성 문제 발견
  - 에러: `wrong version of pstoedit`
  - Autotrace 0.40.0 + pstoedit 4.3 버전 불일치
  - 재설치 시도했으나 해결 안됨
- 📋 ImageMagick + Potrace로 전환 검토 중
- 📁 디버그 모드 추가: 임시 파일 보존 기능