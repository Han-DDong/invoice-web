# Invoice Web

노션에 입력한 견적서를 클라이언트가 **공유 링크 하나로** 웹에서 확인하고 PDF로 내려받을 수 있게 하는 서비스입니다.
요구사항은 [`docs/PRD.md`](docs/PRD.md)를 참고하세요.

## 기술 스택

- **Next.js 16** (App Router) / **React 19** / **TypeScript** (any 금지)
- **TailwindCSS v4** (설정 파일 없는 CSS 기반 설정) + **shadcn/ui** (New York) + **Lucide React**
- **next-themes** - 라이트/다크/시스템 테마
- **Zod** - 노션 응답 및 환경변수 검증
- **@notionhq/client** - 노션 견적서/항목 DB 조회 (CMS 역할)
- **@react-pdf/renderer** - PDF 생성
- **Vitest** - 단위 테스트 (순수 함수, 노션 조회 서비스, PDF Route Handler, 노션 클라이언트 모킹)
- 배포: **Vercel** / 패키지 관리: **npm**

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local에 노션 키와 데이터베이스 ID 입력)
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

### 환경변수

| 이름                         | 설명                             |
| ---------------------------- | -------------------------------- |
| `NOTION_API_KEY`             | 노션 통합(Integration) 시크릿 키 |
| `NOTION_INVOICE_DATABASE_ID` | 견적서 DB의 데이터베이스 ID      |
| `NOTION_ITEM_DATABASE_ID`    | 견적 항목 DB의 데이터베이스 ID   |

스키마 검증은 `lib/env.ts`에서 수행합니다.

## 라우트

| 경로                      | 설명                                                                                               | 기능       |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| `/`                       | 서비스 소개 (견적서 목록 노출 안 함)                                                               | F011, F012 |
| `/invoice/[token]`        | 견적서 상세 (공유 토큰 링크로만 진입)                                                              | F001~F004  |
| `/invoice/[token]/pdf`    | 견적서 PDF 다운로드 (화면과 같은 접근 판정, 실패 시 404/410/500 텍스트, IP당 1분 10회 초과 시 429) | F003       |
| `/unavailable?reason=...` | 접근 불가 안내 (`invalid`, `unpublished`, `expired`, `error`)                                      | F004, F010 |
| (미매칭 경로)             | 한국어 404 안내 (`app/not-found.tsx`)                                                              | F010       |

`/invoice/[token]` 세그먼트에는 로딩 스켈레톤(`loading.tsx`)과 에러 경계(`error.tsx`, 다시 시도 지원)가 있습니다.
루트 레이아웃 오류는 `app/global-error.tsx`가 자체 `<html>`/`<body>`로 처리합니다. (OS 다크 모드 설정을 따름)

## 보안

- **보안 헤더** (`next.config.ts`의 `headers()`, 모든 경로): `Referrer-Policy: no-referrer`(토큰이 URL 경로에 있어 외부로 Referer를 보내지 않음), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- **CSP**: 도입하지 않았습니다. nonce 방식은 모든 페이지를 동적 렌더링해야 하고, nonce 없는 방식은 `'unsafe-inline'`이 필요하기 때문입니다. `frame-ancestors`를 포함한 CSP는 후속 과제입니다.
- **CORS**: 교차 출처에서 호출하는 API가 없으므로 `Access-Control-Allow-*` 헤더를 추가하지 않고 브라우저 기본 동일 출처 정책을 그대로 씁니다.
- **PDF rate limit** (`lib/rate-limit.ts`, `app/(site)/invoice/[token]/pdf/route.ts`): IP당 1분 10회, 초과 시 `429` + `Retry-After`(초) + `Cache-Control: no-store`. 화면 경로는 제한하지 않습니다.
  - 공식 문서가 Proxy에서 전역 상태에 의존하지 말라고 안내하므로 `proxy.ts`가 아닌 Route Handler 모듈 메모리에 카운터를 둡니다.
  - **한계**: 카운터가 서버 인스턴스 메모리에만 있어 서버리스 인스턴스 사이에 공유되지 않고, 인스턴스가 재시작되면 초기화됩니다. 남용을 완화할 뿐 정확한 제한이 아닙니다. 외부 저장소(Redis 계열)는 의존성과 환경변수가 늘어나 도입하지 않았습니다.
  - IP는 `x-forwarded-for` 첫 값(없으면 `x-real-ip`)을 씁니다. Vercel처럼 플랫폼이 이 헤더를 설정하는 환경을 전제로 하며, 프록시 없이 서버를 직접 노출하면 클라이언트가 헤더를 위조해 제한을 우회할 수 있습니다.
- **로그**: `lib/logger.ts`가 JSON 한 줄로 code, status, 단계, 토큰 앞 6자만 남깁니다. 노션 오류 원문, API 키, DB ID, 전체 토큰은 기록하지 않습니다.

## 폴더 구조

```
app/
  page.tsx                  # 홈 (서비스 소개)
  not-found.tsx             # 전역 404 페이지
  global-error.tsx          # 루트 레이아웃까지 대체하는 전역 에러 화면 (Client Component)
  invoice/[token]/
    page.tsx                # 견적서 상세
    loading.tsx             # 로딩 스켈레톤
    error.tsx               # 에러 경계 (Client Component)
    pdf/route.ts            # PDF 다운로드 Route Handler
  unavailable/page.tsx      # 접근 불가 안내
assets/
  fonts/                    # PDF용 Noto Sans KR (OFL)
components/
  ui/                       # shadcn/ui 컴포넌트
  layout/                   # navbar, footer, theme-toggle, page-container, status-card
  invoice/                  # 견적서 상세 화면 컴포넌트, PDF 다운로드 버튼
  pdf/                      # PDF 템플릿 (@react-pdf/renderer)
  providers/                # 테마 프로바이더
lib/
  access.ts                 # 공유 토큰/접근 불가 사유 스키마
  constants.ts              # 공통 상수 (PDF 파일명 접두사 등)
  env.ts                    # 서버 환경변수 스키마
  invoice-access.ts         # 접근 판정 (토큰 형식, 조회, 유효기간)
  invoice-calculations.ts   # 항목 금액/합계 계산 (순수 함수)
  invoice-service.ts        # 노션 견적서 단건 조회, 성공 결과 30초 캐시 (서버 전용)
  logger.ts                 # 서버 전용 로거 (JSON 한 줄, 오류 원문·키·전체 토큰 미기록)
  rate-limit.ts             # 인메모리 고정 윈도우 rate limiter, 클라이언트 IP 추출 (서버 전용)
  notion.ts                 # 노션 클라이언트 (서버 전용)
  notion-parser.ts          # 노션 응답 Zod 검증과 도메인 변환
  pdf/fonts.ts              # PDF 한글 폰트 등록
  pdf/file-name.ts          # PDF 다운로드 파일명 생성
  site.ts                   # 서비스 공통 정보
  utils.ts                  # cn 유틸리티
types/
  invoice.ts                # 견적서 도메인 타입
  invoice-error.ts          # 노션 조회 실패 타입, 접근 불가 사유 변환
  notion.ts                 # 노션 응답 Zod 스키마
  pdf.ts                    # PDF 문서 props 타입
tests/
  *.test.ts                 # Vitest 단위 테스트
  fixtures/                 # 노션 응답 픽스처
  stubs/                    # server-only 대체 모듈
docs/
  PRD.md                    # 요구사항 문서
```

## 배포 (Vercel)

1. Vercel에서 저장소를 Import합니다. 프레임워크는 Next.js로 자동 감지되며 `vercel.json`은 필요 없습니다. 빌드 명령은 `package.json`의 `build`(`next build --turbopack`)를 그대로 씁니다.
2. Project Settings → Environment Variables에 아래 3개를 **Development / Preview / Production** 각각 설정합니다.
   - `NOTION_API_KEY`, `NOTION_INVOICE_DATABASE_ID`, `NOTION_ITEM_DATABASE_ID`
   - 값은 노션 DB URL의 32자리 **database ID**입니다. data source ID가 아닙니다.
   - `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. (클라이언트 번들에 노출됨)
   - 기본안은 프리뷰와 프로덕션이 **같은 노션 DB**를 쓰는 것입니다. 이 서비스는 조회만 하므로 데이터를 바꾸지 않지만, 프리뷰 링크가 실제 견적서를 보여 준다는 점을 감안해 테스트용 DB를 따로 두려면 Preview 환경에만 다른 ID를 넣습니다.
   - 환경변수는 요청 시점에 검증되므로(`lib/env.ts`) 빌드 자체에는 노션 키가 필요 없습니다. (키 3개를 빈 값으로 덮어쓴 로컬 빌드 성공으로 확인)
3. 배포 후 프리뷰 도메인에서 확인합니다.
   - `/invoice/<정상 토큰>` 화면과 PDF 다운로드, PDF 한글 표시
   - `curl -sSI https://<프리뷰 도메인>/invoice/<정상 토큰>/pdf` → 200, `application/pdf`, `Cache-Control: no-store`, 보안 헤더 3개
   - `curl -sS -o /dev/null -w '%{http_code}\n' https://<프리뷰 도메인>/invoice/short/pdf` → 404
   - PDF 반복 요청 시 429 (인스턴스가 나뉘면 11번째보다 늦게 나올 수 있음)

- **PDF 폰트**: `lib/pdf/fonts.ts`가 `process.cwd()` 기준으로 `assets/fonts`의 OTF를 읽습니다. Next.js 파일 추적이 PDF 라우트에 폰트 3개를 자동 포함하므로(`route.js.nft.json` 확인) `outputFileTracingIncludes`는 넣지 않았습니다. 프리뷰에서 PDF 한글이 깨지거나 500이 나면 `next.config.ts`에 `outputFileTracingIncludes: { '/invoice/\\[token\\]/pdf': ['./assets/fonts/**/*'] }`를 추가합니다.
- **캐시**: 견적서 조회 결과는 `unstable_cache`(30초)에 저장됩니다. 같은 `.next/cache`를 쓰는 로컬 서버끼리는 공유됨을 확인했고, Vercel 인스턴스 간 공유 여부는 프리뷰에서 확인이 필요합니다.
- **CI**: `.github/workflows`는 아직 만들지 않았습니다. (후속 과제: `npm ci` → `npm run check-all` → `npm run build`)

### 브라우저 PDF 수동 체크리스트

다운로드 버튼은 `download` 속성이 없는 `<a>` 링크입니다. 각 브라우저에서 파일명 `invoice-<견적서 번호>.pdf`, 한글 표시, 실패 시 오류 문구가 보이는지 확인합니다.

- [x] Chromium (Playwright, 로컬)
- [ ] Safari (macOS)
- [ ] Firefox
- [ ] iOS Safari
- [ ] Android Chrome

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npm run typecheck` - 타입 체크 (`tsc --noEmit`)
- `npm run format:check` - Prettier 검사
- `npm run test` - Vitest 단위 테스트 (노션 키, 네트워크 불필요)
- `npm run check-all` - 타입, 린트, 포맷, 테스트 일괄 검사

테스트는 `tests/*.test.ts`에 두고 `vitest.config.mts`에서 `server-only`를 빈 모듈로, `@/*`를 tsconfig paths로 해석합니다. async Server Component 화면은 Vitest가 지원하지 않으므로 Playwright로 확인합니다.

shadcn/ui 컴포넌트 추가: `npx shadcn@latest add [component-name]`
