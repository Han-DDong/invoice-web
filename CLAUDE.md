# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

노션 DB에 입력한 견적서를 클라이언트가 공유 링크(`/invoice/[token]`)로 조회하고 PDF로 내려받는 서비스입니다. (Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui)

## 기술 스택

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 6 (strict)
- Tailwind CSS v4, shadcn/ui (new-york), Radix UI, Lucide, next-themes
- Zod 4 (노션 응답과 환경변수 검증), @notionhq/client 5, @react-pdf/renderer 4
- 개발 도구: ESLint, Prettier, Husky, lint-staged
- 폼 라이브러리와 Server Actions는 쓰지 않습니다. 이 서비스는 조회와 다운로드만 합니다. (react-hook-form 미설치)

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
npm run check-all      # typecheck + lint + format:check (작업 후 권장)
npx shadcn@latest add [component-name]
```

- 테스트 러너는 아직 없습니다 (Task 012 예정). 동작 확인은 dev 서버와 Playwright MCP로 합니다.
- `.husky/pre-commit`이 `lint-staged`(prettier, eslint)를 실행합니다.
- Prettier는 세미콜론 없음, 작은따옴표, `prettier-plugin-tailwindcss`(클래스 정렬, `cn`/`cva` 포함)를 사용합니다.

## 작업 완료 체크리스트

```bash
npm run check-all   # 타입, 린트, 포맷 통과
npm run build       # 빌드 성공
```

UI나 라우트를 바꿨다면 Playwright MCP로 해당 페이지를 직접 확인합니다.

## 환경변수

`.env.example`을 `.env.local`로 복사해 채웁니다. `lib/env.ts`가 Zod로 검증합니다.

- `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID`
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
- 캐시는 쓰지 않습니다. 항상 최신을 조회하고, 캐싱은 Task 010에서 다룹니다.

### 라우트 동작

- `app/invoice/[token]/page.tsx`: not_found → `notFound()`, 그 외 실패 → `redirect('/unavailable?reason=...')`.
- `app/invoice/[token]/pdf/route.ts`: 같은 판정을 쓰고 실패 시 404(invalid, not_found) / 410(expired) / 500(error)을 텍스트로, `Cache-Control: no-store`로 응답합니다.
- 다운로드 버튼은 `<a>` 링크이고 `download` 속성이 없습니다. 실패 문구를 화면에 보여주기 위해서입니다.
- `loading.tsx` 스트리밍 때문에 curl은 항상 200으로 보입니다. 리다이렉트는 브라우저(Playwright)로 확인해야 합니다.
- 동적 라우트의 `params`는 Promise입니다.

### PDF

- `@react-pdf/renderer`의 `renderToBuffer`에는 Document 요소가 필요해서 `InvoicePdfDocument({ invoice, totals })`를 직접 호출합니다. (`createElement`로 감싸면 타입 에러)
- 한글 폰트는 `assets/fonts`의 Noto Sans KR OTF를 `lib/pdf/fonts.ts`에서 `process.cwd()` 기준으로 등록합니다. 파일 추적은 Next가 자동 포함하므로 별도 설정이 없습니다.
- PDF 색상은 다크 모드와 무관하게 `StyleSheet`에 고정합니다.

### 서버 전용 코드

`lib/notion.ts`, `lib/invoice-service.ts`, `lib/invoice-access.ts`, `lib/pdf/fonts.ts`는 `server-only`를 import합니다. 클라이언트 컴포넌트에서 가져오지 마세요.

### UI

- `components/ui/`는 shadcn/ui(New York, RSC), `components/invoice/`는 견적서 화면, `components/pdf/`는 PDF 템플릿입니다.
- 모든 컨테이너는 `lib/site.ts`의 `containerWidthClass`(`mx-auto w-full max-w-3xl px-4`)를 씁니다.
- Tailwind v4: `tailwind.config`가 없고 `app/globals.css`의 `@theme inline`에서 설정합니다. 다크 모드는 `next-themes`(class 방식)이고 색상은 OKLCH입니다.
- 사용자에게 보이는 에러 화면에는 노션 에러 원문을 노출하지 않습니다. 원인은 서버 로그에만 남깁니다.

## 규칙

- Next.js 16은 기존 지식과 다른 점이 많습니다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 관련 가이드를 확인하세요. (`AGENTS.md` 참고)
- 별칭: `@/*` → 프로젝트 루트 (`@/components`, `@/lib` 등)
- `any` 금지, 들여쓰기 2칸, 주석·문서·커밋 메시지는 한국어 (변수명과 함수명은 영어)
- 화면 하단 문구 "부가세는 별도로 청구됩니다"는 사용자 요청으로 그대로 둡니다.
