# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

노션 DB에 입력한 견적서를 클라이언트가 공유 링크(`/invoice/[token]`)로 조회하고 PDF로 내려받는 서비스입니다. (Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui)

## 기술 스택

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 6 (strict)
- Tailwind CSS v4, shadcn/ui (new-york), Radix UI, Lucide, next-themes
- Zod 4 (노션 응답과 환경변수 검증), @notionhq/client 5, @react-pdf/renderer 4
- 개발 도구: ESLint, Prettier, Husky, lint-staged, Vitest
- 폼 라이브러리와 Server Actions는 쓰지 않습니다. 공개 영역은 조회와 다운로드만 하고, 관리자 영역(Phase 5)은 일반 form과 URL 쿼리로 처리합니다. (react-hook-form 미설치)

## 문서

- `docs/PRD.md`: 요구사항 (기능 F001~F012)
- `docs/ROADMAP.md`: 단계별 진행 상황. 완료 시 ✅ 표시 (`/docs:update-roadmap`)
- `tasks/*.md`: 작업별 명세, 수락 기준, 테스트 결과
- `shrimp-rules.md`: 상세 개발 규칙

## 개발 명령어

```bash
npm run dev            # 개발 서버 (Turbopack, http://localhost:3000)
npm run build          # 프로덕션 빌드
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (lint:fix로 자동 수정)
npm run format:check   # Prettier 검사 (format으로 자동 수정)
npm run test           # Vitest 단위 테스트 (vitest run)
npm run check-all      # typecheck + lint + format:check + test (작업 후 권장)
npx shadcn@latest add [component-name]
```

- 단위 테스트는 Vitest(`tests/*.test.ts`, `vitest.config.mts`, node 환경)입니다. 노션 클라이언트·환경변수·`next/cache`를 모킹하므로 키와 네트워크가 필요 없습니다. 화면(async Server Component)은 dev 서버와 Playwright MCP로 확인합니다.
- `.husky/pre-commit`이 `lint-staged`(prettier, eslint)를 실행합니다.
- Prettier는 세미콜론 없음, 작은따옴표, `prettier-plugin-tailwindcss`(클래스 정렬, `cn`/`cva` 포함)를 사용합니다.

## 작업 완료 체크리스트

```bash
npm run check-all   # 타입, 린트, 포맷, 테스트 통과
npm run build       # 빌드 성공
```

UI나 라우트를 바꿨다면 Playwright MCP로 해당 페이지를 직접 확인합니다.

## 환경변수

`.env.example`을 `.env.local`로 복사해 채웁니다. `lib/env.ts`가 Zod로 검증합니다.

- `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID`
- 관리자 영역: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`(32자 이상). `getAdminEnv()`로 분리 검증하므로 없어도 공개 영역은 동작합니다.
- 값은 **database ID**입니다. data source ID가 아닙니다.
- API 키와 DB ID는 응답 HTML, PDF, 로그, 사용자 노출 에러 문구에 나오면 안 됩니다.

## 아키텍처

### 데이터 흐름

노션 → `lib/notion.ts`(서버 전용 클라이언트) → `lib/invoice-service.ts`(`getInvoiceByPageId`) → `lib/notion-parser.ts`(Zod 검증, 도메인 변환) → `lib/invoice-access.ts`(`getAccessibleInvoice`) → 페이지와 PDF 라우트가 공유.

- URL 토큰 = 노션 **페이지 ID**입니다. 공유 토큰 필드는 없습니다. 형식은 `lib/access.ts`의 `shareTokenSchema`로 검증합니다.
- 페이지가 견적서 DB 소속인지 `parent.database_id`로 확인합니다. 항목 DB는 `databases.retrieve`로 data source를 찾아(캐시) `dataSources.query`로 조회합니다. (@notionhq/client 5는 data source 기반 API)
- 금액은 노션 값을 쓰지 않고 `수량 x 단가`로 재계산하며, 합계는 항목 금액 합계입니다. **부가세 없음**. (`lib/invoice-calculations.ts`)
- 날짜는 KST 기준 문자열로 비교합니다. 만료는 `validUntil < 오늘(KST)`입니다.
- 조회 실패는 `InvoiceFetchError`(not_found / query_failed / validation_failed)이고, 접근 판정 사유는 invalid / not_found / expired / error입니다 (`types/invoice-error.ts`).
- 캐시: `getInvoiceByPageId`가 조회 **성공 결과만** `unstable_cache`로 30초(`INVOICE_CACHE_TTL_SECONDS`) 캐시합니다. 실패(not_found, query_failed, validation_failed)는 캐시하지 않고, 토큰 형식 검증과 만료 판정은 캐시 밖(`getAccessibleInvoice`)에서 매 요청 수행합니다. TTL을 넘긴 stale 값은 쓰지 않고 직접 재조회합니다. 노션 fetch 자체는 `no-store`이며 `cacheComponents`는 쓰지 않습니다.

### 라우트 동작

- `app/(site)/invoice/[token]/page.tsx`: not_found → `notFound()`, 그 외 실패 → `redirect('/unavailable?reason=...')`.
- `app/(site)/invoice/[token]/pdf/route.ts`: 같은 판정을 쓰고 실패 시 404(invalid, not_found) / 410(expired) / 500(error)을 텍스트로, `Cache-Control: no-store`로 응답합니다. 판정 전에 IP당 1분 10회 인메모리 제한(초과 시 429 + `Retry-After`)을 겁니다. `proxy.ts`는 쓰지 않습니다. (Proxy에서 전역 상태 의존 금지)
- 보안 헤더(`Referrer-Policy: no-referrer`, `X-Content-Type-Options`, `X-Frame-Options: DENY`)는 `next.config.ts`의 `headers()`에서 붙입니다. CSP와 CORS 허용 헤더는 넣지 않습니다.
- 다운로드 버튼은 `<a>` 링크이고 `download` 속성이 없습니다. 실패 문구를 화면에 보여주기 위해서입니다.
- `loading.tsx` 스트리밍 때문에 curl은 항상 200으로 보입니다. 리다이렉트는 브라우저(Playwright)로 확인해야 합니다.
- 동적 라우트의 `params`는 Promise입니다.

### PDF

- `@react-pdf/renderer`의 `renderToBuffer`에는 Document 요소가 필요해서 `InvoicePdfDocument({ invoice, totals })`를 직접 호출합니다. (`createElement`로 감싸면 타입 에러)
- 한글 폰트는 `assets/fonts`의 Noto Sans KR OTF를 `lib/pdf/fonts.ts`에서 `process.cwd()` 기준으로 등록합니다. 파일 추적은 Next가 자동 포함하므로 별도 설정이 없습니다.
- PDF 색상은 다크 모드와 무관하게 `StyleSheet`에 고정합니다.

### 서버 전용 코드

`lib/notion.ts`, `lib/invoice-service.ts`, `lib/invoice-access.ts`, `lib/pdf/fonts.ts`, `lib/logger.ts`, `lib/rate-limit.ts`, `lib/auth/*`, `lib/invoice-list-service.ts`는 `server-only`를 import합니다. 클라이언트 컴포넌트에서 가져오지 마세요.

### 관리자 영역 (Phase 5)

- `/admin/login`(로그인 화면) → `POST /admin/session`(`app/admin/session/route.ts`, intent=login|logout) → `/admin`(대시보드). 같은 경로에 page와 route를 둘 수 없어 처리 경로를 분리했습니다.
- 세션은 HMAC 서명 쿠키(`lib/auth/session.ts`, path=/admin, 8시간). `app/admin/(protected)/layout.tsx`와 각 페이지가 `requireAdminSession()`으로 검증합니다.
- 공개 영역은 라우트 그룹 `app/(site)/`(Navbar/Footer), 관리자는 `app/admin/`(noindex, `Cache-Control: no-store`)입니다. 루트 레이아웃에는 html/body/테마 프로바이더만 있습니다.
- 관리자 틀은 `components/admin/admin-shell.tsx`입니다. 데스크톱(md 이상)은 좌측 사이드바(대시보드, 견적서 관리, 클라이언트 관리, 테마, 로그아웃), 모바일은 상단 헤더 + Sheet 드로어입니다. 메뉴 정의는 `admin-nav-items.ts` 한 곳입니다.
- 견적서 상세 `/admin/invoices/[id]`: 공개 화면 컴포넌트(`InvoiceView`)를 재사용하고(`pdfHref`, `showInquiryNote` 옵션), 목록의 검색·정렬·페이지 쿼리를 그대로 이어받아 "목록으로"가 보던 상태로 돌아갑니다. 조회는 `getAdminInvoice`(`lib/invoice-access.ts`)로, 토큰 형식·견적서 DB 소속 확인은 공개와 같고 **만료 판정만 건너뜁니다**(만료 안내 배너 표시). 공개 `getAccessibleInvoice`는 그대로 만료를 차단합니다.
- 관리자 PDF `/admin/invoices/[id]/pdf`(route.ts): 세션이 없으면 401(텍스트), 만료와 무관하게 내려받습니다. 렌더링과 헤더는 `lib/pdf/invoice-pdf-response.ts`(`renderInvoicePdfResponse`, `textResponse`)를 공개 PDF 라우트와 공유합니다. 다운로드 버튼은 `<a>`(download 속성 없음)라 실패 시 텍스트 응답이 그대로 보입니다.
- 화면: `/admin`(요약 카드, 상태별 현황, 최근 견적서 5건, 최근 활동), `/admin/invoices`(검색, 필터, 정렬, 10개 페이지), `/admin/clients`(클라이언트 집계, 검색, 정렬, 페이지). 모든 상태는 URL 쿼리입니다.
- 데이터는 `getInvoiceSummaries()`(30초 캐시) 하나를 세 화면이 공유해 노션 호출이 늘지 않습니다. 목록 조회: 견적서 DB + 항목 DB를 각각 cursor로 한 번씩 읽고 합계는 수량 x 단가로 재계산합니다.
- 순수 로직(노션과 env 비의존, Vitest): `lib/invoice-list-query.ts`(필터 → 정렬 → 페이지), `lib/client-summary.ts`(클라이언트명 공백, 대소문자 정리 후 집계), `lib/client-list-query.ts`, `lib/admin-dashboard.ts`(상태별 집계, 만료/임박(7일), 최근 활동), `lib/relative-time.ts`(KST 절대, 상대 시간).
- 최근 활동은 별도 로그 저장소 없이 노션 `created_time`(생성), `last_edited_time`(생성 후 1분 넘게 지난 수정)으로 만듭니다. 그래서 노션에서 상태만 바꿔도 "수정"으로 보이고 이력은 최신 1회만 남습니다.
- 클라이언트 관리는 별도 노션 DB 없이 견적서의 `clientName` 집계입니다. 이름이 바뀌면 다른 클라이언트로 집계됩니다.

### UI

- `components/ui/`는 shadcn/ui(New York, RSC), `components/invoice/`는 견적서 화면, `components/pdf/`는 PDF 템플릿입니다.
- 모든 컨테이너는 `lib/site.ts`의 `containerWidthClass`(`mx-auto w-full max-w-3xl px-4`)를 씁니다.
- Tailwind v4: `tailwind.config`가 없고 `app/globals.css`의 `@theme inline`에서 설정합니다. 다크 모드는 `next-themes`(class 방식)이고 색상은 OKLCH입니다.
- 사용자에게 보이는 에러 화면에는 노션 에러 원문을 노출하지 않습니다. 원인은 서버 로그에만 남깁니다.
- 서버 로그는 `lib/logger.ts`의 `logServerError`(JSON 한 줄: scope, stage, code, status, 토큰 앞 6자)로만 남기고 오류 객체를 `console.error`로 통째로 출력하지 않습니다. 노션 SDK 내부 로그도 `notionSdkLogger`로 대체했습니다.
- 루트 레이아웃 오류는 `app/global-error.tsx`가 처리합니다. (자체 html/body, `globals.css` 직접 import, OS 다크 모드)

## 규칙

- Next.js 16은 기존 지식과 다른 점이 많습니다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 관련 가이드를 확인하세요. (`AGENTS.md` 참고)
- 별칭: `@/*` → 프로젝트 루트 (`@/components`, `@/lib` 등)
- `any` 금지, 들여쓰기 2칸, 주석·문서·커밋 메시지는 한국어 (변수명과 함수명은 영어)
- 화면 하단 문구 "부가세는 별도로 청구됩니다"는 사용자 요청으로 그대로 둡니다.
