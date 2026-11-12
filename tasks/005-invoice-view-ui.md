# Task 005: 견적서 조회 페이지 UI

> 상태: ✅ 완료

## 명세서

더미 데이터로 견적서 조회 화면을 구현합니다. 헤더, 클라이언트 정보, 항목 표, 합계, PDF 다운로드 버튼(UI만)을 조립하고 모바일/태블릿/데스크톱에서 동작하게 합니다.

### 설계 결정

- 모두 서버 컴포넌트이며, 클릭 동작이 필요한 `PdfDownloadButton`만 클라이언트 컴포넌트입니다.
- 항목 표는 `md` 미만에서 카드 목록, `md` 이상에서 표로 보여 줍니다. 숨겨지는 쪽은 `display: none`이라 스크린리더에 중복 노출되지 않습니다.
- 합계는 항목 금액 합계만 표시하고 부가세 행은 없습니다. (`calculateInvoiceTotals` 재사용)
- 상태 배지: 대기=secondary, 승인=default, 거절=destructive
- `app/invoice/[token]/page.tsx`는 토큰 형식 검증 후 `getDummyInvoice(token)`으로 조회하고, 없으면 `notFound()`로 404 화면을 보여 줍니다. 더미 사용 지점은 이곳 한 곳입니다.
- 레이아웃은 `loading.tsx`와 같은 `max-w-4xl` 구조입니다.

## 관련 파일

- `components/invoice/invoice-status-badge.tsx` (신규)
- `components/invoice/invoice-header.tsx` - 견적서 번호, 발행일, 상태 배지, PDF 버튼 (신규)
- `components/invoice/invoice-client-info.tsx` - 클라이언트명, 발행일, 유효기간 (신규)
- `components/invoice/invoice-items-table.tsx` - 모바일 카드/데스크톱 표 (신규)
- `components/invoice/invoice-totals.tsx` - 합계 (신규)
- `components/invoice/invoice-view.tsx` - 위 컴포넌트 조립 (신규)
- `components/invoice/pdf-download-button.tsx` - UI만, 동작은 Task 009 (신규)
- `app/invoice/[token]/page.tsx` - 더미 조회와 조립 (수정)

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과, `any` 사용 없음
- [x] 375px에서 가로 스크롤이 없고 항목이 카드로 표시됨
- [x] 768px, 1280px에서 항목이 표로 표시됨
- [x] 상태 3종(대기/승인/거절) 배지가 각각 표시됨
- [x] 합계가 항목 금액 합계와 일치하고 부가세 행이 없음 (60,000,000원)
- [x] 존재하지 않는 토큰은 404, 형식이 잘못된 토큰은 `/unavailable?reason=invalid`로 이동

## 구현 단계

- [x] 상태 배지, 헤더, 클라이언트 정보 컴포넌트 작성
- [x] 항목 표(카드/표 전환)와 합계 컴포넌트 작성
- [x] `PdfDownloadButton` UI 작성 (동작 미구현, TODO(F003) 표시)
- [x] `InvoiceView`로 조립하고 `page.tsx`에 연결
- [x] `page.tsx`의 낡은 TODO 주석(공유토큰, 부가세)을 현재 설계 기준으로 정정
- [x] Playwright MCP로 375/768/1280px 확인

## 후속 확인 사항

- PDF 다운로드 버튼은 클릭해도 동작하지 않습니다. Task 009에서 `/invoice/[token]/pdf` 라우트와 연결합니다.
- 노션 조회 실패(`error`) 처리는 Task 007~008에서 구현합니다.

## 검증 결과 (2026-11-12)

- `npm run lint` 에러 없음, `npx tsc --noEmit` 에러 없음, `npm run build` 성공
- Playwright MCP (다크 모드, 개발 서버 `localhost:3000`)

| 뷰포트 | 견적서 | 결과 |
| --- | --- | --- |
| 375px | 대기 | 항목 카드 목록, 가로 스크롤 없음 (`scrollWidth` 375) |
| 768px | 승인 | 표 표시, 3열 정보 배치 |
| 1280px | 거절 | 표 표시, 거절 배지(destructive) |

- 존재하지 않는 토큰(`doesnotexisttoken0001`)은 404 화면, 형식 오류 토큰(`short`)은 `/unavailable?reason=invalid`로 이동
- 라이트 모드에서의 견적서 화면은 확인하지 못함 (404 화면만 라이트 확인)
