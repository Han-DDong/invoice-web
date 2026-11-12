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
- 배포: **Vercel** / 패키지 관리: **npm**

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local에 노션 키와 데이터 소스 ID 입력)
cp .env.example .env.local

# 3. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

### 환경변수

| 이름 | 설명 |
| --- | --- |
| `NOTION_API_KEY` | 노션 통합(Integration) 시크릿 키 |
| `NOTION_INVOICE_DATA_SOURCE_ID` | 견적서 DB의 데이터 소스 ID |
| `NOTION_ITEM_DATA_SOURCE_ID` | 견적 항목 DB의 데이터 소스 ID |

스키마 검증은 `lib/env.ts`에서 수행합니다.

## 라우트

| 경로 | 설명 | 기능 |
| --- | --- | --- |
| `/` | 서비스 소개 (견적서 목록 노출 안 함) | F011, F012 |
| `/invoice/[token]` | 견적서 상세 (공유 토큰 링크로만 진입) | F001~F004 |
| `/unavailable?reason=...` | 접근 불가 안내 (`invalid`, `unpublished`, `expired`, `error`) | F004, F010 |
| (미매칭 경로) | 한국어 404 안내 (`app/not-found.tsx`) | F010 |

`/invoice/[token]` 세그먼트에는 로딩 스켈레톤(`loading.tsx`)과 에러 경계(`error.tsx`, 다시 시도 지원)가 있습니다.

## 폴더 구조

```
app/
  page.tsx                  # 홈 (서비스 소개)
  not-found.tsx             # 전역 404 페이지
  invoice/[token]/
    page.tsx                # 견적서 상세
    loading.tsx             # 로딩 스켈레톤
    error.tsx               # 에러 경계 (Client Component)
  unavailable/page.tsx      # 접근 불가 안내
components/
  ui/                       # shadcn/ui 컴포넌트
  layout/                   # navbar, footer, theme-toggle, page-container, status-card
  providers/                # 테마 프로바이더
lib/
  access.ts                 # 공유 토큰/접근 불가 사유 스키마
  constants.ts              # 공통 상수 (PDF 파일명 접두사 등)
  env.ts                    # 서버 환경변수 스키마
  invoice-calculations.ts   # 항목 금액/합계 계산 (순수 함수)
  site.ts                   # 서비스 공통 정보
  utils.ts                  # cn 유틸리티
types/
  invoice.ts                # 견적서 도메인 타입
  invoice-error.ts          # 노션 조회 실패 타입, 접근 불가 사유 변환
  notion.ts                 # 노션 응답 Zod 스키마
  pdf.ts                    # PDF 문서 props 타입
docs/
  PRD.md                    # 요구사항 문서
```

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행
- `npx tsc --noEmit` - 타입 체크

shadcn/ui 컴포넌트 추가: `npx shadcn@latest add [component-name]`
