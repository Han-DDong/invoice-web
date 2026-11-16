# Task 007: 노션 API 통합 (서버 전용)

> 상태: ✅ 완료 (실데이터 조회 확인)

## 명세서

노션 페이지 ID로 견적서 1건과 연결된 견적 항목을 조회해 `Invoice` 도메인 타입으로 변환하는 서버 전용 계층을 만듭니다. 화면 연결은 Task 008에서 합니다.

### 설계 결정

- `@notionhq/client` 5.x는 data source 기반입니다. 항목은 `dataSources.query`, 견적서는 `pages.retrieve`로 조회합니다. (기본 Notion-Version `2025-09-03`)
- 클라이언트는 `getNotionClient()`로 모듈 단위 1회 생성합니다. `timeoutMs` 10초, SDK 내장 재시도(최대 2회, 429/529는 항상, 500/503은 멱등 요청만)를 사용합니다.
- 노션 요청은 커스텀 `fetch`에 `cache: "no-store"`를 넣어 항상 최신으로 조회합니다. (캐시는 Task 010)
- `lib/notion.ts`, `lib/invoice-service.ts`, `lib/invoice-access.ts`는 `import "server-only"`로 클라이언트 컴포넌트 import를 빌드 단계에서 막습니다. (Next.js가 내부 처리하므로 패키지 설치 불필요)
- 노션 응답은 `unknown`으로 받아 `notionInvoicePageSchema`, `notionItemPageSchema`로 `safeParse`합니다. SDK 응답 타입을 도메인 변환에 직접 쓰지 않습니다.
- 항목 금액은 `calculateItemAmount`(수량 x 단가)로 재계산하고 노션 `금액` 값은 쓰지 않습니다. 부가세는 없고 합계는 항목 금액 합계입니다.
- 날짜는 `YYYY-MM-DD`로 정규화합니다. 시각이 포함되면 KST(`Asia/Seoul`) 기준 날짜로 바꿉니다.
- 발행일, 유효기간, 상태가 비어 있거나 항목의 수량/단가가 비어 있으면 `validation_failed`입니다.
- 견적서 페이지의 `parent.database_id`가 `NOTION_INVOICE_DATABASE_ID`와 같을 때만 허용합니다. (항목 조회용 data source ID는 `databases.retrieve`로 찾아 캐시합니다.) (대시 제거, 소문자 비교) 다른 DB 페이지, 휴지통/보관 페이지는 `not_found`입니다.
- 노션 ID 형식(대시 제거 후 32자리 16진수)이 아니면 API를 호출하지 않고 `not_found`를 반환합니다.

### 오류 매핑

- 페이지 조회의 `object_not_found`, `validation_error`(잘못된 ID), `InvalidPathParameter` → `not_found`
- 그 외 API 오류, 타임아웃, 항목 조회 실패, 환경변수 누락 → `query_failed`
- Zod 검증 실패 → `validation_failed` (`issues`는 `items[0].item.properties.수량` 같은 필드 경로 문자열만)
- 오류 원문과 `cause`는 `console.error`로 서버 로그에만 남기고 반환값/화면에는 원문, API 키, DB ID를 넣지 않습니다.

## 관련 파일

- `lib/notion.ts` - 노션 클라이언트 생성 (신규)
- `lib/notion-parser.ts` - Zod 검증 후 `Invoice` / `InvoiceItem` 변환, 날짜 정규화 (신규)
- `lib/invoice-service.ts` - `getInvoiceByPageId`, `InvoiceResult` (신규)
- `types/notion.ts`, `types/invoice.ts`, `types/invoice-error.ts`, `lib/env.ts`, `lib/invoice-calculations.ts` - 재사용 (변경 없음)

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과, `any` / `@ts-ignore` 사용 없음
- [x] `getInvoiceByPageId`가 `{ ok: true, invoice }` 또는 `{ ok: false, error }`를 반환
- [x] 항목을 `has_more`가 끝날 때까지 `start_cursor`로 모두 수집하고 `created_time` 오름차순 정렬
- [x] 다른 데이터 소스의 페이지 ID는 `not_found`
- [x] 반환값과 화면에 오류 원문, 키, DB ID가 없음
- [x] 실제 노션 페이지 조회 결과가 CSV 값과 일치 (INV-2026-011, 삼성물산, 항목 3건, 합계 60,000,000원)

## 구현 단계

- [x] SDK `.d.ts`로 `dataSources.query`, `pages.retrieve`, 오류 타입 확인
- [x] CSV 컬럼명과 `types/notion.ts` 속성명 상수 대조 (일치)
- [x] 클라이언트, 파서, 서비스 구현
- [x] 실데이터로 조회 확인

## 후속 확인 사항

- 환경변수에는 data source ID가 아니라 database ID를 넣습니다. 항목 조회용 data source ID는 `databases.retrieve`로 찾아 캐시합니다. (data source ID를 넣으면 소속 확인에서 모두 404가 났던 문제를 수정함)
- 항목이 100건을 넘는 견적서는 확인하지 못했습니다. (`has_more` 반복 수집은 구현, 실데이터 미확인)
- 총 금액/금액이 Rollup 타입인 경우는 현재 스키마가 검증 실패로 처리합니다. 실제 DB에서는 문제가 없었습니다.
- `총 금액`(견적서)과 `금액`(항목)이 노션에서 Rollup 타입이면 현재 스키마(`number` / `formula` 숫자만 허용)에서 `validation_failed`가 납니다. 실조회 시 서버 로그의 경로로 확인하고, 필요하면 해당 속성 스키마만 완화합니다. (두 값 모두 화면에서 쓰지 않음)

## 테스트 체크리스트

Playwright MCP 시나리오 (dev 서버 `npm run dev`, Task 008 페이지 연결 후)

- [x] 실제 견적서 ID `http://localhost:3000/invoice/41613cd0902080898c22e95dc9a20894` 조회 성공 (유효기간이 지났을 때 `reason=expired`로 이동하는 것도 확인)
- [x] 유효기간 내 견적서에서 견적서 번호, 클라이언트명, 발행일, 항목 3건(수량/단가/금액), 합계가 CSV 값과 일치
- [x] 항목 순서가 노션 생성 순서와 같음 (웹사이트 디자인, 로고 제작, 명함 디자인)
- [x] 견적 항목 DB의 페이지 ID(예: `41613cd0902080aab464eaad086962b7`)로 접근하면 404 (다른 DB 페이지 차단)
- [x] 노션 형식이 아닌 토큰은 404 (API 미호출은 코드 기준, 호출 횟수 계측은 안 함)
- [x] 환경변수 누락 상태에서 `/unavailable?reason=error`로 이동하고 화면에 원문이 없음
- [x] 화면, 응답 HTML, PDF에 API 키와 DB ID가 없음 (포함 횟수 0회)
