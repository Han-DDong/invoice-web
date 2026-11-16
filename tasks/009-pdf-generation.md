# Task 009: PDF 생성 및 다운로드

> 상태: ✅ 009-A, 009-B 구현 완료 (만료 410 응답은 실데이터 미확인)

Task 009는 병렬 개발을 위해 둘로 나눕니다.

- **009-A (트랙 B)**: 한글 폰트 등록과 PDF 템플릿. 노션 연동과 무관하게 진행
- **009-B (합류)**: PDF Route Handler와 다운로드 버튼 연결. `getAccessibleInvoice`(Task 008)와 009-A에 의존

## 명세서

견적서를 한글이 깨지지 않는 PDF로 내려받게 합니다. 템플릿은 화면과 같은 `Invoice` / `InvoiceTotals`를 사용해 금액 불일치를 막습니다. (합계 = 항목 금액 합계, 부가세 없음)

### 설계 결정 (009-A)

- 폰트: Noto Sans KR 정적 OTF(Regular, Bold), SIL OFL 1.1. `assets/fonts/`에 저장소와 함께 포함하며 라이선스 파일(`OFL.txt`)을 동봉합니다. 출처는 notofonts/noto-cjk의 `Sans/SubsetOTF/KR`입니다.
- 폰트 파일은 `process.cwd()` 기준 `assets/fonts` 경로로 읽습니다. (`lib/pdf/fonts.ts`)
- `registerPdfFonts()`는 모듈 변수로 중복 등록을 막습니다. 한글 단어 중간 줄바꿈을 위해 하이픈 처리 콜백을 끕니다.
- 템플릿(`InvoicePdfDocument`)은 `InvoicePdfProps(invoice, totals)`만 받습니다. 금액과 날짜는 `formatCurrency`, `formatDate`를 재사용합니다.
- 항목 표 헤더는 `fixed`로 페이지마다 반복하고, 항목 행과 합계 박스는 `wrap={false}`로 페이지 경계에서 잘리지 않게 합니다. 페이지 번호는 `render`로 `n / N`을 표시합니다.
- PDF 스타일은 `StyleSheet.create`의 고정 색상을 사용합니다. PDF는 테마(다크 모드)와 무관합니다.
- `renderToBuffer`는 `Document` 요소를 요구하므로 `renderToBuffer(InvoicePdfDocument({ invoice, totals }))`처럼 컴포넌트를 직접 호출합니다. (`createElement`로 감싸면 타입 오류) 009-B 라우트도 같은 방식으로 호출해야 합니다.
- `@react-pdf/renderer`는 Next 16.4.6 기본 external 목록에 있어 `serverExternalPackages` 설정이 필요 없습니다.
- 서버리스 번들: 빌드 산출물(`.next/server/app/<route>/route.js.nft.json`)에 `assets/fonts/*`가 자동 포함되는 것을 확인해 `outputFileTracingIncludes`는 필요 없습니다.

## 관련 파일

- `assets/fonts/NotoSansKR-Regular.otf`, `NotoSansKR-Bold.otf`, `OFL.txt` - 한글 폰트와 라이선스 (신규, 009-A)
- `lib/pdf/fonts.ts` - `PDF_FONT_FAMILY`, `registerPdfFonts` (신규, 009-A)
- `components/pdf/invoice-template.tsx` - `InvoicePdfDocument` (신규, 009-A)
- `types/pdf.ts` - `InvoicePdfProps` (변경 없음)
- `app/invoice/[token]/pdf/route.ts` - PDF Route Handler (신규, 009-B)
- `components/invoice/pdf-download-button.tsx` - token 기반 다운로드 링크로 전환 (수정, 009-B)

## 수락 기준

### 009-A

- [x] 한글 글리프가 깨지지 않음 (PDF를 이미지로 변환해 눈으로 확인)
- [x] 굵은 글씨(제목, 표 헤더, 합계)가 적용됨
- [x] 항목 45건이 3페이지로 나뉘고 헤더가 페이지마다 반복되며 행이 잘리지 않음
- [x] 45건 합계 10,350,000원이 항목 금액 합계와 일치, 더미 3건 합계 60,000,000원 (부가세 없음)
- [x] 생성 시간 5초 미만 (개발 서버 0.2~0.8초, 프로덕션 빌드 0.4초)
- [x] 프로덕션 빌드 결과물에서도 PDF 생성 성공
- [x] 임시 PoC 라우트가 `app/`에 남아 있지 않음
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과

### 009-B

- [x] `/invoice/[token]/pdf`가 `getAccessibleInvoice`로 화면과 같은 검증 후 PDF를 내려줌
- [x] 실패 응답: invalid / not_found는 404, error는 500 (원문 비노출)
- [ ] expired는 410 (코드는 구현, 만료된 실데이터가 없어 미확인)
- [x] 다운로드 버튼이 token 기반 링크로 동작하고 `TODO(F003)` 주석 제거
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과 (`/invoice/[token]/pdf`는 ƒ 동적)

## 구현 단계

- [x] (009-A) 폰트 확정: Noto Sans KR
- [x] (009-A) `lib/pdf/fonts.ts` 폰트 등록
- [x] (009-A) `components/pdf/invoice-template.tsx` 템플릿
- [x] (009-A) 임시 PoC 라우트로 한글, 페이지 넘김, 시간 확인 후 삭제
- [x] (009-A) 번들 포함 여부 확인
- [x] (009-B) Route Handler 구현 (`app/invoice/[token]/pdf/route.ts`)
- [x] (009-B) 다운로드 버튼 연결(`PdfDownloadButton`에 token 전달)과 README 라우트 표, 폴더 구조 갱신
- [x] (009-B) Playwright MCP로 다운로드 확인

## 후속 확인 사항

- 한글 폰트 파일이 약 9.5MB(Regular 4.6MB + Bold 4.8MB)로 저장소 크기가 늘었습니다. 줄이려면 서브셋 생성이 필요하며 Task 010(폰트 최적화) 범위입니다.
- 굵기는 Regular(400)와 Bold(700)만 등록했습니다.
- 가변 폰트는 쓰지 않았으므로 가변 폰트 호환성 문제는 확인하지 않았습니다.
- 페이지 2의 모습은 직접 확인하지 못했고, 1페이지와 3페이지(헤더 반복, 합계)만 이미지로 확인했습니다.
- 다운로드 링크에는 `download` 속성을 쓰지 않았습니다. 실패(404/410/500) 때 빈 파일이 내려받아지는 대신 오류 문구를 화면에 보여주기 위해서이며, 성공 응답은 `Content-Disposition: attachment`로 다운로드됩니다.
- 파일명은 `invoice-<견적서 번호>.pdf`이며 영문, 숫자, 하이픈 외 문자는 `_`로 바꿉니다. 한글 파일명은 쓰지 않습니다.
- PDF 응답 시간은 첫 요청 2.3초, 이후 0.6~1.4초였습니다. (5초 미만)

## 테스트 체크리스트

Playwright MCP 시나리오 (009-B 구현 후, `npm run dev`)

- [x] 유효기간이 지나지 않은 견적서 페이지에서 "PDF 다운로드" 클릭 → `invoice-INV-2026-011.pdf` 다운로드, 응답 `Content-Type: application/pdf`
- [x] 내려받은 PDF에서 한글(삼성물산, 항목명)이 깨지지 않고 합계 60,000,000원이 화면과 같음
- [ ] 항목 40건 이상인 견적서에서 표 헤더 반복, 행 잘림 없음
- [x] 형식 오류 토큰 `/invoice/short/pdf` → 404
- [x] 존재하지 않는 페이지 ID `/invoice/00000000000000000000000000000000/pdf` → 404
- [ ] 만료된 견적서 `/pdf` → 410 (만료된 실데이터 필요, 미확인)
- [x] 노션 조회 실패(잘못된 키로 프로덕션 빌드 임시 실행) → 500, 본문과 서버 로그에 키 없음
- [x] PDF 생성 5초 미만
