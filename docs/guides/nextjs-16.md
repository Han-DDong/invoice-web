# Next.js 16 개발 지침

이 문서는 Claude Code에서 Next.js 16 프로젝트를 개발할 때 따라야 할 핵심 규칙과 가이드라인을 제공합니다.

> 기준 문서: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
> 요구 사항: Node.js 20.9 이상, TypeScript 5.1 이상

## 🚀 필수 규칙 (엄격 준수)

### App Router 아키텍처

```typescript
// ✅ 올바른 방법: App Router 사용
app/
├── layout.tsx          // 루트 레이아웃
├── page.tsx           // 메인 페이지
├── loading.tsx        // 로딩 UI
├── error.tsx          // 에러 UI
├── not-found.tsx      // 404 페이지
└── dashboard/
    ├── layout.tsx     // 대시보드 레이아웃
    └── page.tsx       // 대시보드 페이지
// 요청 가로채기(인증 등)가 필요하면 프로젝트 루트에 proxy.ts (구 middleware.ts)

// ❌ 금지: Pages Router 사용
pages/
├── index.tsx
└── dashboard.tsx
```

### Server Components 우선 설계

```typescript
// 🚀 필수: 기본적으로 모든 컴포넌트는 Server Components
export default async function UserDashboard() {
  // 서버에서 데이터 가져오기
  const user = await getUser()

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      {/* 클라이언트 컴포넌트가 필요한 경우에만 분리 */}
      <InteractiveChart data={user.analytics} />
    </div>
  )
}

// ✅ 클라이언트 컴포넌트는 최소한으로 사용
'use client'

import { useState } from 'react'

export function InteractiveChart({ data }: { data: Analytics[] }) {
  const [selectedRange, setSelectedRange] = useState('week')
  // 상호작용 로직만 클라이언트에서 처리
  return <Chart data={data} range={selectedRange} />
}
```

### async request APIs 처리 (동기 접근 완전 제거)

Next.js 15에서는 임시로 동기 접근이 허용됐지만, 16부터는 완전히 제거되어 항상 `await`로 접근해야 합니다.
대상: `cookies`, `headers`, `draftMode`, `params`(layout/page/route/default/icon 등), `searchParams`(page)

```typescript
// 🚀 Next.js 16 방식
import { cookies, headers } from 'next/headers'

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 🚀 필수: async request APIs 올바른 처리
  const { id } = await params
  const query = await searchParams
  const cookieStore = await cookies()
  const headersList = await headers()

  const user = await getUser(id)

  return <UserProfile user={user} />
}

// ❌ 금지: 동기식 접근 (16에서 제거됨)
export default function Page({ params }: { params: { id: string } }) {
  const user = getUser(params.id) // 에러 발생 (params는 Promise)
  return <UserProfile user={user} />
}
```

타입은 `npx next typegen`으로 생성되는 `PageProps<'/route'>`, `LayoutProps<'/route'>` 헬퍼를 쓸 수도 있습니다.

### Typed Routes 활용

```typescript
// 🚀 필수: Typed Routes로 타입 안전성 보장
import Link from 'next/link'

// next.config.ts에서 typedRoutes: true 설정 필요 (experimental 아님, stable)
export function Navigation() {
  return (
    <nav>
      {/* ✅ 타입 안전한 링크 */}
      <Link href="/dashboard/users/123">사용자 상세</Link>

      {/* ❌ 컴파일 에러: 존재하지 않는 경로 */}
      <Link href="/nonexistent-route">잘못된 링크</Link>
    </nav>
  )
}
```

## ✅ 권장 사항 (성능 최적화)

### Streaming과 Suspense 활용

```typescript
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1>

      {/* ✅ 빠른 컨텐츠는 즉시 렌더링 */}
      <QuickStats />

      {/* ✅ 느린 컨텐츠는 Suspense로 감싸기 */}
      <Suspense fallback={<SkeletonChart />}>
        <SlowChart />
      </Suspense>

      <Suspense fallback={<SkeletonTable />}>
        <SlowDataTable />
      </Suspense>
    </div>
  )
}

async function SlowChart() {
  // 무거운 데이터 처리
  await new Promise(resolve => setTimeout(resolve, 2000))
  const data = await getComplexAnalytics()

  return <Chart data={data} />
}
```

### after() API 활용

```typescript
import { after } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()

  // 즉시 응답 반환
  const result = await processUserData(body)

  // 비블로킹 작업은 after()로 처리
  after(async () => {
    await sendAnalytics(result)
    await updateCache(result.id)
    await sendNotification(result.userId)
  })

  return Response.json({ success: true, id: result.id })
}
```

### 캐싱 전략

```typescript
// ✅ 세밀한 캐시 제어
export async function getProductData(id: string) {
  const data = await fetch(`/api/products/${id}`, {
    next: {
      revalidate: 3600, // 1시간 캐시
      tags: [`product-${id}`, 'products'], // 태그 기반 무효화
    },
  })

  return data.json()
}

// 캐시 무효화
import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: ProductData) {
  await updateDatabase(id, data)

  // 🔄 16: 두 번째 인자(cacheLife 프로필) 필수. 단일 인자 형태는 deprecated + 타입 에러
  revalidateTag(`product-${id}`, 'max')
  revalidateTag('products', 'max')
}
```

- `revalidateTag(tag, 'max')`: stale-while-revalidate 방식. 약간의 지연이 허용되는 콘텐츠에 사용
- `updateTag(tag)`: Server Action 안에서 즉시 만료가 필요할 때 사용
- `refresh()`: Server Action에서 캐시되지 않은 데이터를 새로고침

### Turbopack (기본 번들러)

Next.js 16부터 `next dev`와 `next build` 모두 Turbopack이 기본입니다. `--turbopack` 플래그는 필요 없습니다.

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 🔄 experimental.turbo → 최상위 turbopack 옵션
  turbopack: {
    // 필요한 옵션만 설정
  },
  experimental: {
    // ✅ 패키지 import 최적화
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash-es',
    ],
  },
}

export default nextConfig
```

- 커스텀 `webpack` 설정이 있으면 `next build`가 실패합니다. Turbopack으로 이전하거나 `--webpack` 플래그로 opt-out 하세요.

## ⚠️ Breaking Changes 대응

### React 19.2 호환성

```typescript
// ⚠️ React 19에서 변경된 사항들

// ✅ 새로운 방식: useFormStatus 훅
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? '제출 중...' : '제출'}
    </button>
  )
}

// ✅ Server Actions와 form 통합
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const email = formData.get('email') as string

  await saveUser({ name, email })
  redirect('/users')
}

export default function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  )
}
```

### middleware → proxy

`middleware.ts`는 deprecated 되었고 `proxy.ts`로 이름이 바뀌었습니다. 내보내는 함수명도 `proxy`로 바꿉니다.

```bash
mv middleware.ts proxy.ts
```

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'

// ⚠️ proxy는 Node.js 런타임 고정이며 runtime 설정을 쓰면 에러가 납니다.
// edge 런타임이 필요하면 기존 middleware.ts를 유지하세요.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export function proxy(request: NextRequest) {
  // 인증 로직
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
```

- `middleware` 이름이 들어간 설정 플래그도 바뀝니다. (예: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`)

### unauthorized / forbidden API

`next.config.ts`에서 `experimental.authInterrupts: true`를 켜야 하고, `next/navigation`에서 가져옵니다.

```typescript
// app/admin/page.tsx
import { unauthorized, forbidden } from 'next/navigation'

export default async function AdminPage() {
  const session = await getSession()

  // 로그인하지 않은 경우 401 (unauthorized.tsx 렌더링)
  if (!session) {
    unauthorized()
  }

  // 권한이 없는 경우 403 (forbidden.tsx 렌더링)
  if (!session.user.isAdmin) {
    forbidden()
  }

  const data = await getAdminData()
  return <AdminDashboard data={data} />
}
```

## 라우팅 패턴 활용

### Route Groups 고급 패턴

```typescript
// ✅ Route Groups로 레이아웃 분리
app/
├── (marketing)/
│   ├── layout.tsx     // 마케팅 레이아웃
│   ├── page.tsx       // 홈페이지
│   └── about/
│       └── page.tsx   // 소개 페이지
├── (dashboard)/
│   ├── layout.tsx     // 대시보드 레이아웃
│   └── analytics/
│       └── page.tsx   // 분석 페이지
└── (auth)/
    ├── login/
    │   └── page.tsx
    └── register/
        └── page.tsx

// (marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing-layout">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}
```

### Parallel Routes 활용

🔄 16부터 모든 슬롯에 `default.tsx`가 필수입니다. 없으면 빌드가 실패합니다.
(`notFound()`를 호출하거나 `null`을 반환하세요.)

```typescript
// ✅ Parallel Routes로 동시 렌더링
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── @analytics/
│   │   ├── default.tsx    // 필수
│   │   └── page.tsx
│   └── @notifications/
│       ├── default.tsx    // 필수
│       └── page.tsx

// dashboard/@analytics/default.tsx
export default function Default() {
  return null
}

// dashboard/layout.tsx
import { Suspense } from 'react'

export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="analytics-panel">
        <Suspense fallback={<AnalyticsSkeleton />}>
          {analytics}
        </Suspense>
      </aside>
      <div className="notifications-panel">
        <Suspense fallback={<NotificationsSkeleton />}>
          {notifications}
        </Suspense>
      </div>
    </div>
  )
}
```

### Intercepting Routes

```typescript
// ✅ Intercepting Routes로 모달 구현
app/
├── gallery/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx    // 전체 페이지 보기
└── @modal/
    ├── default.tsx          // 필수 (16부터 모든 슬롯에 필요)
    └── (.)gallery/
        └── [id]/
            └── page.tsx // 모달 보기

// @modal/(.)gallery/[id]/page.tsx
import { Modal } from '@/components/modal'

export default async function PhotoModal({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <Modal>
      <img src={photo.url} alt={photo.title} />
    </Modal>
  )
}
```

## ❌ 금지 사항

### Pages Router 사용 금지

```typescript
// ❌ 절대 금지: Pages Router 패턴
pages/
├── _app.tsx
├── _document.tsx
├── index.tsx
└── api/
    └── users.ts

// ❌ 금지: getServerSideProps, getStaticProps 사용
export async function getServerSideProps() {
  // 이 방식은 사용하지 마세요
}
```

### 안티패턴 방지

```typescript
// ❌ 금지: 불필요한 'use client' 사용
'use client'

export default function SimpleComponent({ title }: { title: string }) {
  // 상태나 이벤트 핸들러가 없는데 'use client' 사용
  return <h1>{title}</h1>
}

// ✅ 올바른 방법: Server Component로 유지
export default function SimpleComponent({ title }: { title: string }) {
  return <h1>{title}</h1>
}

// ❌ 금지: 클라이언트에서 서버 함수 직접 호출
'use client'

import { getUser } from '@/lib/database' // 서버 전용 함수

export function UserProfile() {
  const user = getUser() // 에러 발생
  return <div>{user.name}</div>
}

// ✅ 올바른 방법: 서버에서 데이터 전달
export default async function UserPage() {
  const user = await getUser()
  return <UserProfile user={user} />
}

function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>
}
```

## 코드 품질 체크리스트

개발 완료 후 다음 명령어들을 반드시 실행하세요:

```bash
# 🚀 필수: 타입 체크
npm run typecheck

# 🚀 필수: 린트 검사 (16에서 next lint 제거, ESLint 직접 실행)
npm run lint

# ✅ 권장: 포맷 검사
npm run format:check

# 🚀 필수: 통합 검사
npm run check-all

# 🚀 필수: 빌드 테스트
npm run build
```

이 지침을 따라 Next.js 16의 모든 기능을 최대한 활용하여 현대적이고 성능 최적화된 애플리케이션을 개발하세요.
