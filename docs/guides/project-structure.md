# 프로젝트 구조 가이드

이 문서는 Next.js 16 기반 견적서 조회 서비스(invoice-web)의 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

## 🏗️ 전체 프로젝트 구조

`src/` 폴더 없이 프로젝트 루트에 소스 폴더를 둡니다. (별칭 `@/*` → 프로젝트 루트)

```
invoice-web/
├── app/                   # 🚀 Next.js App Router
├── components/            # 🧩 React 컴포넌트
├── lib/                   # 🛠️ 유틸리티, 서비스, 설정
├── types/                 # 📐 TypeScript 도메인 타입
├── tests/                 # 🧪 Vitest 단위 테스트
├── assets/fonts/          # 🔤 PDF용 한글 폰트 (Noto Sans KR OTF)
├── docs/                  # 📚 프로젝트 문서 (PRD, ROADMAP, guides)
├── tasks/                 # 📝 작업별 명세와 테스트 결과
├── components.json        # shadcn/ui 설정
├── next.config.ts         # Next.js 설정 (보안 헤더 포함)
├── vitest.config.mts      # Vitest 설정
├── eslint.config.mjs      # ESLint flat config
├── package.json           # 의존성 및 스크립트
├── tsconfig.json          # TypeScript 설정
├── CLAUDE.md              # 개발 지침 메인 문서
├── AGENTS.md              # Next.js 16 로컬 문서 참조 안내
└── shrimp-rules.md        # 상세 개발 규칙
```

`proxy.ts`(구 `middleware.ts`)는 사용하지 않습니다. (Proxy에서 전역 상태 의존 금지)

## 📁 세부 폴더 구조

### app/ - App Router 페이지

```
app/
├── layout.tsx                  # 🎨 루트 레이아웃 (전역 설정)
├── page.tsx                    # 🏠 홈페이지 (/)
├── globals.css                 # 🎨 전역 CSS (Tailwind v4 @theme inline)
├── favicon.ico                 # 🔖 파비콘
├── not-found.tsx               # 404 페이지
├── global-error.tsx            # 루트 레이아웃 오류 (자체 html/body)
├── unavailable/
│   └── page.tsx                # 견적서를 볼 수 없는 사유 안내
└── invoice/[token]/
    ├── page.tsx                # 견적서 조회 (/invoice/[token])
    ├── loading.tsx             # 스트리밍 로딩 UI
    ├── error.tsx               # 에러 UI
    └── pdf/
        └── route.ts            # PDF 다운로드 Route Handler
```

**🚀 App Router 규칙:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `loading.tsx`: 로딩 UI (필요시)
- `error.tsx`: 에러 UI (필요시)
- `not-found.tsx`: 404 페이지 (필요시)
- `route.ts`: Route Handler (같은 경로에 `page.tsx`와 공존 불가)
- 동적 라우트의 `params`는 Promise이므로 항상 `await` 합니다. (Next.js 16)
- 병렬 라우트 슬롯(`@slot`)을 추가하면 `default.tsx`가 필수입니다. (Next.js 16)

### components/ - 컴포넌트 조직

```
components/
├── ui/                          # 🎛️ shadcn/ui 기본 컴포넌트
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dropdown-menu.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   └── table.tsx
├── layout/                      # 🏗️ 레이아웃 컴포넌트
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── page-container.tsx       # containerWidthClass 적용 컨테이너
│   ├── status-card.tsx          # 안내/오류 카드
│   ├── icon-badge.tsx
│   └── theme-toggle.tsx
├── invoice/                     # 🧾 견적서 화면 컴포넌트
│   ├── invoice-view.tsx
│   ├── invoice-header.tsx
│   ├── invoice-client-info.tsx
│   ├── invoice-items-table.tsx
│   ├── invoice-empty-items.tsx
│   ├── invoice-totals.tsx
│   ├── invoice-status-badge.tsx
│   ├── invoice-inquiry-note.tsx
│   └── pdf-download-button.tsx
├── pdf/                         # 📄 PDF 템플릿 (@react-pdf/renderer)
│   └── invoice-template.tsx
└── providers/                   # 🔧 Context 프로바이더
    └── theme-provider.tsx
```

**🧩 컴포넌트 분류 규칙:**

1. **ui/**: shadcn/ui 기반 기본 컴포넌트
   - `npx shadcn@latest add [component-name]`으로만 추가
   - 순수 UI, 비즈니스 로직 없음
2. **layout/**: 페이지 구조와 공통 영역
   - 헤더, 푸터, 컨테이너, 안내 카드
3. **invoice/**: 견적서 도메인 화면 컴포넌트
   - 데이터는 props로 받고, 계산은 `lib/invoice-calculations.ts`에서 처리
4. **pdf/**: PDF 전용 템플릿
   - 색상은 다크 모드와 무관하게 `StyleSheet`에 고정
   - Tailwind 클래스 사용 불가
5. **providers/**: React Context 프로바이더

### lib/ - 서비스, 유틸리티, 설정

```
lib/
├── notion.ts                # 노션 클라이언트 (server-only)
├── invoice-service.ts       # getInvoiceByPageId, 성공 결과만 30초 캐시 (server-only)
├── invoice-access.ts        # getAccessibleInvoice, 접근 판정 (server-only)
├── notion-parser.ts         # Zod 검증, 도메인 변환
├── invoice-calculations.ts  # 수량 x 단가 재계산, 합계
├── access.ts                # shareTokenSchema (토큰 형식 검증)
├── env.ts                   # Zod 환경변수 검증
├── constants.ts             # 상수 (캐시 TTL 등)
├── format.ts                # 금액, 날짜 포맷
├── site.ts                  # 사이트 설정, containerWidthClass
├── logger.ts                # logServerError (server-only)
├── rate-limit.ts            # IP당 PDF 요청 제한 (server-only)
├── utils.ts                 # cn 등 공통 유틸리티
└── pdf/
    ├── fonts.ts             # 한글 폰트 등록 (server-only)
    └── file-name.ts         # PDF 파일명 생성
```

**🔒 서버 전용 코드:**

`notion.ts`, `invoice-service.ts`, `invoice-access.ts`, `pdf/fonts.ts`, `logger.ts`, `rate-limit.ts`는 `server-only`를 import 합니다. 클라이언트 컴포넌트에서 가져오지 마세요.

**📊 데이터 흐름:**

노션 → `notion.ts` → `invoice-service.ts` → `notion-parser.ts` → `invoice-access.ts` → 페이지와 PDF 라우트

### types/ - 도메인 타입

```
types/
├── invoice.ts          # 견적서 도메인 타입
├── invoice-error.ts    # InvoiceFetchError, 접근 판정 사유
├── notion.ts           # 노션 응답 타입
└── pdf.ts              # PDF 관련 타입
```

### tests/ - 단위 테스트

```
tests/
├── fixtures/notion.ts          # 노션 응답 픽스처
├── stubs/server-only.ts        # server-only 스텁
├── invoice-access.test.ts
├── invoice-service.test.ts
├── notion-parser.test.ts
├── pdf-route.test.ts
├── pure-functions.test.ts
└── rate-limit.test.ts
```

- Vitest(node 환경)를 사용하며 `tests/*.test.ts` 형식입니다.
- 노션 클라이언트, 환경변수, `next/cache`를 모킹하므로 키와 네트워크가 필요 없습니다.

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명
invoice-view.tsx        # kebab-case (권장, 현재 프로젝트 표준)

# ❌ 잘못된 파일명
invoice_view.tsx        # snake_case (금지)
InvoiceView.tsx         # PascalCase 파일명 (이 프로젝트에서는 사용하지 않음)
invoiceview.tsx         # 소문자만 (금지)
```

### 컴포넌트 네이밍

```typescript
// ✅ 올바른 컴포넌트 네이밍
export function InvoiceView() {} // PascalCase
export function PdfDownloadButton() {} // PascalCase

// ❌ 잘못된 컴포넌트 네이밍
export function invoiceView() {} // camelCase (금지)
export function invoice_view() {} // snake_case (금지)
```

### 폴더 네이밍

```bash
# ✅ 올바른 폴더명
components/             # 소문자
invoice/                # 소문자 단어
user-settings/          # kebab-case (여러 단어)

# ❌ 잘못된 폴더명
Components/            # PascalCase (금지)
user_settings/         # snake_case (금지)
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`의 `@/*`는 프로젝트 루트를 가리킵니다. `components.json`의 shadcn 별칭도 같은 기준입니다.

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { InvoiceView } from '@/components/invoice/invoice-view'

// ❌ 상대 경로 사용 (금지)
import { Button } from '../../../components/ui/button'
import { cn } from '../../lib/utils'
```

**📍 정의된 별칭:**

- `@/components` → `components`
- `@/components/ui` → `components/ui`
- `@/lib` → `lib`
- `@/lib/utils` → `lib/utils`
- `@/hooks` → `hooks` (`components.json`에만 정의, 현재 폴더 없음)

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]

# 커스텀 UI 컴포넌트는 도메인 폴더에 추가
components/invoice/custom-component.tsx
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
app/about/page.tsx

# 동적 페이지 (params는 Promise)
app/users/[id]/page.tsx

# 그룹 라우트
app/(group)/page.tsx
```

### 3. 새 비즈니스 컴포넌트 추가

```bash
# 위치 결정 기준:
1. 견적서 화면 관련 → components/invoice/
2. PDF 템플릿 관련 → components/pdf/
3. 레이아웃, 안내 카드 → components/layout/
4. 여러 곳에서 쓰는 기본 UI → components/ui/ (shadcn)
```

### 4. 새 유틸리티 추가

```bash
# 공통 유틸리티
lib/utils.ts                # 기존 파일에 추가

# 특화된 로직
lib/invoice-xxx.ts          # 도메인 단위로 새 파일 생성
lib/pdf/xxx.ts              # PDF 전용 로직

# 서버 전용이면 파일 상단에 import 'server-only'
```

### 5. 새 타입 / 테스트 추가

```bash
types/xxx.ts                # 도메인 타입
tests/xxx.test.ts           # Vitest 단위 테스트
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성 순서

```typescript
// 1. 외부 라이브러리
import { notFound } from 'next/navigation'

// 2. 내부 라이브러리 (@/ 경로)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 3. 상대 경로 (같은 폴더의 파일에만)
import './component.css'
```

### 3. Export 규칙

```typescript
// ✅ Named export 사용 (권장)
export function InvoiceView() {}

// ✅ Default export (page, layout, route 등 Next.js 규약 파일)
export default function InvoicePage() {}

// ❌ 혼재 사용 지양
export function InvoiceView() {}
export default InvoiceView // 같은 컴포넌트를 두 방식으로 export
```

### 4. 파일 크기 관리

- 단일 파일: 300줄 이하 권장
- 300줄 초과 시 분할 고려
- 관련 기능별로 분리

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# 깊은 중첩 구조 (4단계 이상)
components/pages/invoice/forms/items/ItemRow.tsx

# 의미 없는 폴더명
components/misc/
components/common/
components/shared/

# 혼재된 케이스
components/Invoice/invoiceView.tsx
```

### ❌ 피해야 할 패턴

```typescript
// 거대한 파일
export function SuperMegaComponent() {
  // 500줄 이상의 코드
}

// 클라이언트 컴포넌트에서 서버 전용 모듈 import
;('use client')
import { getInvoiceByPageId } from '@/lib/invoice-service' // ❌ server-only

// 깊은 상대 경로
import { utils } from '../../../../../lib/utils'
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] 적절한 카테고리 폴더에 배치
- [ ] kebab-case 파일명 사용
- [ ] PascalCase 컴포넌트명 사용
- [ ] 경로 별칭 사용
- [ ] 단일 책임 원칙 준수
- [ ] 적절한 export 방식 선택
- [ ] 서버 전용 코드는 `server-only` import
- [ ] 파일 크기 300줄 이하 유지
- [ ] 작업 후 `npm run check-all`과 `npm run build` 통과

이 가이드를 따라 일관성 있고 유지보수하기 쉬운 프로젝트 구조를 만들어보세요!
