# Development Guidelines

> 이 문서는 AI Agent 전용 작업 규칙입니다. 프로젝트 고유 규칙만 기술합니다.

## 1. 프로젝트 개요

- 목적: 노션 DB의 견적서를 **공유 토큰 링크**로 웹 조회하고 PDF로 다운로드하는 서비스
- 스택: Next.js **16** (App Router, Turbopack) / React 19 / TypeScript strict / Tailwind CSS **v4** / shadcn/ui (new-york) / Zod 4 / @notionhq/client / @react-pdf/renderer / next-themes / npm
- 노션 = CMS. 별도 DB·인증·관리자 페이지 없음 (MVP 범위 밖)

### 1.1 정보 출처 우선순위 (충돌 시 위에서 아래 순서로 따른다)

| 순위 | 출처 | 비고 |
| --- | --- | --- |
| 1 | 실제 코드 (`app/`, `lib/`, `types/`, `components/`) | 최우선 |
| 2 | `.env.example`, `README.md`, `package.json` | 코드와 동기화된 문서 |
| 3 | `CLAUDE.md` (프로젝트) | 일부 구버전 서술 있음 |
| 4 | `docs/PRD.md`, `docs/ROADMAP.md` | **구버전 설계 포함. 참고용** |

- **PRD/ROADMAP의 다음 내용은 폐기된 설계이므로 따르지 않는다**
  - `/invoice/[notionPageId]` → 실제는 `/invoice/[token]`
  - `NOTION_DATABASE_ID` → 실제는 `NOTION_INVOICE_DATA_SOURCE_ID`, `NOTION_ITEM_DATA_SOURCE_ID`
  - `/api/generate-pdf` (POST) → 실제 계획은 `app/invoice/[token]/pdf/route.ts`
  - 상태값 `대기/승인/거절` → 실제는 `draft | published | expired`
- **ROADMAP의 ✅ 표시를 구현 완료 증거로 믿지 않는다.** 구현 여부는 코드로 확인한다
- 현재 미구현 (TODO): 노션 조회(F001), 견적서 상세 UI(F002), PDF 다운로드(F003) — `app/invoice/[token]/page.tsx`의 TODO 주석 참조

## 2. 프로젝트 아키텍처

| 경로 | 역할 |
| --- | --- |
| `app/page.tsx` | 홈 (서비스 소개 전용, 견적서 목록 노출 금지) |
| `app/invoice/[token]/page.tsx` | 견적서 상세 (토큰 링크로만 진입) |
| `app/unavailable/page.tsx` | 접근 불가 안내 (`?reason=`) |
| `app/layout.tsx` | ThemeProvider + Navbar + Footer 래핑 |
| `app/globals.css` | Tailwind v4 테마 (`@theme inline`) |
| `components/ui/` | shadcn/ui 생성 컴포넌트 (badge, button, card, dropdown-menu) |
| `components/layout/` | navbar, footer, page-container, theme-toggle |
| `components/providers/` | theme-provider |
| `lib/access.ts` | 공유 토큰 스키마, 접근 불가 사유 enum, URL 헬퍼 |
| `lib/env.ts` | 서버 환경변수 Zod 검증 (`getServerEnv()`) |
| `lib/site.ts` | `siteConfig` (이름/설명) |
| `lib/utils.ts` | `cn()` |
| `types/invoice.ts` | `Invoice`, `InvoiceItem`, `InvoiceStatus`, `InvoiceTotals` |

### 2.1 신규 파일 배치 규칙

| 만들 것 | 위치 |
| --- | --- |
| 노션 클라이언트/조회/변환 로직 | `lib/` (서버 전용 파일, 예: `lib/notion.ts`) |
| 노션 응답 Zod 스키마 | `lib/` 의 노션 파일 옆 또는 `lib/schemas/` |
| 견적서 화면 전용 컴포넌트 | `components/invoice/` |
| PDF 템플릿 컴포넌트 | `components/pdf/` |
| PDF 다운로드 엔드포인트 | `app/invoice/[token]/pdf/route.ts` |
| 로딩/에러 UI | `app/invoice/[token]/loading.tsx`, `error.tsx` |
| 도메인 타입 | `types/` |
| 커스텀 훅 | `hooks/` (alias `@/hooks`) |
| shadcn 컴포넌트 | **직접 작성 금지** → `npx shadcn@latest add <name>` |

## 3. 코드 표준

- 들여쓰기 2칸, 변수/함수 camelCase, 컴포넌트 PascalCase, 파일명 kebab-case
- 변수·함수명은 영어, **주석·문서·커밋 메시지는 한국어**
- `any` 금지 (ESLint `@typescript-eslint/no-explicit-any: error`) → `unknown` + Zod 검증 사용
- import는 `@/` 별칭 사용 (`@/components`, `@/lib`, `@/ui`, `@/hooks`, `@/`)
- 클래스 병합은 `cn()` (`@/lib/utils`) 사용
- **세미콜론 스타일은 편집 중인 파일의 기존 스타일을 따른다** (현재 혼재)
  - 세미콜론 사용: `lib/*.ts`, `app/layout.tsx`
  - 세미콜론 없음: `app/page.tsx`, `app/invoice/**`, `app/unavailable/**`, `components/layout/*`
  - 모든 문자열은 쌍따옴표
- 한 파일의 스타일을 바꾸는 포맷팅 전용 수정 금지

```tsx
// DO: 컴포넌트 props 인터페이스 + 한국어 주석
interface InvoiceHeaderProps {
  invoice: Invoice
}
// 견적서 상단 정보 영역
export function InvoiceHeader({ invoice }: InvoiceHeaderProps) { ... }

// DON'T
export function InvoiceHeader({ invoice }: any) { ... } // any 금지
```

## 4. 기능 구현 표준

### 4.1 UI / 반응형 / 테마

- **모든 페이지는 `PageContainer`(`components/layout/page-container.tsx`)로 감싼다**. `mx-auto max-w-screen-2xl px-4`를 직접 반복 작성하지 않는다
- 반응형 필수: 모바일 우선 → `sm:` `md:` `lg:` 순으로 확장
- 견적 항목 표는 **모바일에서 카드형**으로 전환 (page.tsx TODO F002)
- 색상은 CSS 변수 토큰(`bg-background`, `text-muted-foreground` 등)만 사용. 하드코딩 색상 금지 (다크 모드 깨짐)
- 아이콘은 `lucide-react`, 장식용 아이콘에는 `aria-hidden`
- Tailwind v4: **`tailwind.config.*` 파일을 만들지 않는다**. 토큰 변경은 `app/globals.css`의 `@theme inline` / CSS 변수에서 수행

### 4.2 환경변수 / 서버 전용 코드

- 환경변수는 **반드시 `getServerEnv()`** (`lib/env.ts`)로 읽는다. `process.env.NOTION_*` 직접 접근 금지
- `getServerEnv()`와 노션 클라이언트는 **Server Component / Route Handler에서만** 호출한다. `"use client"` 파일에서 import 금지
- `NEXT_PUBLIC_` 접두사로 노션 키/ID를 노출하지 않는다
- 환경변수를 추가·삭제·개명할 때는 5절의 동기화 표를 따른다

### 4.3 공유 토큰 접근 제어 (F004, F010)

- 토큰은 `/invoice/[token]` 진입 시 **노션 조회 전에** `shareTokenSchema.safeParse`로 검증한다
- 접근 불가 처리는 `redirect(getUnavailableUrl(reason))` 로만 한다. `"/unavailable?reason=..."` 문자열 직접 조합 금지
- 상태/조건별 사유 매핑 (고정)

| 조건 | reason |
| --- | --- |
| 토큰 형식 오류 / 토큰에 해당하는 견적서 없음 | `invalid` |
| `status !== "published"` (draft) | `unpublished` |
| 유효기간 경과 또는 `status === "expired"` | `expired` |
| 노션 조회 실패 (네트워크/검증 실패) | `error` |

- 견적서 상세·접근 불가 페이지의 `robots: { index: false, follow: false }` 메타데이터를 유지한다
- 홈이나 다른 페이지에 견적서 목록·링크를 노출하지 않는다 (토큰 유출 방지)
- 에러 메시지에 노션 응답 원문, 키, DB ID를 포함하지 않는다

### 4.4 노션 데이터 → 도메인 변환 (F001)

- 흐름: 노션 응답 → **Zod 검증** → `types/invoice.ts`의 `Invoice`로 변환 → 화면/PDF에서 사용
- 노션 원본 타입을 컴포넌트에 직접 전달하지 않는다. 컴포넌트 props는 항상 `Invoice` / `InvoiceItem` / `InvoiceTotals`
- `InvoiceItem.amount`는 **웹에서 `quantity * unitPrice`로 재계산**한다 (노션 Formula 값을 신뢰하지 않음)
- 합계는 `InvoiceTotals`(`subtotal`, `vat`, `total`)로 계산하며 `vatRate`는 소수(0.1 = 10%)
- 날짜는 ISO 문자열로 저장하고 표시 시점에만 포맷한다
- 노션 데이터소스는 2개: 견적서 DB(`NOTION_INVOICE_DATA_SOURCE_ID`), 견적 항목 DB(`NOTION_ITEM_DATA_SOURCE_ID`, 견적서 relation 보유)

### 4.5 PDF 생성 (F003)

- 구현 위치: `app/invoice/[token]/pdf/route.ts` (GET) + `components/pdf/`
- 라이브러리: `@react-pdf/renderer` (Puppeteer 도입 금지)
- PDF 라우트도 4.3의 토큰·상태·유효기간 검증을 **동일하게** 수행한다 (검증 우회 금지)
- 한글 출력을 위해 한글 폰트를 `Font.register`로 등록한다 (기본 폰트 사용 시 글자 깨짐)
- PDF 템플릿은 화면과 **같은 `Invoice` / `InvoiceTotals`** 를 사용해 금액 불일치를 막는다

## 5. 파일 연동 표준 (동시 수정 필수)

| 변경 내용 | 함께 수정할 파일 |
| --- | --- |
| 환경변수 추가/삭제/개명 | `lib/env.ts` 스키마 + `.env.example` + `README.md` 환경변수 표 |
| `UnavailableReason` 값 추가/삭제 (`lib/access.ts`) | `app/unavailable/page.tsx`의 `reasonMessages` (Record 키 전부 필요) + 호출하는 `redirect` 지점 |
| 라우트 추가/삭제/개명 | `README.md` 라우트 표 + 폴더 구조 |
| `lib/`·`types/`·`components/` 구조 변경 | `README.md` 폴더 구조 |
| `types/invoice.ts` 필드 변경 | 노션 변환/Zod 스키마 + 견적서 상세 컴포넌트 + `components/pdf/` 템플릿 |
| `siteConfig` 변경 | `app/layout.tsx` metadata, navbar/footer 표기 확인 |
| 신규 npm 의존성 추가 | `README.md` 기술 스택 |
| 기능 구현 완료 | `docs/ROADMAP.md` 상태 갱신 + 코드의 해당 `TODO(Fxxx)` 주석 제거 |
| PRD와 실제 구현이 달라지는 결정 | `docs/PRD.md` 해당 부분 갱신 (문서는 한국어) |

## 6. 워크플로우 표준

```
요청 수신 → 코드 현황 확인(1.1 우선순위) → 구현
  → npm run lint → npx tsc --noEmit → (UI/API 변경 시) Playwright MCP 검증
  → 5절 연동 파일 갱신 → 보고
```

- 검증 명령: `npm run lint`, `npx tsc --noEmit`, 필요 시 `npm run build`
- 테스트 러너(Jest/Vitest)는 설치되어 있지 않다. 사용자 요청 없이 도입하지 않는다
- API/비즈니스 로직 변경은 Playwright MCP로 시나리오 검증 (정상 토큰 / 형식 오류 토큰 / 미발행 / 만료 / 노션 장애)
- 커밋은 사용자가 요청할 때만 한다. 한국어 + 이모지 컨벤션 (`.claude/commands/git/commit.md` 참조)
  - 예: `✨ feat: 견적서 노션 조회 구현`, `📝 docs: README 라우트 표 갱신`
- 작업 단계가 끝나면 멈추고 사용자 지시를 기다린다 (ROADMAP 워크플로우)

## 7. AI 의사결정 기준

```
요구사항이 PRD/ROADMAP과 코드 중 어디와 충돌하는가?
├─ 코드/README/.env.example과 충돌 → 코드를 따르고 문서를 갱신 대상으로 보고
├─ shadcn 컴포넌트가 필요한가?
│   ├─ components/ui에 있음 → 재사용
│   └─ 없음 → npx shadcn@latest add (직접 작성 금지)
├─ 새 UI 조각이 2곳 이상에서 쓰이는가? → components/ 로 분리
├─ 노션/환경변수 접근이 필요한가? → 서버 코드에서만, getServerEnv() 경유
└─ MVP 이후 기능(대시보드, 이메일 발송, 승인/거절, 다국어)인가? → 구현하지 않고 사용자에게 확인
```

## 8. 금지 사항

- ❌ `any` 사용, `// @ts-ignore`로 타입 오류 회피
- ❌ 클라이언트 컴포넌트에서 `getServerEnv()` / 노션 클라이언트 import
- ❌ `process.env`를 `lib/env.ts` 밖에서 직접 읽기 (`NOTION_*`)
- ❌ `NEXT_PUBLIC_` 으로 시크릿 노출
- ❌ 토큰 검증 없이 노션 조회 또는 PDF 생성
- ❌ `/unavailable` URL 문자열 직접 작성 (`getUnavailableUrl` 사용)
- ❌ 홈/네비게이션에 견적서 목록·링크 노출
- ❌ `tailwind.config.*` 생성, 하드코딩 색상
- ❌ `components/ui/*` 수동 신규 작성 (shadcn CLI 사용), 기존 파일의 임의 대규모 수정
- ❌ 노션 Formula `amount` 값을 그대로 신뢰
- ❌ `.env.local` 등 `.env*` 파일 커밋 (`.env.example`만 허용)
- ❌ `shrimp_data/`, `.mcp.json`, `.claude/settings.local.json` 임의 수정·커밋
- ❌ 사용자 요청 없는 의존성 대량 추가, 테스트 러너 도입, 영어 주석/문서 작성
