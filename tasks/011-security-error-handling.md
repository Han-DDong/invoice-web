# Task 011: 보안 및 에러 처리 강화 (011-A, 011-B)

> 상태: 011-A, 011-B 완료 (2026-11-16)

## 결정 사항 (2026-11-16, 사용자 별도 답변이 없어 지시된 기본안으로 확정)

- [x] **rate limit 외부 저장소 도입 여부** (011-B): **도입하지 않음** (환경변수·의존성 추가 없음). 기본안은 인메모리 IP 제한입니다. 서버리스 인스턴스 사이에 카운터가 공유되지 않아 제한이 느슨해질 수 있습니다. 외부 저장소(예: Redis 계열 서비스)를 쓰면 공유되지만 의존성, 비용, 환경변수가 늘어납니다.
- [x] **CSP 도입 여부** (011-B): **도입하지 않음, 후속 과제**. 사용자 결정에 따라 `Content-Security-Policy: frame-ancestors 'none'` 한 지시어도 보내지 않고 프레이밍 차단은 `X-Frame-Options: DENY`로만 적용. 전체 CSP(script-src 등)는 nonce 방식이면 모든 페이지가 동적 렌더링되어야 하고, nonce 없는 방식이면 `'unsafe-inline'`이 필요합니다. 기본안은 전체 CSP를 도입하지 않고 프레이밍 차단만 적용하는 것입니다.
- [x] **rate limit 구현 위치** (011-B, 아래 근거 참고): **PDF Route Handler 내부 인메모리로 결정** (`proxy.ts` 미생성). Proxy 문서의 "shared modules or globals에 의존하지 말 것" 안내와 충돌하지 않는 쪽. 기본안은 `proxy.ts`. 공식 문서가 Proxy에서 전역 상태에 의존하지 말라고 안내하므로, PDF Route Handler 안에서 제한하는 대안을 함께 검토합니다.
- [x] **제한 수치** (011-B): **IP당 1분 10회** (제안값). 제안값은 IP당 1분 10회. 실제 사용 패턴을 고려해 확인합니다.

## 명세서

### 011-A: 서버 로거와 에러 화면

노션 SDK 오류 객체를 `console.error`로 통째로 출력하는 지점을 서버 전용 로거로 바꿔, 로그에도 필요한 정보만 남깁니다. 루트 레이아웃까지 감싸는 `app/global-error.tsx`를 추가하고 404/500 문구를 맞춥니다.

- `lib/logger.ts` (신규, `import 'server-only'`)
  - 남기는 값: 범위(scope, 예: `invoice-service`, `pdf-route`), 단계(stage: `page` / `items` / `validation` / `render`), 노션 오류 `code`, HTTP `status`, 토큰 일부(앞 일부만, 예: 앞 6자 + `…`)
  - 남기지 않는 값: 오류 객체 원문, 노션 응답 본문, 요청 헤더, API 키, DB ID, 전체 토큰
  - Zod 검증 실패는 `issues`의 경로(path)와 코드만 남기고 입력값은 남기지 않습니다.
  - 형식은 한 줄 문자열 또는 JSON 한 줄 중 하나로 통일합니다. (구현 시 결정, 프리뷰 배포 로그에서 읽기 쉬운 쪽)
- 교체 지점 (2026-11-16 코드 기준 4곳)
  - `lib/invoice-service.ts` `logFetchError` (노션 조회 실패, `page` / `items` 단계)
  - `lib/invoice-service.ts` `getInvoiceByPageId` 안의 `'[invoice-service] 항목 검증 실패'` 로그
  - `lib/invoice-service.ts` `getInvoiceByPageId` 안의 `'[invoice-service] 견적서 검증 실패'` 로그
  - `app/invoice/[token]/pdf/route.ts` `GET`의 `'[pdf-route] PDF 생성 실패'` 로그
  - 토큰 일부를 남기려면 로거 호출부에 페이지 ID를 넘겨야 하므로 `logFetchError` 시그니처가 바뀝니다.
- `app/global-error.tsx` (신규)
  - `'use client'` 필수, 자체 `<html lang="ko">`와 `<body>`를 렌더링합니다. 활성화되면 루트 레이아웃을 대체하므로 Navbar, Footer, ThemeProvider가 없습니다.
  - 전역 스타일이 자동으로 들어오지 않으므로 `app/globals.css`를 직접 import합니다. 다크 모드는 `@custom-variant dark (&:is(.dark *))` 클래스 방식이라 `next-themes` 없이 적용되지 않습니다. 기본 라이트로 두거나 `prefers-color-scheme`을 따르는 방법 중 하나를 구현 시 결정합니다.
  - `metadata` export를 쓸 수 없으므로 React `<title>`을 사용합니다.
  - props는 `error`, `retry` (Next.js 16.3에서 `retry` 안정화, 설치 버전 16.4.6). 기존 `app/invoice/[token]/error.tsx`와 같은 문구와 버튼 구성을 따르되, `error.message`는 화면에 출력하지 않습니다.
- 404/500 문구 일관화
  - 404: `app/not-found.tsx`("페이지를 찾을 수 없습니다"), PDF 라우트 404 본문("견적서를 찾을 수 없습니다.")
  - 500: `app/invoice/[token]/error.tsx`("견적서를 표시하지 못했습니다"), `app/unavailable/page.tsx`의 `error` 사유("견적서를 불러오지 못했습니다"), PDF 라우트 500 본문, 신규 `global-error.tsx`
  - 같은 상황에는 같은 표현과 같은 안내("잠시 후 다시 시도해 주세요")를 쓰도록 맞추고, 바꾸는 문구 목록을 테스트 결과에 기록합니다.

설계 근거 (공식 문서로 확인한 사실, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`):

- `error.js`는 같은 세그먼트의 `layout.js`를 감싸지 않으며, 루트 레이아웃의 오류는 `global-error.js`가 처리합니다.
- `global-error`는 자체 `<html>`, `<body>`를 정의해야 하고 전역 스타일과 앱 테마 클래스가 적용되지 않습니다.
- 프로덕션에서 Server Component 오류는 일반 메시지와 `error.digest`만 클라이언트로 전달됩니다. `digest`로 서버 로그와 대조할 수 있습니다.

### 011-B: 보안 헤더와 rate limiting

- **보안 헤더** (`next.config.ts`의 `headers()`, 모든 경로 `source: '/:path*'`)
  - `Referrer-Policy`: 토큰이 URL 경로(`/invoice/<토큰>`)에 있으므로 외부 링크 이동 시 전체 URL이 Referer로 새지 않게 합니다. 제안값 `no-referrer` (브라우저 기본값 `strict-origin-when-cross-origin`보다 엄격, 같은 출처 요청에도 Referer 미전송)
  - `X-Content-Type-Options: nosniff`
  - 프레이밍 차단: `X-Frame-Options: DENY`. 전체 CSP를 도입하지 않더라도 `Content-Security-Policy: frame-ancestors 'none'` 한 지시어만 보내는 방식은 스크립트 정책에 영향이 없으므로 함께 검토합니다. (CSP 도입 결정과 분리)
  - PDF 라우트의 기존 `Cache-Control: no-store`, `Content-Disposition`은 Route Handler에서 계속 설정합니다.
- **rate limiting** (기본안 `proxy.ts`, 프로젝트 루트에 신규)
  - 대상: PDF 생성만 (`matcher: '/invoice/:token/pdf'`). PDF 렌더링이 가장 비싼 작업이기 때문입니다. 화면 경로는 제한하지 않습니다.
  - 방식: 인메모리 고정 윈도우 또는 슬라이딩 윈도우, IP 기준. 초과 시 `429` + `Retry-After`(초) + `Cache-Control: no-store`, 본문은 한국어 일반 문구.
  - IP는 프록시 헤더(`x-forwarded-for` 첫 값 등)에서 읽습니다. 어떤 헤더를 신뢰할지는 배포 플랫폼에 따라 다르므로 확인이 필요합니다. (확인 필요, 012-B 프리뷰 배포에서 검증)
  - 한계(문서화 필수): 카운터가 인스턴스 메모리에만 있어 서버리스 인스턴스 사이에 공유되지 않고, 인스턴스가 재시작되면 초기화됩니다. 남용을 완화할 뿐 정확한 제한이 아닙니다.
  - 메모리 증가 방지를 위해 만료된 IP 항목을 정리합니다.
- **CORS**: 교차 출처에서 호출하는 API가 없으므로 `Access-Control-Allow-*` 헤더를 추가하지 않는 정책을 README 또는 이 문서에 기록합니다. 브라우저 기본 동일 출처 정책을 그대로 씁니다.
- **API 키 보안 재확인**: 응답 HTML, PDF, 429/404/410/500 본문, 서버 로그(011-A 이후)에 `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID` 값이 없는지 다시 확인합니다.

설계 근거 (공식 문서로 확인한 사실):

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: Next.js 16에서 `middleware`는 `proxy`로 이름이 바뀌었고 기본 런타임은 Node.js이며 `runtime` 설정을 지정하면 오류가 납니다. `matcher`는 빌드 시 정적 분석되는 상수여야 합니다. **Proxy는 렌더 코드와 분리되어 실행되고 CDN에 배포될 수 있으므로 공유 모듈이나 전역 변수에 의존하지 말라**고 안내합니다. 인메모리 카운터는 이 안내와 충돌하므로 결정 필요 항목에 대안(Route Handler 내부 제한)을 올렸습니다.
- `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`: nonce 방식 CSP는 모든 페이지를 동적 렌더링해야 하고 정적 최적화와 CDN 캐시가 꺼집니다. nonce 없는 방식은 `next.config`의 `headers()`로 설정하며 `script-src`에 `'unsafe-inline'`을 포함합니다. 두 예시 모두 `frame-ancestors 'none'`을 포함합니다.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`: `headers()`는 `source`와 `headers`(key, value) 배열을 반환하며, 같은 경로에 같은 키가 겹치면 나중 값이 이깁니다.

추론/가정 (구현 시 확인 필요):

- `next.config.ts`의 `headers()`가 Route Handler(PDF) 응답과 `proxy.ts`가 직접 반환한 429 응답에도 붙는지 실제 응답으로 확인합니다.

## 관련 파일

- `lib/logger.ts` - 서버 전용 로거 (011-A, 신규)
- `lib/invoice-service.ts` - `logFetchError`와 검증 실패 로그 2곳 교체 (011-A, 수정)
- `app/invoice/[token]/pdf/route.ts` - PDF 생성 실패 로그 교체, 404/500 문구 확인 (011-A, 수정)
- `app/global-error.tsx` - 전역 에러 UI (011-A, 신규)
- `app/not-found.tsx`, `app/invoice/[token]/error.tsx`, `app/unavailable/page.tsx` - 문구 일관화 (011-A, 필요 시 수정)
- `components/layout/status-card.tsx` - `global-error.tsx`에서 재사용 가능한지 확인 (011-A)
- `next.config.ts` - `headers()` 보안 헤더 (011-B, 수정)
- `proxy.ts` - PDF 경로 rate limit (011-B, 신규, 구현 위치 결정에 따라 `app/invoice/[token]/pdf/route.ts`로 대체 가능)
- `README.md` - 라우트/폴더 구조(`proxy.ts`, `global-error.tsx`), CORS 정책, rate limit 한계 (011-A, 011-B)
- `CLAUDE.md` - 서버 전용 코드 목록에 `lib/logger.ts` 추가
- `docs/ROADMAP.md` - 완료 표시

## 수락 기준

### 011-A

- [x] `lib/logger.ts`가 `server-only`를 import하고 클라이언트 컴포넌트에서 쓰이지 않음
- [x] 4개 교체 지점에서 오류 객체 원문 대신 code, status, stage, 토큰 일부만 출력
- [x] 노션 장애 시나리오 서버 로그에 API 키, DB ID, 전체 토큰, 노션 응답 본문이 없음
- [x] `app/global-error.tsx`가 `'use client'`, 자체 `<html>`/`<body>`, `retry` 버튼을 갖고 오류 원문을 보여주지 않음
- [x] 404/500 문구가 화면과 PDF 응답에서 일관됨 (변경 목록 기록)
- [x] 375 / 1280px에서 `global-error` 화면이 깨지지 않음
- [x] `npm run check-all`, `npm run build` 통과

### 011-B

- [x] 모든 페이지와 PDF 응답에 `Referrer-Policy`, `X-Content-Type-Options`, 프레이밍 차단 헤더가 포함됨
- [x] PDF 경로에서 제한 초과 시 429, `Retry-After`, `Cache-Control: no-store`, 한국어 일반 문구 응답
- [x] 화면 경로(`/invoice/<토큰>`)는 rate limit 대상이 아님
- [x] 인메모리 제한의 한계(인스턴스 간 비공유, 재시작 시 초기화)가 문서화됨
- [x] CORS 허용 헤더가 응답에 없고, 정책이 문서화됨
- [x] CSP, 외부 저장소 결정 결과가 이 문서에 기록됨
- [x] `npm run check-all`, `npm run build` 통과

## 구현 단계

### 011-A

- [x] 현재 서버 로그 출력 확인 (잘못된 키 프로덕션 빌드, 없는 ID, 검증 실패)
- [x] `lib/logger.ts` 작성
- [x] 교체 지점 4곳 교체
- [x] `app/global-error.tsx` 작성
- [x] 404/500 문구 비교표 작성 후 일관화
- [x] README, CLAUDE.md 동기화

### 011-B

- [x] rate limit 구현 위치, 제한 수치, CSP, 외부 저장소 결정 (사용자 지시 기본안)
- [x] `next.config.ts` `headers()` 작성
- [x] rate limiter 작성 (Route Handler 선택, `lib/rate-limit.ts`)
- [x] 429 응답 확인
- [x] 한계와 CORS 정책 문서화, README 동기화

## 테스트 체크리스트

### 011-A

- [x] 잘못된 키로 띄운 프로덕션 빌드 임시 서버에서 `curl -sS http://localhost:3101/invoice/<정상 토큰>/pdf` → 500, 본문 일반 문구, 서버 로그 한 줄에 code/status/stage/토큰 일부만 출력
- [x] 같은 조건에서 Playwright MCP로 `/invoice/<정상 토큰>` → `/unavailable?reason=error`, 화면에 키와 DB ID 없음
- [x] 서버 로그에서 `NOTION_API_KEY`, 두 DB ID 값 포함 횟수 0회 (값은 출력하지 않고 횟수만 확인)
- [x] 없는 ID `/invoice/00000000000000000000000000000000` → Playwright MCP로 404 화면, PDF는 404
- [x] `global-error.tsx` 표시 확인: 루트 레이아웃에서 오류를 일으키는 임시 코드로 프로덕션 빌드 확인 후 임시 코드 제거 (커밋 금지), 다시 시도 버튼 동작
- [x] Playwright MCP 375 / 1280px 스크린샷으로 `global-error` 확인, `not-found`·`unavailable?reason=error`는 Playwright 텍스트로 문구 비교 (두 화면 스크린샷은 이번에 다시 찍지 않음)

### 011-B

- [x] `curl -sSI http://localhost:3000/` → `Referrer-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`(또는 `frame-ancestors`) 확인
- [x] `curl -sSI http://localhost:3000/invoice/<정상 토큰>/pdf` → 위 보안 헤더와 `Cache-Control: no-store` 함께 확인
- [x] `for i in $(seq 1 12); do curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/invoice/<정상 토큰>/pdf; done` → 제한 수치 초과분부터 429
- [x] 429 응답 헤더에 `Retry-After`가 있고, 그 시간이 지난 뒤 다시 200
- [x] 같은 시간에 화면 경로 `/invoice/<정상 토큰>` 반복 요청은 429가 나오지 않음
- [x] `curl -sSI -H 'Origin: https://example.com' http://localhost:3000/invoice/<정상 토큰>/pdf` → `Access-Control-Allow-Origin` 없음
- [x] Playwright MCP: 정상 토큰 화면 → PDF 다운로드 정상 (보안 헤더로 화면, 스타일, 다운로드가 깨지지 않음)
- [x] 429 본문과 응답 HTML에 키, DB ID 없음

## 테스트 결과

### 011-A (2026-11-16)

구현

- `lib/logger.ts`: `logServerError({ scope, stage, event, token, error, issues })` → JSON 한 줄. 오류는 `describeError`로 `errorName`, `code`, `status`만 꺼내고 message는 남기지 않습니다(노션 message에 페이지 ID가 들어 있음). 토큰은 `maskToken`으로 앞 6자 + `…`. 형식은 프리뷰 로그에서 필드 검색이 쉬운 **JSON 한 줄**로 결정.
- 교체 4곳: `logFetchError(stage, error, pageId)`(시그니처 변경), 항목 검증 실패, 견적서 검증 실패(`stage: 'validation'`, 경로 문자열 `issues`만), PDF 렌더링 실패(`stage: 'render'`). 010-A의 캐시 계층 오류(`stage: 'cache'`)도 같은 로거를 씁니다.
- **추가 발견**: 노션 SDK 기본 로거가 `@notionhq/client warn: request fail { message: 'Could not find page with ID: <전체 ID>...' }`를 출력해 전체 토큰이 로그에 남았습니다. `lib/notion.ts`의 `Client` 옵션 `logger`에 `notionSdkLogger`(level, 고정 event, code만)를 넣어 대체했습니다.
- `app/global-error.tsx`: `'use client'`, `<html lang="ko">`/`<body>`, `globals.css` 직접 import, React `<title>`, `retry` 버튼, 홈 이동은 전체 새로고침 `<a href="/">`. `StatusCard`를 재사용합니다. 다크 모드는 `useSyncExternalStore`로 `prefers-color-scheme`을 구독해 `<html class="dark">`를 붙이는 방식으로 결정 (공식 문서: global-error에는 앱 테마 클래스가 적용되지 않으며 기본 UI는 OS 설정을 따름). Geist 폰트 변수는 들어오지 않아 시스템 폰트로 표시됩니다.

404/500 문구 변경 목록

- `app/invoice/[token]/error.tsx` 제목: "견적서를 표시하지 못했습니다" → "견적서를 불러오지 못했습니다" (`/unavailable?reason=error`와 동일)
- PDF 라우트 500(조회 실패, `error` 사유): "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." → "견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
- PDF 라우트 500(렌더링 예외): "PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." 유지 (원인이 달라 구분)
- 신규 `global-error`: "페이지를 불러오지 못했습니다" + "일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요." (견적서 외 화면에서도 뜨므로 "페이지"로 표기)
- 유지: `app/not-found.tsx` "페이지를 찾을 수 없습니다", PDF 404 "견적서를 찾을 수 없습니다.", 410 "유효기간이 지난 견적서입니다."
- 500 계열 안내 문장은 모두 "일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요." 또는 "... 잠시 후 다시 시도해 주세요."로 통일

확인 (프로덕션 빌드, 정상 서버 3101 / 잘못된 키 서버 3102, `.env.local` 미수정, 시작 전 `.next/cache/fetch-cache` 삭제)

- 교체 전 로그(010-A 측정 중 관찰): `console.error`로 `APIResponseError` 전체(응답 헤더, `body` 원문, request_id)와 SDK 경고의 전체 페이지 ID가 출력됨.
- 3102 PDF: 500, 본문 "견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.". 로그 2줄:
  `{"level":"warn","scope":"notion-sdk","stage":"request","event":"request fail","code":"unauthorized"}`
  `{"level":"error","scope":"invoice-service","stage":"page","event":"노션 조회 실패","token":"41613c…","errorName":"APIResponseError","code":"unauthorized","status":401}`
- 3101 없는 ID PDF: 404 "견적서를 찾을 수 없습니다.", 로그 `code":"object_not_found","status":404`, 토큰 `000000…`.
- 로그 파일 2개와 500 응답 본문에서 API 키, 두 DB ID(대시 유무 모두), 전체 토큰 포함 횟수: 모두 0회 (스크립트로 횟수만 출력).
- Playwright MCP: 3102 `/invoice/<정상 토큰>` → `/unavailable?reason=error`, 제목 "견적서를 불러오지 못했습니다". 3101 없는 ID 화면 → "페이지를 찾을 수 없습니다".
- global-error: 루트 레이아웃에 쿠키 조건부 `throw` 임시 코드를 넣어 프로덕션 빌드로 확인 → 500, 제목 "페이지를 불러오지 못했습니다", HTML에 오류 message 없음, 375/1280px 스크린샷 정상, OS 다크 설정 시 `<html class="dark">` 적용. 쿠키 제거 후 "다시 시도" 클릭 → 홈 화면으로 복구. 임시 코드는 백업으로 원복하고 `git diff`에 남지 않음을 확인.
- 미확인: 노션 응답 검증 실패(validation_failed) 실제 로그 (실데이터가 정상이라 재현하지 않음, 012-A 테스트 대상).

### 011-B (2026-11-16)

구현

- `next.config.ts` `headers()`: `source: '/:path*'`에 `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- `lib/rate-limit.ts`(server-only): `createRateLimiter({ limit, windowMs })` 고정 윈도우, 윈도우마다 최대 1회 만료 항목 정리. `getClientIp`는 `x-forwarded-for` 첫 값 → `x-real-ip` → `'unknown'`.
- `app/invoice/[token]/pdf/route.ts`: 모듈 수준 `pdfRateLimiter`(1분 10회)로 접근 판정 전에 제한. 형식 오류·없는 토큰 요청도 횟수에 포함되어 PDF 경로로 토큰을 대량 시도하는 것도 늦춥니다.
- README "보안" 절에 헤더, CSP 미도입, CORS 정책, rate limit 한계(인스턴스 간 비공유, 재시작 시 초기화, 헤더 위조 가능성)를 기록.

확인 (프로덕션 빌드 `next start -p 3101`, curl)

- `/` 와 `/invoice/<정상 토큰>` 응답: 세 보안 헤더 확인.
- `/invoice/<정상 토큰>/pdf` (Origin: https://example.com): 200, `application/pdf`, 세 보안 헤더, `cache-control: no-store`, `Access-Control-*` 헤더 없음. `next.config.ts` 헤더가 Route Handler 응답에도 붙음을 확인 (가정 해소).
- PDF 연속 요청: 앞선 1회 포함 10회까지 200, 11번째부터 429. 429 응답: `retry-after: 59`, `cache-control: no-store`, 세 보안 헤더, 본문 "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
- 제한 중 `X-Forwarded-For: 203.0.113.7`로 보낸 요청은 200: 헤더 기준으로 IP를 나누는 것과, 프록시 없는 환경에서는 위조로 우회 가능하다는 한계를 함께 확인.
- 61초 대기 후 다시 200.
- 제한 중 화면 경로 5회: 모두 200.
- 429 본문, 응답 HTML, 서버 로그에서 API 키·두 DB ID 0회 (응답 HTML의 토큰 4회는 화면 URL과 PDF 링크라 정상).
- Playwright MCP: 정상 토큰 화면 표시(스타일 적용), PDF 다운로드 `invoice-INV-2026-011.pdf` 성공.
- 미확인: Vercel 프리뷰에서 헤더, 429, 실제 IP 헤더 값, 인스턴스 분산 시 편차 (012-B, 사용자 수행 필요).
