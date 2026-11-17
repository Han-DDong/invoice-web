# 프로젝트 개발 규칙

## 프로젝트 개요

**노션 기반 견적서 조회 서비스** - 노션 DB에 입력한 견적서를 클라이언트가 공유 링크(`/invoice/[token]`)로 조회하고 PDF로 내려받습니다.

### 핵심 기술 스택

- **프레임워크**: Next.js 16 (App Router + Turbopack)
- **런타임**: React 19 + TypeScript 6 (strict)
- **스타일링**: Tailwind CSS v4 + shadcn/ui (new-york)
- **검증**: Zod 4 (노션 응답, 환경변수)
- **외부 API**: @notionhq/client 5 (data source 기반 API)
- **PDF**: @react-pdf/renderer 4
- **테스트**: Vitest (`tests/*.test.ts`, node 환경)

> 폼 라이브러리(react-hook-form)와 Server Actions는 사용하지 않습니다. 이 서비스는 조회와 다운로드만 합니다.

### 범위

**포함**: 견적서 조회(`/invoice/[token]`), 노션 연동, PDF 다운로드(`/invoice/[token]/pdf`), 만료·오류 안내(`/unavailable`)

**제외**: 관리자 대시보드, 이메일 발송, 템플릿 커스터마이징, 폼 입력

---

## 프로젝트 구조 규칙

### 디렉토리 구조 (프로젝트 루트 기준, `src/` 없음)

```
app/                # App Router 페이지와 라우트 핸들러만 배치
├── invoice/[token]/ # 견적서 페이지, pdf/route.ts
├── unavailable/     # 접근 불가 안내
├── layout.tsx       # 루트 레이아웃
├── global-error.tsx # 루트 레이아웃 오류
└── not-found.tsx
components/
├── ui/              # shadcn/ui 기본 컴포넌트
├── invoice/         # 견적서 화면
├── pdf/             # PDF 템플릿
├── layout/          # 레이아웃 컴포넌트
└── providers/       # Context 프로바이더
lib/                 # 유틸리티, 서비스, 설정 (env.ts, notion.ts 등)
types/               # 도메인 타입
tests/               # Vitest 단위 테스트
assets/fonts/        # PDF용 한글 폰트
```

### 경로 별칭 사용 필수

```typescript
// ✅ 필수: `@/*` → 프로젝트 루트
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ❌ 금지: 상대 경로 사용
import { Button } from '../../../components/ui/button'
```

### 파일 네이밍

- **파일/폴더명**: kebab-case (`invoice-summary.tsx`, `user-settings/`)
- **컴포넌트명**: PascalCase (`InvoiceSummary`)
- **금지**: snake_case, PascalCase 폴더명

---

## Next.js 16 필수 규칙

> Next.js 16은 기존 지식과 다른 점이 많습니다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 관련 가이드를 확인하세요.

### App Router 엄격 사용

- `app/` 아래 `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`만 사용
- Pages Router(`pages/`), `getServerSideProps`, `getStaticProps` 사용 금지

### async request APIs (동기 접근 완전 제거)

Next.js 16에서는 `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` 모두 **비동기 전용**입니다. 동기 접근은 호환 레이어 없이 에러가 납니다.

```typescript
// ✅ 필수: params는 Promise
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  // ...
}

// ✅ 라우트 핸들러도 동일
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
}

// ❌ 금지: 동기 접근
export default function Page({ params }: { params: { token: string } }) {
  const data = getData(params.token)
}
```

### Server Components 우선 설계

- 기본은 Server Component, 상호작용(상태, 이벤트, 브라우저 API)이 필요할 때만 `'use client'`
- `'use client'` 없이 `useState`, `useEffect` 사용 금지
- 서버 전용 모듈은 `import 'server-only'`로 보호하고 클라이언트 컴포넌트에서 가져오지 않음

### Next.js 16 변경 사항 주의

- **Turbopack 기본**: `next dev`, `next build` 모두 Turbopack. webpack 전용 설정을 추가하지 않음
- **`middleware.ts` → `proxy.ts`**: 이름이 바뀌었으며, 이 프로젝트는 `proxy.ts`를 쓰지 않음 (Proxy에서 전역 상태 의존 금지, 속도 제한은 라우트 핸들러에서 수행)
- **`next lint` 제거**: ESLint는 `npm run lint`(ESLint CLI 직접 실행)로 실행
- **캐싱**: `cacheComponents`는 쓰지 않음. 서버 캐시는 `unstable_cache`를 사용하고, 노션 fetch 자체는 `no-store`
- **보안 헤더**는 `next.config.ts`의 `headers()`에서 설정
- Node.js 20.9 이상 필요

---

## 스타일링 규칙

### Tailwind CSS v4 유틸리티 클래스 우선

- `tailwind.config` 없음. 테마는 `app/globals.css`의 `@theme inline`에서 설정
- 다크 모드는 `next-themes`(class 방식), 색상은 OKLCH
- Prettier가 `prettier-plugin-tailwindcss`로 클래스를 정렬함 (`cn`/`cva` 포함)

```tsx
// ✅ 필수: Tailwind 유틸리티 + 시맨틱 색상
<div className="flex items-center justify-between rounded-lg bg-background p-4">
  <h2 className="text-lg font-semibold text-foreground">제목</h2>
</div>

// ❌ 금지: 인라인 스타일, 하드코딩된 색상
<div style={{ display: 'flex' }} className="bg-white text-black">
```

### cn() 함수로 클래스 조합

```tsx
import { cn } from '@/lib/utils'

// ✅ 필수
<div className={cn('base-classes', isActive && 'active-classes', className)} />

// ❌ 금지: 문자열 직접 조합
<div className={`base ${isActive ? 'active' : ''}`} />
```

### 컨테이너 폭

모든 컨테이너는 `lib/site.ts`의 `containerWidthClass`(`mx-auto w-full max-w-3xl px-4`)를 사용합니다.

### 금지 사항

- 인라인 스타일(`style={{}}`) 금지 (단, PDF 템플릿의 `@react-pdf` `StyleSheet`는 예외)
- 하드코딩된 색상 클래스(`bg-white`, `text-black`, `text-blue-600`) 금지
- 커스텀 CSS 클래스 최소화, `!important` 남용 금지

### shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

- 기본 UI는 `components/ui/`의 shadcn/ui 컴포넌트를 먼저 사용

---

## 컴포넌트 작성 규칙

- **단일 책임**: 컴포넌트 하나는 하나의 명확한 책임만 가짐
- **Props 인터페이스 필수**: `any` 금지, 명시적 타입 정의
- **파일 크기**: 300줄 이하 권장, 초과 시 분할
- **반응형 필수**: 모바일 우선 레이아웃
- 견적서 화면은 `components/invoice/`, PDF 템플릿은 `components/pdf/`에 배치
- PDF 색상은 다크 모드와 무관하게 `StyleSheet`에 고정

---

## 환경 변수 관리

`lib/env.ts`에서 Zod로 검증합니다. `.env.example`을 `.env.local`로 복사해 채웁니다.

| 변수                         | 설명            |
| ---------------------------- | --------------- |
| `NOTION_API_KEY`             | 노션 통합 키    |
| `NOTION_INVOICE_DATABASE_ID` | 견적서 DB ID    |
| `NOTION_ITEM_DATABASE_ID`    | 견적 항목 DB ID |

- 값은 **database ID**입니다. data source ID가 아닙니다.
- API 키와 DB ID는 응답 HTML, PDF, 로그, 사용자 노출 에러 문구에 나오면 안 됨
- 클라이언트에서 환경변수 직접 접근 금지 (`env` 객체는 서버에서만 사용)

### 환경 변수 추가 시 필수 작업

1. `.env.example`에 변수 추가
2. `lib/env.ts`의 Zod 스키마에 검증 규칙 추가
3. `env` 객체 파싱에 변수 추가

---

## Notion 연동 및 데이터 흐름

```
노션 → lib/notion.ts (서버 전용 클라이언트)
     → lib/invoice-service.ts (getInvoiceByPageId)
     → lib/notion-parser.ts (Zod 검증, 도메인 변환)
     → lib/invoice-access.ts (getAccessibleInvoice)
     → 페이지와 PDF 라우트가 공유
```

- URL 토큰 = 노션 **페이지 ID**. 형식은 `lib/access.ts`의 `shareTokenSchema`로 검증
- 페이지가 견적서 DB 소속인지 `parent.database_id`로 확인
- 항목 DB는 `databases.retrieve`로 data source를 찾아(캐시) `dataSources.query`로 조회 (@notionhq/client 5)
- 금액은 노션 값을 쓰지 않고 `수량 x 단가`로 재계산, 합계는 항목 금액 합계. **부가세 계산 없음** (`lib/invoice-calculations.ts`)
- 날짜는 KST 기준 문자열로 비교, 만료는 `validUntil < 오늘(KST)`
- 노션 응답은 반드시 Zod로 검증한 뒤 사용

### 캐시 규칙

- `getInvoiceByPageId`가 조회 **성공 결과만** `unstable_cache`로 30초 캐시
- 실패(not_found, query_failed, validation_failed)는 캐시하지 않음
- 토큰 형식 검증과 만료 판정은 캐시 밖(`getAccessibleInvoice`)에서 매 요청 수행

### 오류 처리

- 조회 실패는 `InvoiceFetchError`(not_found / query_failed / validation_failed)
- 접근 판정 사유는 invalid / not_found / expired / error (`types/invoice-error.ts`)
- 사용자에게 보이는 에러에는 노션 에러 원문을 노출하지 않음
- 서버 로그는 `lib/logger.ts`의 `logServerError`로만 남기고, 오류 객체를 `console.error`로 통째로 출력하지 않음

---

## 라우트 동작 규칙

### 견적서 페이지 `app/invoice/[token]/page.tsx`

- not_found → `notFound()`
- 그 외 실패 → `redirect('/unavailable?reason=...')`
- `loading.tsx` 스트리밍 때문에 curl은 항상 200으로 보임. 리다이렉트는 브라우저(Playwright)로 확인

### PDF 라우트 `app/invoice/[token]/pdf/route.ts`

- 같은 접근 판정을 사용하고, 실패 시 404(invalid, not_found) / 410(expired) / 500(error)을 텍스트로 응답
- 모든 응답에 `Cache-Control: no-store`
- 판정 전에 IP당 1분 10회 인메모리 제한 (초과 시 429 + `Retry-After`)
- `renderToBuffer`에는 Document 요소가 필요하므로 `InvoicePdfDocument({ invoice, totals })`를 직접 호출 (`createElement`로 감싸지 않음)
- 한글 폰트는 `assets/fonts`의 Noto Sans KR OTF를 `lib/pdf/fonts.ts`에서 `process.cwd()` 기준으로 등록
- 다운로드 버튼은 `<a>` 링크이며 `download` 속성을 쓰지 않음 (실패 문구를 화면에 보여주기 위함)

### 서버 전용 코드

`lib/notion.ts`, `lib/invoice-service.ts`, `lib/invoice-access.ts`, `lib/pdf/fonts.ts`, `lib/logger.ts`, `lib/rate-limit.ts`는 `server-only`를 import합니다. 클라이언트 컴포넌트에서 가져오지 마세요.

---

## 다중 파일 조정 규칙

### 새 페이지 추가 시

1. `app/[route]/page.tsx` 생성 (Server Component로 시작)
2. 필요 시 `loading.tsx`, `error.tsx` 추가
3. `params`는 Promise로 선언하고 `await`

### 노션 필드 추가·변경 시

1. `types/notion.ts`, `types/invoice.ts`: 타입 수정
2. `lib/notion-parser.ts`: Zod 스키마와 변환 수정
3. `lib/invoice-calculations.ts`: 계산에 영향이 있으면 수정
4. `components/invoice/`, `components/pdf/`: 화면과 PDF 반영
5. `tests/`: 파서와 서비스 테스트, fixture 갱신

### 환경변수 추가 시

`.env.example` → `lib/env.ts` 스키마 → `env` 파싱 순서로 수정

---

## 금지사항

### 절대 금지

- Pages Router, `getServerSideProps`, `getStaticProps` 사용
- `params`/`searchParams`/`cookies()`/`headers()` 동기 접근
- 인라인 스타일, 하드코딩된 색상 (PDF `StyleSheet` 제외)
- 클라이언트에서 환경변수 직접 접근
- `any` 타입
- 상대 경로 import (`@/` 별칭 사용)
- API 키, DB ID, 노션 에러 원문을 응답·PDF·로그에 노출
- 화면 하단 문구 "부가세는 별도로 청구됩니다" 임의 변경 (사용자 요청으로 유지)

### 지양 사항

- `'use client'` 남용
- 커스텀 CSS 클래스
- 깊은 props drilling
- 300줄 초과 파일

---

## 코드 품질 체크리스트

### 개발 완료 후 필수 실행

```bash
npm run check-all   # typecheck + lint + format:check + test
npm run build       # 빌드 테스트
```

UI나 라우트를 바꿨다면 dev 서버(`http://localhost:3000`)에서 Playwright MCP로 해당 페이지를 직접 확인합니다.

### 컴포넌트 작성 후 확인

- [ ] Server/Client Component 적절히 분리
- [ ] Props 인터페이스 정의 (`any` 없음)
- [ ] Tailwind 클래스, 시맨틱 색상 변수 사용
- [ ] 반응형 확인
- [ ] 파일 크기 300줄 이하
- [ ] 단일 책임 원칙 준수

---

## AI Agent 결정 트리

### 새 기능 구현 시

1. **Server Component로 시작 가능?** YES → Server Component, NO(상호작용 필요) → `'use client'`
2. **스타일링**: 기본 UI는 shadcn/ui, 커스텀은 Tailwind 유틸리티, 조건부는 `cn()`
3. **데이터 패칭**: 노션 데이터는 `lib/invoice-access.ts`의 `getAccessibleInvoice` 사용 (노션 클라이언트를 직접 호출하지 않음)
4. **폼이 필요해 보이면**: 이 서비스는 폼을 쓰지 않으므로 먼저 사용자에게 확인

### 파일 수정 시

1. **기존 파일 읽기 필수** - 수정 전 반드시 파일 읽기
2. **패턴 일치 확인** - 기존 코드 스타일 유지 (세미콜론 없음, 작은따옴표, 들여쓰기 2칸)
3. **타입 정의 확인** - Props 인터페이스 존재 여부 확인
4. **Import 경로 확인** - 경로 별칭 사용 여부 확인
5. **Next.js 16 API 확인** - 불확실하면 `node_modules/next/dist/docs/` 참고

---

**📝 문서 버전**: v2.0 (Next.js 16 기준)
**🎯 목표**: AI Agent가 즉시 실행 가능한 프로젝트별 규칙 제공
