# Task 012: 테스트 및 배포 준비 (012-A, 012-B)

> 상태: 012-A 완료, 012-B 배포 확인 완료 (2026-11-16, Vercel `invoice-web-two-wine.vercel.app`, curl 기준). 한글 PDF 육안 확인 완료(사용자). 브라우저 수동 체크(Safari, Firefox, iOS, Android)는 **사용자 수행 필요**

## 결정 사항 (2026-11-16, 사용자 지시 기준)

- [x] **Vitest 도입 승인** (012-A): **승인** (사용자가 012-A 실행을 요청해 도입 승인으로 간주). `shrimp-rules.md` 6절과 8절에 따라 테스트 러너는 사용자 요청 없이 도입하지 않습니다. 승인 전에는 설치하지 않습니다.
- [x] **`test` 스크립트를 `check-all`에 포함할지** (012-A): **포함**. 전체 55개 테스트가 약 0.5초라 검사 시간 증가가 미미하고, 작업 후 체크리스트 한 줄로 회귀를 잡을 수 있기 때문입니다. 포함하면 작업 후 검사 시간이 늘어납니다.
- [x] **CI 포함 여부** (012-B): **만들지 않음, 후속 과제**. `.github/workflows`가 아직 없습니다. 추가하면 push/PR마다 `check-all`, `build`, `test`를 실행합니다.
- [x] **배포 대상** (012-B): **Vercel** (기본안). 011-B에서 `proxy.ts`를 쓰지 않기로 해 플랫폼 의존이 줄었습니다. 기본안은 Vercel. 다른 플랫폼이면 `proxy.ts`(011-B)와 폰트 파일 추적 확인 방법이 달라집니다.

## 명세서

### 012-A: 테스트 러너 도입과 핵심 로직 테스트

Task 009-1에서 실데이터가 없어 확인하지 못한 3건(만료 PDF 410, 항목 0건, 항목 100건 초과 페이지네이션)을 노션 클라이언트 모킹 테스트로 해소하고, 순수 함수와 PDF 라우트 상태코드 매핑을 회귀 테스트로 고정합니다.

- **설치 (승인 후)**: `vitest`, `vite-tsconfig-paths`를 devDependencies로 추가합니다. 컴포넌트 테스트는 범위 밖이므로 `jsdom`, `@testing-library/*`, `@vitejs/plugin-react`는 설치하지 않습니다.
- **설정 (`vitest.config.mts`, 신규)**
  - `environment: 'node'`
  - `@/*` 별칭: `vite-tsconfig-paths`로 `tsconfig.json`의 paths를 따릅니다.
  - `server-only` 별칭: `lib/notion.ts`, `lib/invoice-service.ts`, `lib/invoice-access.ts`, `lib/pdf/fonts.ts`가 `import 'server-only'`를 하므로 테스트에서는 빈 모듈로 대체합니다.
  - 010-A 이후 `getInvoiceByPageId`가 `next/cache`의 `unstable_cache`를 쓰면, 테스트에서는 `unstable_cache`를 그대로 함수를 호출하는 모킹으로 바꿉니다. (Next 캐시 저장소가 없는 환경이므로)
- **`package.json` 스크립트**: `test`(`vitest run`) 추가.
- **테스트 대상** (2026-11-16 코드 기준 실제 존재 확인)
  - `lib/invoice-calculations.ts`: `calculateItemAmount`, `calculateInvoiceTotals` (합계 = 항목 금액 합계, 부가세 없음, CSV 예시 합계 60,000,000)
  - `lib/notion-parser.ts`: `formatKstDate`, `normalizeNotionDate`, `parseNotionItem`, `parseNotionItems`, `parseNotionInvoice` (Formula `amount` 무시하고 수량 x 단가 재계산, 필수 속성 누락 시 실패)
  - `lib/invoice-access.ts`: `isInvoiceExpired`(당일 유효, 전날 만료), `getKstToday`(UTC 15시 경계), `getAccessibleInvoice`(invalid → not_found → expired → error 순서)
  - `lib/access.ts`: `shareTokenSchema`(16~128자, 영문/숫자/`-`/`_`), `parseUnavailableReason`
  - `toSafeFileName`: 현재 `app/invoice/[token]/pdf/route.ts` 안의 비공개 함수입니다. 테스트하려면 `lib/` 아래(예: `lib/pdf/file-name.ts`)로 옮겨 export해야 합니다. Route Handler 파일에 HTTP 메서드 외 export를 추가하는 것보다 분리가 안전하다고 판단합니다. (추론, 구현 시 확인)
  - `lib/invoice-service.ts` `getInvoiceByPageId` (`getNotionClient`, `getServerEnv` 모킹)
    - 정상: 페이지 + 항목 → `Invoice`
    - 항목 0건: `items: []`, 합계 0
    - 항목 100건 초과: `has_more`/`next_cursor`로 2회 이상 `dataSources.query` 호출, 모든 항목 수집
    - 다른 DB 페이지(`parent.database_id` 불일치) → `not_found`
    - 휴지통/보관 페이지(`in_trash`, `archived`) → `not_found`
    - 노션 `object_not_found` → `not_found`, 그 외 오류 → `query_failed`, 검증 실패 → `validation_failed`
    - 모듈 수준 캐시(`itemDataSourceIdPromise`, 010-A 캐시)가 테스트 사이에 남지 않도록 `vi.resetModules` 등으로 격리합니다.
  - `app/invoice/[token]/pdf/route.ts` `GET` 상태코드 매핑 (`getAccessibleInvoice` 모킹): invalid 404, not_found 404, expired 410, error 500, 정상 200 + `application/pdf` + `Content-Disposition` + `Cache-Control: no-store`, 렌더링 예외 시 500. `renderToBuffer`와 `registerPdfFonts`는 모킹해 폰트 파일 없이 실행합니다.

설계 근거 (공식 문서로 확인한 사실, `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`):

- Vitest는 `async` Server Component를 지원하지 않으므로 해당 컴포넌트는 E2E 테스트를 권장합니다. 이 작업은 순수 함수, 서비스, Route Handler만 단위 테스트하고 화면은 기존처럼 Playwright MCP로 확인합니다.
- 문서의 수동 설정은 `vitest.config.mts`에서 `vite-tsconfig-paths` 플러그인으로 경로 별칭을 처리합니다.

### 012-B: 배포 준비

- **Vercel 설정**: 프레임워크 자동 감지로 충분한지 확인하고, `vercel.json`은 필요할 때만 추가합니다. 빌드 명령은 `package.json`의 `build`(`next build --turbopack`).
- **환경변수**: `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID` 3개를 Development / Preview / Production에 각각 설정하는 방법을 README에 문서화합니다. 값은 **database ID**이며 data source ID가 아닙니다. 프리뷰와 프로덕션이 같은 노션 DB를 쓸지 여부도 기록합니다. `NEXT_PUBLIC_` 접두사는 쓰지 않습니다.
- **폰트 번들 포함 확인**: `lib/pdf/fonts.ts`가 `path.join(process.cwd(), 'assets', 'fonts')`로 OTF를 읽으므로, 프리뷰 배포에서 PDF가 정상 생성되는지 확인합니다. 누락되면 `next.config.ts`에 `outputFileTracingIncludes`를 추가합니다.
  - 근거 (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`): 키는 picomatch로 매칭하는 라우트 경로 glob, 값은 프로젝트 루트 기준 파일 glob입니다. 대괄호가 있는 동적 세그먼트는 문서 예시처럼 이스케이프가 필요합니다. (예상 형태: 키 `'/invoice/\\[token\\]/pdf'`, 값 `['./assets/fonts/**/*']`, 구현 시 확인)
- **011-B 확인 항목**: 프리뷰 배포에서 보안 헤더, rate limit 429, IP 헤더(`x-forwarded-for` 등) 값을 확인합니다.
- **010-A 확인 항목**: 프리뷰 배포에서 캐시 적중 여부와 응답 시간을 측정합니다.
- **브라우저 PDF 수동 체크리스트**: Chromium 외 Safari(macOS), Firefox, iOS Safari, Android Chrome에서 다운로드 버튼(`download` 속성 없는 `<a>` 링크) 동작과 파일명, 한글 표시를 확인합니다.
- **CI (사용자 확인 후)**: `.github/workflows/ci.yml`에서 `npm ci` → `npm run check-all` → `npm run test`(012-A 도입 시) → `npm run build`. `lib/env.ts`와 `lib/notion.ts`는 첫 호출 시점에 환경변수를 검증하므로 빌드에는 노션 키가 필요 없는지 CI에서 확인합니다.
- **마무리**: `docs/ROADMAP.md` Phase 4와 MVP 체크리스트 완료 표시, 진행 상황 줄 갱신.

## 관련 파일

- `package.json` - `vitest`, `vite-tsconfig-paths`, `test` 스크립트 (012-A, 승인 시)
- `vitest.config.mts` - 테스트 설정 (012-A, 신규)
- `lib/**/*.test.ts` 또는 `tests/` - 테스트 파일 (012-A, 위치는 구현 시 결정 후 README에 기록)
- `lib/pdf/file-name.ts` - `toSafeFileName` 분리 (012-A, 신규 예정)
- `app/invoice/[token]/pdf/route.ts` - `toSafeFileName` import로 변경 (012-A)
- `next.config.ts` - 필요 시 `outputFileTracingIncludes` (012-B)
- `.github/workflows/ci.yml` - CI (012-B, 승인 시)
- `README.md` - 기술 스택(Vitest), 테스트 명령, 배포와 환경변수 절차, 폴더 구조
- `CLAUDE.md` - "테스트 러너는 아직 없습니다" 서술 갱신
- `shrimp-rules.md` - 6절 테스트 러너 서술 갱신 (도입 승인 시)
- `tasks/009-1-core-integration-test.md` - 미확인 3건 해소 결과 연결
- `docs/ROADMAP.md` - Phase 4 완료 표시

## 수락 기준

### 012-A

- [x] Vitest 도입을 사용자에게 승인받음
- [x] `npm run test`가 로컬에서 노션 키 없이 통과
- [x] 순수 함수(`invoice-calculations`, `notion-parser`, `isInvoiceExpired`, `shareTokenSchema`, `toSafeFileName`) 테스트 작성
- [x] `getInvoiceByPageId` 모킹 테스트: 항목 0건, 100건 초과 페이지네이션, 다른 DB 페이지, 휴지통 페이지, 오류 유형별 매핑
- [x] PDF 라우트 상태코드 매핑 테스트: 404 / 410 / 500 / 200
- [x] 009-1 미확인 3건(만료 410, 항목 0건, 100건 초과)이 테스트로 확인되었음을 009-1과 ROADMAP에 연결 (실데이터 확인이 아님을 명시)
- [x] `any` 없이 `npm run check-all`, `npm run build` 통과

### 012-B

- [ ] 프리뷰 배포에서 정상 견적서 화면과 PDF가 동작 (한글 폰트 포함) — 사용자 수행 필요 (로컬 standalone 패키지로는 확인)
- [x] 환경변수 3개와 환경별 설정 방법이 README에 문서화됨
- [ ] 프리뷰 배포 응답 헤더에 011-B 보안 헤더가 있고, 응답과 로그에 키와 DB ID가 없음 — 사용자 수행 필요 (로컬 프로덕션에서는 확인)
- [x] Chromium 외 브라우저 PDF 수동 체크리스트 결과 기록 (확인하지 못한 브라우저는 미확인으로 표기) — Safari, Firefox, iOS Safari, Android Chrome 모두 미확인으로 기록
- [x] CI 포함 여부 결정 결과 기록 (미포함, 후속 과제)
- [x] ROADMAP Phase 4 완료 표시 (브라우저 수동 체크는 미확인 항목으로 남김)

## 구현 단계

### 012-A

- [x] Vitest 도입 승인 확인
- [x] 패키지 설치, `vitest.config.mts`, `test` 스크립트 추가
- [x] `toSafeFileName`을 `lib/`로 분리
- [x] 순수 함수 테스트 작성
- [x] 노션 클라이언트 모킹 픽스처 작성 (견적서 페이지, 항목 페이지, 페이지네이션 응답)
- [x] `getInvoiceByPageId`, `getAccessibleInvoice` 테스트 작성
- [x] PDF 라우트 테스트 작성
- [x] README, CLAUDE.md, shrimp-rules, 009-1 동기화

### 012-B

- [x] 배포 대상과 CI 포함 여부 확인 (Vercel, CI 미포함)
- [x] Vercel 프로젝트 연결, 환경변수 설정 (사용자 작업) — 완료, `main` 배포 동작 확인
- [x] 배포 환경에서 화면, PDF, 헤더, rate limit 확인 (curl). 캐시 적중은 응답 시간만 확인(0.52~0.66s)해 미확인
- [x] 필요 시 `outputFileTracingIncludes` 추가 후 재배포 확인 — 로컬 추적 결과 불필요로 판단, 미추가 (프리뷰에서 최종 확인)
- [ ] 브라우저 수동 체크리스트 진행 — 사용자 수행 필요 (README 체크리스트)
- [ ] (승인 시) CI 워크플로 추가 — 해당 없음 (미승인, 후속 과제)
- [x] README 배포 절차 작성 (ROADMAP Phase 4 완료 표시는 프리뷰 확인 후)

## 테스트 체크리스트

### 012-A

- [x] `npm run test` 전체 통과, 노션 네트워크 호출 없음 (`getNotionClient` 모킹)
- [x] `isInvoiceExpired('2026-11-16', '2026-11-16')` → false, `isInvoiceExpired('2026-11-15', '2026-11-16')` → true
- [x] `getKstToday(new Date('2026-11-16T14:59:59Z'))` → `2026-11-16`, `getKstToday(new Date('2026-11-16T15:00:00Z'))` → `2026-11-17`
- [x] `shareTokenSchema`: 15자 실패, 16자 성공, 129자 실패, `/` 포함 실패
- [x] 항목 150건 픽스처 → `dataSources.query` 2회 호출, 항목 150건, 합계 일치
- [x] PDF 라우트 expired 모킹 → 410, 본문 "유효기간이 지난 견적서입니다."
- [x] Playwright MCP 회귀: 정상 토큰 화면, `/invoice/short` → `/unavailable?reason=invalid`, 없는 ID → 404 화면, PDF 다운로드

### 012-B

- [x] `curl -sSI https://<프리뷰 도메인>/invoice/<정상 토큰>/pdf` → 200, `application/pdf`, 보안 헤더 3개, `Cache-Control: no-store` (2026-11-16 확인)
- [x] `curl -sS -o /dev/null -w '%{http_code}\n' https://<프리뷰 도메인>/invoice/short/pdf` → 404 (없는 ID도 404)
- [ ] Playwright MCP: 프리뷰 도메인에서 정상 토큰 화면 → PDF 버튼 → 다운로드, 375 / 1280px 화면 확인
- [x] 배포 PDF를 열어 한글(클라이언트명, 항목명) 정상 표시 확인 (사용자 육안 확인, 폰트 번들 포함 증거)
- [x] rate limit: PDF 14회 연속 요청 → 200 x10, 429 x4, `retry-after: 51` (이 측정에서는 편차 없음, 1회 측정)
- [ ] 브라우저 수동: Safari(macOS), Firefox, iOS Safari, Android Chrome 각각 다운로드 파일명 `invoice-<견적서 번호>.pdf`, 실패 시 문구 표시

## 테스트 결과

### 012-A (2026-11-16)

구성

- devDependencies: `vitest`(5.1.0)만 추가. `vite-tsconfig-paths`는 설치 후 Vitest가 "Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option" 안내를 출력해 제거하고 `resolve.tsconfigPaths: true`로 대체했습니다. (명세와 다른 결정, 의존성 1개 감소) `jsdom`, `@testing-library/*`, `@vitejs/plugin-react`는 설치하지 않음.
- `vitest.config.mts`: `environment: 'node'`, `include: ['tests/**/*.test.ts']`, `server-only` → `tests/stubs/server-only.ts`, `mockReset`/`restoreMocks`.
- 스크립트: `test`(`vitest run`), `test:watch`(`vitest`), `check-all`에 `npm run test` 추가.
- 테스트 위치: `tests/` (README 폴더 구조에 기록). 픽스처 `tests/fixtures/notion.ts`(가짜 ID, 실제 키·DB ID 아님).
- `toSafeFileName`을 `lib/pdf/file-name.ts`로 분리하고 PDF 라우트는 import로 변경 (Route Handler 파일에 HTTP 메서드 외 export를 추가하지 않기 위해).
- `getInvoiceByPageId` 테스트는 `next/cache`의 `unstable_cache`를 "성공만 저장 + revalidate 경과 시 지난 값 반환 후 백그라운드 갱신"을 흉내 내는 메모리 구현으로 모킹해 010-A 캐시 동작까지 검증합니다.

결과: `npm run test` 6개 파일, 55개 테스트 통과 (약 0.5초). `getNotionClient`, `getServerEnv`를 모킹해 노션 네트워크 호출과 키가 필요 없습니다.

- `tests/pure-functions.test.ts`: 합계(60,000,000, 부가세 없음, 0건 0), `shareTokenSchema` 15/16/128/129자와 허용 문자, `parseUnavailableReason`, `toSafeFileName`
- `tests/notion-parser.test.ts`: KST 경계, 날짜 정규화, Formula 금액 무시, 수량/단가/필수 속성 누락, 상태 값 검증
- `tests/invoice-access.test.ts`: `isInvoiceExpired` 당일/전날, `getKstToday` UTC 15시 경계, 판정 순서(invalid는 조회 없음 → not_found → error), 같은 견적서도 KST 자정을 넘기면 expired
- `tests/invoice-service.test.ts`: 정상 변환, 항목 0건, 150건 페이지네이션(2회 조회, 커서 전달, 합계 15,000), 형식 오류 시 API 미호출, 다른 DB / 휴지통 / 보관 → not_found, object_not_found → not_found, 그 외 → query_failed, 항목 단계 오류, 항목·견적서 검증 실패, 로그에 code/status/토큰 앞 6자만 있고 전체 ID·응답 본문·키 없음, 캐시(TTL 안 1회 조회, 대시 유무 같은 키, 실패 비캐시, TTL 경과 후 휴지통 이동 반영)
- `tests/pdf-route.test.ts`: invalid/not_found 404, expired 410, error 500, 정상 200 + `application/pdf` + 파일명 + `no-store`, 렌더링 예외 500(원문 미노출), 같은 IP 11번째 429 + `Retry-After` + 접근 판정 미호출, 다른 IP 영향 없음
- `tests/rate-limit.test.ts`: 윈도우 내 허용/초과, 윈도우 경과, 키 분리, IP 헤더 우선순위

검증: `npm run check-all`(타입, 린트, 포맷, 테스트) 통과, `npm run build` 통과. Playwright MCP 회귀(프로덕션 3101): 정상 토큰 화면, PDF 다운로드 `invoice-INV-2026-011.pdf`, `/invoice/short` → `/unavailable?reason=invalid`("잘못된 링크입니다"), 없는 ID → "페이지를 찾을 수 없습니다".

009-1 미확인 3건(만료 410, 항목 0건, 100건 초과)은 **모킹 테스트로 확인**했으며 실데이터 확인은 아닙니다. (`tasks/009-1-core-integration-test.md` "후속 해소" 절에 연결)

### 012-B (2026-11-16, 로컬 준비까지. 실제 배포·외부 서비스 연결은 하지 않음)

- `next.config.ts` 점검: 보안 헤더 `headers()`만 있음. `vercel.json` 불필요(프레임워크 자동 감지, `build` 스크립트 사용).
- 폰트 파일 추적: `npm run build` 후 `.next/server/app/invoice/[token]/pdf/route.js.nft.json`에 `assets/fonts/NotoSansKR-Regular.otf`, `NotoSansKR-Bold.otf`, `OFL.txt` 포함 확인 → `outputFileTracingIncludes` 미추가.
- 배포 패키징 근사 확인: `next.config.ts`에 임시로 `output: 'standalone'`을 넣어 빌드 → `.next/standalone/assets/fonts/`에 폰트 3개 복사 확인 → standalone 서버(3103, 추적된 파일만 있는 폴더)에서 PDF 200, 67,049B, `/FontName ...NotoSansKR-Bold`, `...NotoSansKR-Regular` 임베드, 보안 헤더와 `no-store` 확인, `/invoice/short/pdf` 404. 확인 후 설정 원복, `.next/standalone` 삭제, 재빌드. (Vercel은 standalone이 아니지만 같은 파일 추적 결과를 씁니다. 추론)
- 노션 키 없이 빌드: 키 3개를 빈 값 환경변수로 덮어쓴 `npm run build` 성공 (`.env.local` 미수정). 배포·CI 빌드에 키가 필요 없음.
- 문서: README "배포 (Vercel)" 절(환경변수 3개 × 3환경, database ID, `NEXT_PUBLIC_` 금지, 프리뷰/프로덕션 같은 DB 기본안, 폰트·캐시·CI·브라우저 체크리스트), `.env.example` Vercel 설정 주석.
- 검증: `npm run check-all`, `npm run build` 통과.

사용자 수행 필요 (미확인)

- Vercel 프로젝트 연결, 환경변수 설정, 프리뷰 배포
- 프리뷰에서: 화면과 PDF(한글), 보안 헤더, `/invoice/short/pdf` 404, rate limit 429와 인스턴스 분산 편차, 실제 IP 헤더(`x-forwarded-for`) 동작, 010-A 캐시 적중과 응답 시간, 375/1280px 화면
- 브라우저 수동 체크: Safari(macOS), Firefox, iOS Safari, Android Chrome (모두 미확인)
- 위 확인 후 ROADMAP Phase 4와 MVP 체크리스트 "PDF 다운로드가 모든 환경에서 작동함" 완료 표시
