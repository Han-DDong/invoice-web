# Task 009-1: 핵심 기능 통합 테스트 및 문서 동기화

> 상태: ✅ 완료 (일부 시나리오는 실데이터가 없어 미확인, 아래 참고)

## 명세서

Phase 3 전체(노션 조회, 접근 판정, PDF 생성과 다운로드)를 Playwright MCP와 HTTP 호출로 검증하고, 문서를 실제 구현 상태에 맞춥니다. 확인하지 못한 항목은 확인한 것처럼 적지 않고 미확인으로 남깁니다.

테스트 환경: 2026-11-16, `npm run dev`(Turbopack) 개발 서버, 실제 노션 견적서 INV-2026-011(삼성물산, 항목 3건, 유효기간 2026-12-31로 수정된 상태). 노션 장애 시나리오는 잘못된 키로 프로덕션 빌드를 임시 서버(3101 포트)에 띄워 확인했습니다. `.env.local`은 수정하지 않았습니다.

## 관련 파일

- `tasks/009-1-core-integration-test.md` - 이 파일 (신규)
- `docs/ROADMAP.md` - Phase 3 완료 표시, lib 경로 정정, 009-A/B 분할과 의존성 그래프, MVP 체크리스트 (수정)
- `shrimp-rules.md` - 1.1 미구현 문구, 4.3 접근 판정 표, 4.4 부가세 서술 (수정)
- `tasks/007-notion-api-integration.md`, `tasks/008-invoice-data-rendering.md` - 실데이터 확인 결과 반영 (수정)

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과
- [x] 정상 견적서가 노션 값과 같게 표시되고 합계가 항목 금액 합계와 일치
- [x] 형식 오류, 없는 ID, 다른 DB 페이지 ID, 노션 장애 시나리오가 의도한 화면으로 이동
- [x] PDF 다운로드(정상, 형식 오류, 없는 ID, 노션 장애) 확인
- [x] 375 / 768 / 1280px에서 가로 스크롤 없음
- [x] 페이지 로드 3초 미만, PDF 생성 5초 미만
- [x] 응답 HTML과 PDF에 API 키, DB ID가 없음
- [ ] 만료 견적서의 PDF 410 (만료된 실데이터 없음)
- [ ] 항목 0건 견적서의 실데이터 표시와 PDF (실데이터 없음)
- [ ] 항목 100건 초과 견적서의 페이지네이션 수집 (실데이터 없음)
- [ ] Chromium 외 브라우저에서 PDF 다운로드
- [ ] `npm run format:check` (prettier가 설치되어 있지 않아 실행 불가, 아래 참고)

## 구현 단계

- [x] 시나리오별 Playwright MCP 검증
- [x] 응답 시간 측정
- [x] 노션 장애 시나리오(잘못된 키) 확인
- [x] 응답에 키와 DB ID 포함 여부 확인 (값은 출력하지 않고 포함 횟수만 확인)
- [x] ROADMAP, shrimp-rules, 007, 008 문서 동기화
- [x] `TODO(Fxxx)` 주석 잔여 확인 (`app`, `components`, `lib`에 없음)
- [x] 미사용 `lib/dummy/invoice.ts` 삭제 (사용자 확인 후 삭제, 코드 참조 없음 확인)

## 테스트 결과

### 화면

- [x] 정상: `/invoice/41613cd0902080898c22e95dc9a20894` → 견적서 INV-2026-011, 삼성물산, 항목 3건(웹사이트 디자인 1 x 55,000,000 / 로고 제작 2 x 500,000 / 명함 디자인 400 x 10,000), 총 견적 금액 60,000,000원
- [x] 형식 오류: `/invoice/short` → `/unavailable?reason=invalid`
- [x] 노션 ID 형식이 아닌 토큰: `/invoice/abcdefghijklmnopqrstuvwx` → 404 화면
- [x] 존재하지 않는 페이지 ID: `/invoice/00000000000000000000000000000000` → 404 화면
- [x] 다른 DB의 페이지 ID(항목 페이지): `/invoice/41613cd0902080aab464eaad086962b7` → 404 화면, 견적서 내용 미노출
- [x] 만료: 유효기간이 2026-11-09였을 때 `/unavailable?reason=expired`로 이동 (이후 사용자가 노션에서 2026-12-31로 변경)
- [x] 노션 장애(잘못된 키, 프로덕션 빌드 임시 서버): `/unavailable?reason=error`로 이동, 화면에 키와 DB ID 없음
- [x] 노션 값 변경 반영: 유효기간 변경 전 `expired`, 변경 후 정상 표시. 새로고침만으로 반영됨 (통제된 실험은 아니며 사용자의 노션 수정 전후로 확인)

### PDF

- [x] 정상: 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="invoice-INV-2026-011.pdf"`, `Cache-Control: no-store`
- [x] 버튼 클릭 → `invoice-INV-2026-011.pdf` 다운로드, 페이지 유지
- [x] 내용: 한글(삼성물산, 항목명) 정상, 합계 60,000,000원, 부가세 없음
- [x] 형식 오류 `/invoice/short/pdf` → 404
- [x] 없는 ID → 404
- [x] 노션 장애(잘못된 키) → 500, 본문 "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
- [x] 항목 45건(더미, 009-A PoC) → 3페이지, 헤더 반복, 행 잘림 없음

### 반응형

- [x] 375px: 가로 스크롤 없음, PDF 버튼 전체 폭(293px), 합계 표시
- [x] 768px: 가로 스크롤 없음, PDF 버튼 127px
- [x] 1280px: 가로 스크롤 없음, PDF 버튼 127px

### 성능 (개발 서버 기준, 5회)

- 페이지 응답(전체 HTML): 0.61 / 0.67 / 0.69 / 0.76 / 1.31초, 중앙값 0.69초 (목표 3초 미만)
- PDF 응답: 0.55 / 0.58 / 0.59 / 0.62 / 0.71초, 중앙값 0.59초 (목표 5초 미만)
- PDF 첫 요청(컴파일 포함): 2.3초
- 브라우저 렌더링 시간(LCP 등)은 측정하지 않았습니다. 프로덕션 빌드 기준 측정도 하지 않았습니다.

### 보안

- [x] 응답 HTML과 PDF 바이너리에 `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID` 값 포함 횟수 0회
- [x] 서버 로그에는 원인만 남기고 잘못된 키 문자열은 남지 않음 (PDF 500 시나리오에서 확인)

## 문서 동기화 내역

- `docs/ROADMAP.md`: Task 007~009-1과 Phase 3 완료 표시, lib 경로를 실제 평평한 구조로 정정(`lib/invoice-service.ts`, `lib/notion-parser.ts`, `lib/pdf/fonts.ts`), Task 009를 009-A/009-B로 분할 표기, 의존성 그래프에 009-A/B/009-1 반영, MVP 체크리스트는 확인된 항목만 체크 (만료, 항목 0건, 타 브라우저 등 미확인은 체크하지 않고 사유 표기)
- `shrimp-rules.md`: 1.1 미구현 TODO 문구를 구현 완료 상태로, 4.3 상태 매핑 표를 실제 판정(토큰 형식 → 404 → 만료 → 오류)과 PDF 응답 코드 기준으로, 4.4의 vat 서술을 부가세 없음으로 정정
- `README.md`: 009-B에서 라우트 표와 폴더 구조를 갱신했고 이번에 추가 변경 없음
- `.env.example`: 환경변수 이름과 설명을 database ID 기준으로 이미 갱신되어 있음

## 후속 확인 사항

- 화면 하단 문구 "부가세는 별도로 청구됩니다"는 부가세 없음 설계와 충돌 가능성이 있어 사용자 확인이 필요합니다. (이번 작업에서 수정하지 않음)
- `package.json`에 `format`, `format:check`, `check-all`, `prepare`(husky), `lint-staged`가 추가되어 있으나 `prettier`, `husky`가 `node_modules`에 설치되어 있지 않아 `npm run format:check`는 실행되지 않습니다. (`sh: prettier: command not found`) 이 도구들은 이번 작업에서 설치하지 않았습니다.
- `lib/dummy/invoice.ts`는 삭제했습니다. 더미 견적서(상태별, 항목 0건, 만료)로 하던 UI 미리보기는 더 이상 불가능하므로, 항목 0건 같은 화면은 노션에 테스트용 견적서를 만들어 확인해야 합니다. 필요하면 git 이력에서 복구할 수 있습니다.
- 응답 시간은 개발 서버 기준이며, Notion API 응답 시간에 영향을 받습니다. 캐싱은 Task 010에서 다룹니다.
- 만료(410), 항목 0건, 항목 100건 초과, 유효기간 당일(KST) 경계, Chromium 외 브라우저는 확인하지 못했습니다.

## 후속 해소 (Task 012-A, 2026-11-16)

아래 3건은 Vitest 모킹 테스트로 확인했습니다. **실데이터 확인이 아니라** 노션 클라이언트를 모킹한 단위 테스트입니다. ([작업 파일](012-testing-deployment.md))

- 만료 PDF 410: `tests/pdf-route.test.ts` (`expired → 410`, 본문 "유효기간이 지난 견적서입니다."), `tests/invoice-access.test.ts` (KST 자정 경계 만료 전환)
- 항목 0건: `tests/invoice-service.test.ts` (`items: []`), 합계 0은 `tests/pure-functions.test.ts`
- 항목 100건 초과: `tests/invoice-service.test.ts` (150건, `dataSources.query` 2회, 커서 전달, 합계 일치)
- 유효기간 당일(KST) 경계도 `isInvoiceExpired`, `getKstToday` 테스트로 확인했습니다. Chromium 외 브라우저는 여전히 미확인입니다. (Task 012-B)
