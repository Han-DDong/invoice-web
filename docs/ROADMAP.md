# 노션 기반 견적서 관리 시스템 MVP 개발 로드맵

노션을 데이터베이스로 활용하여 견적서를 관리하고, 클라이언트가 웹에서 조회 및 PDF 다운로드할 수 있는 시스템

## 개요

노션 기반 견적서 관리 시스템 MVP는 프리랜서와 소규모 기업을 위한 간단하고 효율적인 견적서 관리 솔루션으로 다음 기능을 제공합니다:

- **노션 데이터베이스 연동**: Notion API를 통한 실시간 견적서 데이터 조회
- **견적서 웹 조회**: 고유 URL을 통한 견적서 내용 확인
- **PDF 다운로드**: 견적서를 PDF 파일로 변환하여 저장 및 인쇄

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - `/tasks` 디렉토리에 새 작업 파일 생성
   - 명명 형식: `XXX-description.md` (예: `001-setup.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - 예시를 위해 `/tasks` 디렉토리의 마지막 완료된 작업 참조
   - API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)

3. **작업 구현**
   - 작업 파일의 명세서를 따름
   - 기능과 기능성 구현
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP 테스트 필수
   - 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
   - 테스트 통과 확인 후 다음 단계로 진행
   - 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시

## 개발 단계

### Phase 1: 애플리케이션 골격 구축 ✅

- **Task 001: 프로젝트 초기 설정 및 환경 구성** ✅ - 완료 ([작업 파일](../tasks/001-project-setup.md))
  - ✅ Next.js 16 프로젝트 기본 구조 검증
  - ✅ 환경 변수 스키마 검증 (`lib/env.ts`, `.env.example`, 3개 변수, `.env.local`은 직접 생성)
  - ✅ TypeScript 및 ESLint 설정 확인
  - ✅ Notion API 연동을 위한 환경 구성

- **Task 002: 라우팅 구조 및 페이지 골격 생성** ✅ - 완료 ([작업 파일](../tasks/002-routing-skeleton.md))
  - ✅ App Router 기반 라우트 구조 구현 (/invoice/[token], 토큰은 노션 페이지 ID)
  - ✅ 견적서 조회 페이지 골격 생성
  - ✅ 로딩(loading), 에러(error), 404(not-found) 화면 생성
  - ✅ 접근 불가 페이지(/unavailable)와 공통 `StatusCard`
  - ✅ 기본 레이아웃 컴포넌트 설정

- **Task 003: 타입 정의 및 데이터 모델 설계** ✅ - 완료 ([작업 파일](../tasks/003-types-and-models.md))
  - ✅ 견적서 도메인 타입 정의 (실제 노션 DB 기준, 부가세 없음)
  - ✅ Notion API 응답 Zod 스키마 정의
  - ✅ PDF 생성 관련 타입 정의
  - ✅ 에러 핸들링 타입 정의 (`InvoiceFetchError`)
  - ✅ 합계 계산 유틸 (`calculateInvoiceTotals`)

### Phase 2: UI/UX 완성 (더미 데이터 활용)

- **Task 004: 공통 컴포넌트 라이브러리 구축** ✅ - 완료
  - shadcn/ui 설정 점검 (new-york 스타일) 및 필요한 컴포넌트 추가 (Button, Card, Table, Badge 등)
  - 노션 CSV 예시 기준 더미 견적서 데이터 작성 (`types/invoice.ts`의 `Invoice`, `InvoiceItem` 타입 준수, 부가세 없음)
  - 더미 데이터 합계는 `calculateInvoiceTotals`로 계산 (합계 = 항목 금액 합계)
  - 디자인 시스템 토큰 점검 (색상, 타이포그래피)

- **Task 005: 견적서 조회 페이지 UI 구현** ✅ - 완료
  - 견적서 헤더 컴포넌트 (견적서 번호, 발행일, 유효기간, 상태 배지: 대기/승인/거절)
  - 클라이언트 정보 섹션
  - 견적 항목 테이블 컴포넌트 (항목명, 수량, 단가, 금액)
  - 합계 요약 섹션 (항목 금액 합계, 부가세 없음)
  - PDF 다운로드 버튼 UI
  - 반응형 레이아웃 구현 (모바일/태블릿/데스크톱)

- **Task 006: 에러 및 로딩 상태 UI 구현**
  - Phase 1에서 만든 404, 접근 불가(`StatusCard`) 화면 디자인 고도화
  - 견적서 상세 레이아웃에 맞춘 로딩 스켈레톤 컴포넌트
  - 에러 메시지 컴포넌트
  - 빈 상태(Empty state) 컴포넌트 (견적 항목 0건 등)

### Phase 3: 핵심 기능 구현

- **Task 007: Notion API 통합 구현**
  - Notion API 클라이언트 설정 (`@notionhq/client`, 환경변수 3개 사용)
  - 견적서 데이터 조회 서비스 구현 (노션 페이지 ID 기반 단건 조회)
  - 견적 항목 데이터 조회 로직 (`NOTION_ITEM_DATA_SOURCE_ID` 기준 관계 항목 조회)
  - 에러 핸들링 및 재시도 로직 (`InvoiceFetchError` 활용)
  - Zod 스키마 기반 데이터 변환 및 정규화 유틸리티
  - Playwright MCP를 활용한 조회 플로우 통합 테스트

- **Task 008: 견적서 데이터 페칭 및 렌더링**
  - Server Component에서 Notion 데이터 페칭
  - 더미 데이터를 실제 노션 데이터로 교체
  - 동적 라우팅 파라미터(`/invoice/[token]`, 토큰 = 노션 페이지 ID) 처리
  - 데이터 유효성 검증 및 존재하지 않는 견적서 처리 (F011)
  - 노션 데이터 최신 상태 반영 (캐시 재검증 전략)
  - Playwright MCP로 데이터 렌더링 E2E 테스트

- **Task 009: PDF 생성 및 다운로드 기능**
  - @react-pdf/renderer 설치 및 설정
  - PDF 템플릿 컴포넌트 개발 (`types/pdf.ts` 타입 활용)
  - Route Handler 구현 (`app/invoice/[token]/pdf/route.ts`)
  - PDF 다운로드 트리거 로직
  - 한글 폰트 지원 설정
  - Playwright MCP로 PDF 생성 플로우 테스트

- **Task 009-1: 핵심 기능 통합 테스트**
  - Playwright MCP를 사용한 전체 사용자 플로우 테스트
  - API 연동 및 비즈니스 로직 검증
  - 에러 핸들링 및 엣지 케이스 테스트
  - 데이터 무결성 및 일관성 검증 (합계 = 항목 금액 합계)
  - 성능 및 응답 시간 테스트

### Phase 4: 고급 기능 및 최적화

- **Task 010: 성능 최적화 및 캐싱**
  - Next.js 캐싱 전략 구현
  - 이미지 최적화 설정
  - 폰트 최적화 (subset 생성)
  - Notion API 호출 최적화
  - React Suspense 경계 설정

- **Task 011: 보안 및 에러 처리 강화**
  - API 키 보안 검증
  - Rate limiting 구현
  - 상세 에러 로깅 시스템
  - 404/500 에러 처리 개선
  - CORS 정책 설정

- **Task 012: 테스트 및 배포 준비**
  - 단위 테스트 작성 (컴포넌트, 유틸리티)
  - 통합 테스트 작성 (API, 페이지)
  - E2E 테스트 시나리오 구현 (Playwright MCP 사용)
  - Vercel 배포 설정
  - 환경별 설정 관리 (dev/staging/prod)

## 작업별 상세 구현 사항

### Task 001: 프로젝트 초기 설정 및 환경 구성

**예상 소요 시간**: 2-3시간

**구현 내용**:

- `.env.local` 파일에 환경 변수 설정 (비밀값이므로 직접 생성)
  ```env
  NOTION_API_KEY=secret_xxxxxxxxxxxxx
  NOTION_INVOICE_DATA_SOURCE_ID=xxxxxxxxxxxxx
  NOTION_ITEM_DATA_SOURCE_ID=xxxxxxxxxxxxx
  ```
  (`NOTION_DATABASE_ID`는 폐기된 설계)
- `lib/env.ts`의 환경변수 스키마 검증
- TypeScript 설정 검증 (`tsconfig.json`)
- ESLint 설정 확인

**완료 기준**:

- ✅ 환경 변수 3개가 `lib/env.ts`, `.env.example`, README에서 일치함
- ✅ 모든 의존성이 설치되고 버전이 일치함 (Next.js 16, @notionhq/client 5)
- ✅ 개발 서버가 정상 실행됨 (`npm run dev`)
- ✅ 린트 및 타입 체크 통과
- ✅ Shrimp Task Manager MCP 서버 통합 완료

### Task 002: 라우팅 구조 및 페이지 골격 생성

**예상 소요 시간**: 3-4시간

**구현 내용**:

- `app/invoice/[token]/page.tsx` (토큰 형식 검증, 노션 조회는 Task 007~008에서 구현)
- `app/invoice/[token]/loading.tsx` 스켈레톤
- `app/invoice/[token]/error.tsx` 에러 경계
- `app/not-found.tsx` 커스텀 404 페이지
- `app/unavailable/page.tsx` 접근 불가 안내
- `components/layout/status-card.tsx` 공통 안내 카드

**완료 기준**:

- ✅ 동적 라우팅이 정상 작동함 (/invoice/[token] 구조 구현)
- ✅ 형식이 잘못된 토큰은 /unavailable?reason=invalid로 이동함
- ✅ 404 페이지가 올바르게 표시됨 (커스텀 not-found.tsx 구현)
- ✅ 에러 화면이 에러 원문을 노출하지 않음
- ✅ 모바일, 데스크톱 뷰포트에서 레이아웃이 깨지지 않음

### Task 003: 타입 정의 및 데이터 모델 설계

**예상 소요 시간**: 2-3시간

**구현 내용**:

- `types/invoice.ts` - 견적서 도메인 타입 (`Invoice`, `InvoiceItem`, `InvoiceStatus`, `InvoiceTotals`)
- `types/notion.ts` - Notion API 응답 Zod 스키마
- `types/pdf.ts` - PDF 생성 관련 타입
- `types/invoice-error.ts` - 노션 조회 실패 타입과 접근 불가 사유 변환
- `lib/constants.ts` - 상수 정의
- `lib/invoice-calculations.ts` - 항목 금액과 합계 계산

**설계 결정** (실제 노션 DB 기준):

- 부가세 없음, 합계 = 항목 금액 합계
- 공유토큰 없음, URL 토큰 = 노션 페이지 ID
- 상태는 노션 값(대기/승인/거절) 그대로 사용

**완료 기준**:

- ✅ 모든 데이터 모델이 타입으로 정의됨 (Invoice, InvoiceItem, InvoiceTotals)
- ✅ Notion API 응답이 Zod 스키마로 정의됨 (견적서, 견적 항목 페이지)
- ✅ TypeScript 컴파일 에러가 없음, `any` 사용 없음
- ✅ 항목 금액은 수량 x 단가로 재계산됨 (CSV 예시 합계 60,000,000 일치)

### Task 007: Notion API 통합 구현

**예상 소요 시간**: 4-5시간

**구현 내용**:

- `/lib/notion.ts` - Notion 클라이언트 초기화
- `/lib/services/invoice.service.ts` - 견적서 데이터 서비스
- `/lib/utils/notion-parser.ts` - Notion 데이터 파싱 유틸리티
- API 에러 핸들링 및 재시도 로직
- 데이터 변환 및 검증 로직

**완료 기준**:

- [ ] Notion API 연결이 성공함
- [ ] 노션 페이지 ID로 견적서 데이터를 정상적으로 조회함
- [ ] 데이터가 Zod 스키마 검증 후 도메인 타입으로 변환됨
- [ ] 에러 처리가 적절히 구현됨 (`InvoiceFetchError` 사유별 처리)

### Task 009: PDF 생성 및 다운로드 기능

**예상 소요 시간**: 5-6시간

**구현 내용**:

- `/components/pdf/invoice-template.tsx` - PDF 템플릿
- `/app/invoice/[token]/pdf/route.ts` - PDF 생성 Route Handler (계획 경로)
- `/lib/pdf/generator.ts` - PDF 생성 로직
- 한글 폰트 설정 및 스타일링
- 다운로드 트리거 및 파일명 설정

**완료 기준**:

- [ ] PDF가 정상적으로 생성됨
- [ ] 한글이 올바르게 표시됨
- [ ] 레이아웃이 견적서 형식에 맞음 (합계 = 항목 금액 합계, 부가세 없음)
- [ ] 다운로드가 모든 브라우저에서 작동함

## 기술적 의존성 관계

```mermaid
graph TD
    A[Task 001: 환경 설정] --> B[Task 002: 라우팅 구조]
    A --> C[Task 003: 타입 정의]
    B --> D[Task 004: 컴포넌트 라이브러리]
    C --> D
    D --> E[Task 005: 견적서 UI]
    D --> F[Task 006: 에러 UI]
    C --> G[Task 007: Notion API]
    E --> H[Task 008: 데이터 렌더링]
    G --> H
    E --> I[Task 009: PDF 생성]
    H --> I
    H --> J[Task 010: 성능 최적화]
    I --> J
    J --> K[Task 011: 보안 강화]
    K --> L[Task 012: 테스트/배포]
```

## MVP 체크리스트

### 핵심 기능 구현 확인

- [ ] **F001**: Notion API를 통한 견적서 데이터 조회
- [ ] **F002**: 고유 URL로 특정 견적서 내용 표시
- [ ] **F003**: 견적서를 PDF 파일로 변환 및 다운로드

### 필수 지원 기능 구현 확인

- [ ] **F010**: 노션 페이지 ID 기반 고유 URL (`/invoice/[token]`) - 라우트 골격과 토큰 형식 검증은 Phase 1에서 완료, 실제 조회 연동 대기
- [ ] **F011**: 존재하지 않는 견적서 접근 시 에러 처리
- [ ] **F012**: 반응형 레이아웃 (모바일/태블릿/데스크톱)

### 품질 검증

- [ ] 모든 페이지가 정상적으로 로드됨
- [ ] Notion 데이터 변경이 웹 화면에 반영됨
- [ ] PDF 다운로드가 모든 환경에서 작동함
- [ ] 에러 처리가 사용자 친화적임
- [ ] 반응형 디자인이 모든 기기에서 작동함

### 테스트 검증

- [ ] API 연동 및 비즈니스 로직에 Playwright MCP 테스트 수행되었는가?
- [ ] 모든 사용자 플로우가 E2E 테스트되었는가?
- [ ] 에러 핸들링 및 엣지 케이스가 테스트되었는가?

## 예상 개발 일정

**총 예상 기간**: 2-3주 (1인 개발 기준)

- **Week 1**: Phase 1 ✅ + Phase 2 (Task 001-006)
  - ✅ 프로젝트 설정 완료 (Task 001-003 완료)
  - UI 구현 (Task 004-006)
  - 더미 데이터로 전체 플로우 검증

- **Week 2**: Phase 3 (Task 007-009)
  - Notion API 통합 (Task 007)
  - 실제 데이터 연동 (Task 008)
  - PDF 생성 기능 구현 (Task 009)
  - 통합 테스트 및 검증 (Task 009-1)

- **Week 3**: Phase 4 (Task 010-012)
  - 성능 최적화
  - 테스트 및 버그 수정
  - 배포 준비 및 실제 배포

## 위험 요소 및 대응 방안

### 기술적 위험

1. **Notion API 제한**
   - Rate limit 초과 가능성
   - 대응: 캐싱 전략 구현, 요청 최적화

2. **PDF 한글 렌더링 문제**
   - 폰트 임베딩 이슈
   - 대응: 사전 테스트, 대체 라이브러리 준비

3. **대용량 견적서 처리**
   - 많은 항목 시 성능 저하
   - 대응: 페이지네이션, 가상 스크롤링

### 비즈니스 위험

1. **사용자 경험 저하**
   - 느린 로딩 속도
   - 대응: 스켈레톤 UI, 점진적 로딩

2. **보안 이슈**
   - API 키 노출
   - 대응: 서버 사이드 처리, 환경 변수 관리

## 성공 지표

- **기술적 지표**
  - 페이지 로드 시간 < 3초
  - PDF 생성 시간 < 5초
  - 에러율 < 1%

- **사용자 경험 지표**
  - 모바일 반응형 100% 지원
  - 크로스 브라우저 호환성 100%
  - 견적서 조회 성공률 > 99%

---

**📝 문서 버전**: v2.0
**📅 작성일**: 2026-11-11
**📅 최종 업데이트**: 2026-11-12
**🎯 목표**: MVP 핵심 기능 구현을 통한 빠른 시장 검증
**📊 진행 상황**: Phase 1 완료 (Task 001~003), Phase 2~4 대기
