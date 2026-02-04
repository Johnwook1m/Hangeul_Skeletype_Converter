/**
 * Hanguel Skeletype Converter - 베타 테스트 피드백 구글폼 생성 스크립트 (v2)
 *
 * 변경사항 (v2):
 * - 3-3. 변환 성공률 → 세분화 (기술적 완료율 / 품질 만족도 / 문제 유형)
 * - 4-3. 결과물 만족도 → 디테일한 주관식 추가
 * - 4-4. 실제 유용성 → 활용도 인사이트 수집 질문 추가
 *
 * 사용 방법:
 * 1. Google Drive에서 "새로 만들기" → "더보기" → "Google Apps Script" 클릭
 * 2. 이 코드를 전체 복사해서 붙여넣기
 * 3. 상단의 "실행" 버튼 클릭 (또는 Ctrl+Enter)
 * 4. 권한 승인 요청이 나오면 "허용" 클릭
 * 5. 완료되면 로그에서 폼 URL 확인
 */

function createBetaTestForm() {
  // 폼 생성
  var form = FormApp.create('Hanguel Skeletype Converter - 베타 테스트 피드백');

  // 폼 설명
  form.setDescription(
    '베타 테스트에 참여해주셔서 감사합니다!\n' +
    '여러분의 피드백은 플러그인 개선에 큰 도움이 됩니다.\n\n' +
    '📧 문의: johnwkim82@gmail.com'
  );

  // 응답 수집 설정
  form.setCollectEmail(true);
  form.setAllowResponseEdits(true);

  // ============================================================
  // 섹션 1. 기본 정보
  // ============================================================
  form.addSectionHeaderItem()
    .setTitle('섹션 1. 기본 정보');

  // 1-1. Glyphs 버전
  form.addTextItem()
    .setTitle('1-1. Glyphs 버전')
    .setHelpText('예시) 3.4.5')
    .setRequired(true);

  // 1-2. Glyphs 사용 경험
  form.addMultipleChoiceItem()
    .setTitle('1-2. Glyphs 사용 경험')
    .setChoiceValues([
      '입문 (1년 미만)',
      '중급 (1~3년)',
      '고급 (3년 이상)'
    ])
    .setRequired(true);

  // ============================================================
  // 섹션 2. 설치 과정
  // ============================================================
  form.addPageBreakItem()
    .setTitle('섹션 2. 설치 과정');

  // 2-1. Homebrew, ImageMagick, Autotrace, 플러그인
  form.addMultipleChoiceItem()
    .setTitle('2-1. Homebrew, ImageMagick, Autotrace, 플러그인 설치')
    .setChoiceValues([
      '성공',
      '실패'
    ])
    .setRequired(true);

  // 2-2. 설치 중 어려웠던 점
  form.addParagraphTextItem()
    .setTitle('2-2. 설치 중 어려웠던 점이 있다면 적어주세요.')
    .setRequired(false);

  // ============================================================
  // 섹션 3. 기능 테스트
  // ============================================================
  form.addPageBreakItem()
    .setTitle('섹션 3. 기능 테스트');

  // 3-1. 테스트한 총 서체 수
  form.addTextItem()
    .setTitle('3-1. 테스트한 총 서체 수')
    .setRequired(true);

  // 3-2. 테스트한 총 글리프 수
  form.addMultipleChoiceItem()
    .setTitle('3-2. 테스트한 총 글리프 수')
    .setChoiceValues([
      '1~5개',
      '6~20개',
      '21~50개',
      '50개 이상'
    ])
    .setRequired(true);

  // 3-3a. 변환 완료율 (기술적 성공/실패)
  form.addMultipleChoiceItem()
    .setTitle('3-3a. 변환이 완료된 글리프 비율은?')
    .setHelpText('오류 없이 "Converted Skeletype" 레이어가 생성된 경우')
    .setChoiceValues([
      '전부 완료 (100%)',
      '대부분 완료 (70~99%)',
      '절반 정도 (30~69%)',
      '대부분 실패 (1~29%)',
      '전부 실패 (0%)'
    ])
    .setRequired(true);

  // 3-3b. 변환 품질 만족도
  form.addMultipleChoiceItem()
    .setTitle('3-3b. 변환된 결과물 중, 기대한 형태로 나온 비율은?')
    .setHelpText('뼈대가 원본 글리프의 중심선을 잘 따라가는 경우')
    .setChoiceValues([
      '전부 만족 (100%)',
      '대부분 만족 (70~99%)',
      '절반 정도 (30~69%)',
      '대부분 불만족 (1~29%)',
      '전부 불만족 (0%)'
    ])
    .setRequired(true);

  // 3-3c. 품질 문제 유형 (복수 선택)
  form.addCheckboxItem()
    .setTitle('3-3c. 변환 결과가 기대와 달랐다면, 어떤 문제가 있었나요? (복수 선택 가능)')
    .setChoiceValues([
      '뼈대가 중심선에서 벗어남',
      '뼈대가 끊어짐/불연속',
      '불필요한 선이 추가됨',
      '획의 일부가 누락됨',
      '위치/정렬이 맞지 않음',
      '크기가 맞지 않음',
      '문제 없음',
      '기타'
    ])
    .setRequired(false);

  // 3-4. 테스트한 폰트 종류
  form.addCheckboxItem()
    .setTitle('3-4. 어떤 종류의 폰트로 테스트하셨나요? (복수 선택 가능)')
    .setChoiceValues([
      '세리프(명조) 폰트',
      '산세리프(고딕) 폰트',
      '손글씨/스크립트 폰트',
      '굵은(Bold) 폰트',
      '얇은(Light/Thin) 폰트',
      '본인이 작업 중인 폰트',
      '기타'
    ])
    .setRequired(true);

  // 3-5. 실패한 글리프
  form.addParagraphTextItem()
    .setTitle('3-5. 변환에 실패한 글리프가 있다면 어떤 서체의 어떤 글리프인지 이름을 적어주세요.')
    .setHelpText('예시) NanumMyeongjo의 ga-ko, han-ko, ...')
    .setRequired(false);

  // 3-6. 오류 메시지
  form.addParagraphTextItem()
    .setTitle('3-6. 오류가 있었다면 Window > Macro Panel 내용을 붙여넣어 주세요.')
    .setRequired(false);

  // ============================================================
  // 섹션 4. 사용성 평가
  // ============================================================
  form.addPageBreakItem()
    .setTitle('섹션 4. 사용성 평가');

  // 4-1. 설치 과정 난이도
  form.addScaleItem()
    .setTitle('4-1. 설치 과정이 쉬웠나요?')
    .setBounds(1, 5)
    .setLabels('매우 어려움', '매우 쉬움')
    .setRequired(true);

  // 4-2. 사용 방법 직관성
  form.addScaleItem()
    .setTitle('4-2. 사용 방법이 직관적인가요?')
    .setBounds(1, 5)
    .setLabels('전혀 직관적이지 않음', '매우 직관적임')
    .setRequired(true);

  // 4-3. 결과물 만족도
  form.addScaleItem()
    .setTitle('4-3. 변환 결과물이 만족스러운가요?')
    .setBounds(1, 5)
    .setLabels('매우 불만족', '매우 만족')
    .setRequired(true);

  // 4-3a. 만족스러운 부분 (신규)
  form.addParagraphTextItem()
    .setTitle('4-3a. 변환 결과물에서 만족스러웠던 부분이 있다면?')
    .setHelpText('예: 곡선 처리가 자연스러웠다, 세리프 부분이 잘 추출됐다, 노드 개수가 적절했다 등')
    .setRequired(false);

  // 4-3b. 아쉬운 부분 (신규)
  form.addParagraphTextItem()
    .setTitle('4-3b. 변환 결과물에서 아쉬웠거나 개선이 필요한 부분은?')
    .setHelpText('예: 획이 만나는 교차점에서 뼈대가 어긋났다, 얇은 획이 제대로 인식되지 않았다 등')
    .setRequired(false);

  // 4-4. 실제 유용성
  form.addScaleItem()
    .setTitle('4-4. 실제 작업에 유용할 것 같나요?')
    .setBounds(1, 5)
    .setLabels('전혀 유용하지 않음', '매우 유용함')
    .setRequired(true);

  // 4-4a. 활용 시나리오 (신규)
  form.addParagraphTextItem()
    .setTitle('4-4a. 이 플러그인을 어떤 상황에서 사용할 것 같나요?')
    .setHelpText('예: Variable Font 작업 시 중간 웨이트 생성, 스켈레톤 기반 새 서체 디자인, 기존 서체 분석 등')
    .setRequired(false);

  // 4-4b. 뼈대 형태에 대한 생각 (신규)
  form.addParagraphTextItem()
    .setTitle('4-4b. 추출된 뼈대의 형태에 대해 어떻게 생각하시나요?')
    .setHelpText('뼈대의 두께, 곡률, 노드 개수, 전체적인 형태 등에 대한 자유로운 의견을 적어주세요.')
    .setRequired(false);

  // 4-4c. 새로운 가능성 (신규)
  form.addParagraphTextItem()
    .setTitle('4-4c. 이 플러그인이 새롭게 가능하게 해주는 작업이 있다면 무엇인가요?')
    .setHelpText('예: 기존에는 시도하기 어려웠던 작업, 새로운 디자인 접근 방식 등')
    .setRequired(false);

  // ============================================================
  // 섹션 5. 종합 의견
  // ============================================================
  form.addPageBreakItem()
    .setTitle('섹션 5. 종합 의견');

  // 5-1. 좋았던 점
  form.addParagraphTextItem()
    .setTitle('5-1. 플러그인의 좋았던 점')
    .setRequired(false);

  // 5-2. 개선이 필요한 점
  form.addParagraphTextItem()
    .setTitle('5-2. 개선이 필요한 점')
    .setRequired(false);

  // 5-3. 추가 기능 요청
  form.addParagraphTextItem()
    .setTitle('5-3. 추가되었으면 하는 기능')
    .setRequired(false);

  // 5-4. 기타 의견
  form.addParagraphTextItem()
    .setTitle('5-4. 기타 의견')
    .setRequired(false);

  // ============================================================
  // 섹션 6. 스크린샷 첨부
  // ============================================================
  form.addPageBreakItem()
    .setTitle('섹션 6. 스크린샷 첨부 (선택)');

  // 6-1. 스크린샷 링크
  form.addParagraphTextItem()
    .setTitle('6-1. 스크린샷 첨부')
    .setHelpText('오류 화면, 변환 결과물 등의 스크린샷을 Google Drive에 업로드 후 공유 링크를 붙여넣어 주세요.')
    .setRequired(false);

  // 완료 메시지 설정
  form.setConfirmationMessage(
    '피드백을 제출해주셔서 감사합니다!\n\n' +
    '여러분의 의견은 플러그인 개선에 큰 도움이 됩니다.\n' +
    '추가 문의사항이 있으시면 johnwkim82@gmail.com으로 연락주세요.'
  );

  // 폼 URL 출력
  Logger.log('========================================');
  Logger.log('폼 생성 완료!');
  Logger.log('========================================');
  Logger.log('편집 URL: ' + form.getEditUrl());
  Logger.log('응답 URL: ' + form.getPublishedUrl());
  Logger.log('========================================');
  Logger.log('');
  Logger.log('✅ 이메일 수집이 활성화되었습니다.');
  Logger.log('========================================');

  // 폼 URL 반환
  return {
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl()
  };
}
