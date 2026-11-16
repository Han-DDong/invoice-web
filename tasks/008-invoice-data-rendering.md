# Task 008: 접근 판정과 페이지 실데이터 연동

> 상태: ✅ 완료 (만료 이동은 실데이터로 확인, 당일 경계는 미확인)

## 명세서

`/invoice/[token]` 페이지의 더미 조회를 노션 실데이터 조회로 바꾸고, 토큰 형식, 존재 여부, 유효기간을 한 함수(`getAccessibleInvoice`)에서 판정합니다. 이 함수는 PDF 라우트(Task 009-B)가 시그니처 그대로 재사용합니다.

### 설계 결정

- `getAccessibleInvoice(token)` 반환: `{ ok: true, invoice } | { ok: false, reason: "invalid" | "not_found" | "expired" | "error" }`
- 판정 순서: `shareTokenSchema` 검증 → `getInvoiceByPageId` → 유효기간 확인
- `getInvoiceByPageId`의 `not_found`는 `not_found`, `query_failed` / `validation_failed`는 `error`로 바꿉니다.
- `isInvoiceExpired(validUntil, today)`: 둘 다 `YYYY-MM-DD`라 문자열 비교로 `validUntil < today`일 때 만료입니다. 유효기간 당일까지 유효합니다.
- 오늘 날짜는 `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })`로 만들어 서버 시간대와 무관합니다. `today`를 생략하면 KST 오늘을 사용합니다.
- 페이지 처리: `invalid` / `expired` / `error`는 `redirect(getUnavailableUrl(reason))`, `not_found`는 `notFound()`(404)
- 상태(대기/승인/거절)로 접근을 막지 않습니다. (명세에 없음)
- 노션 요청은 `cache: "no-store"`로 매 요청 최신 조회합니다. 빌드 출력에서 `/invoice/[token]`은 `ƒ`(동적)입니다.
- 더미 조회 사용처를 제거했고, 사용처가 없어진 `lib/dummy/invoice.ts`는 Task 009-1에서 삭제했습니다. (`TODO(F003)`은 Task 009-B에서 제거)

## 관련 파일

- `lib/invoice-access.ts` - `isInvoiceExpired`, `getKstToday`, `getAccessibleInvoice` (신규)
- `app/invoice/[token]/page.tsx` - 더미 조회 제거, 접근 판정 연결 (수정)
- `lib/dummy/invoice.ts` - 사용처 제거 후 Task 009-1에서 삭제

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과
- [x] 빌드 출력에서 `/invoice/[token]`이 `ƒ`(동적)
- [x] 형식 오류 토큰이 `/unavailable?reason=invalid`로 이동
- [x] 노션 ID 형식이 아닌 토큰이 404 화면
- [x] 조회 실패(환경변수 누락) 시 `/unavailable?reason=error`로 이동
- [x] 실제 견적서가 CSV 값(합계 60,000,000원)과 같게 표시
- [x] 유효기간이 지난 견적서가 `/unavailable?reason=expired`로 이동 (유효기간 2026-11-09일 때 확인)

## 구현 단계

- [x] `lib/invoice-access.ts` 구현
- [x] 페이지에서 더미 조회와 `TODO(Task 008)`, `TODO(F001)` 제거
- [x] 빌드 출력으로 동적 렌더링 확인
- [x] Playwright MCP로 invalid / 404 / error 이동 확인
- [x] 실데이터로 정상 표시 / 만료 확인

## 후속 확인 사항

- 유효기간 당일(KST) 경계와 항목 0건 실데이터는 확인하지 못했습니다.
- CSV의 견적서(INV-2026-011)는 유효기간이 2026-11-09라 오늘(2026-11-16) 기준 만료입니다. 정상 표시 확인에는 유효기간을 오늘 이후로 바꾼 견적서가 필요합니다.

## 테스트 체크리스트

Playwright MCP 시나리오 (`npm run dev`, 환경변수 3개 설정 후)

- [x] `http://localhost:3000/invoice/not-a-token` → `/unavailable?reason=invalid`, "잘못된 링크입니다"
- [x] `http://localhost:3000/invoice/dummyinvoicepending0001` → 404 화면
- [x] `http://localhost:3000/invoice/00000000000000000000000000000000` → 404 화면
- [x] 유효기간이 지난 INV-2026-011 `http://localhost:3000/invoice/41613cd0902080898c22e95dc9a20894` → `/unavailable?reason=expired`
- [x] 유효기간을 오늘 이후로 바꾼 뒤 같은 URL → 견적서 번호 INV-2026-011, 클라이언트명 삼성물산, 발행일 2026-11-03, 항목 3건(웹사이트 디자인 1 x 55,000,000 / 로고 제작 2 x 500,000 / 명함 디자인 400 x 10,000), 합계 60,000,000원
- [ ] 유효기간을 오늘(KST)로 바꾸면 정상 표시 (당일까지 유효)
- [x] 노션에서 값을 바꾼 뒤 새로고침하면 바로 반영 (유효기간 변경 전후로 확인)
- [x] 환경변수 누락 상태 → `/unavailable?reason=error`, 화면에 원문 없음
- [ ] 375px / 1280px에서 실데이터 화면 가로 스크롤 없음
