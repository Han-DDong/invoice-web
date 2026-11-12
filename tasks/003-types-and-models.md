# Task 003: 타입, 상수, 합계 계산 유틸

> 상태: ✅ 완료

## 명세서

실제 노션 DB(견적서, 견적 항목)의 CSV 구조에 맞춰 도메인 타입과 노션 응답 스키마를 정의하고, 합계 계산 유틸을 만듭니다.

### 실제 노션 DB 구조

- 견적서: `견적서 번호, 발행일, 상태, 유효기간, 총 금액, 클라이언트명, 항목(relation)`
- 견적 항목: `항목명, Invoice(relation), 금액, 단가, 수량`

### 설계 결정

- 부가세 없음: 합계는 항목 금액의 합이며, CSV의 총 금액과 일치합니다.
- 공유토큰 없음: URL 토큰은 노션 페이지 ID입니다. (`shareTokenSchema` 형식 검증 재사용)
- 비고 없음, `recipient`는 `clientName`으로 변경
- 상태는 노션 값 그대로 `대기 / 승인 / 거절`을 사용하며, 알 수 없는 값은 파싱에 실패합니다.
- 노션의 `금액`, `총 금액`은 참고용이며 계산에는 쓰지 않습니다. 금액은 수량 x 단가로 재계산합니다.

## 관련 파일

- `types/invoice.ts` - 도메인 타입 (`Invoice`, `InvoiceItem`, `InvoiceStatus`, `InvoiceTotals`) (수정)
- `types/notion.ts` - 노션 응답 Zod 스키마, 속성 이름 상수 (신규)
- `types/pdf.ts` - `InvoicePdfProps` (신규)
- `types/invoice-error.ts` - `InvoiceFetchError`, `toUnavailableReason` (신규)
- `lib/constants.ts` - `PDF_FILE_NAME_PREFIX` (신규)
- `lib/invoice-calculations.ts` - `calculateItemAmount`, `calculateInvoiceTotals` (신규)
- `lib/access.ts` - `UnavailableReason` 재사용 (변경 없음)
- `README.md` - 폴더 구조

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit` 통과, `any` 사용 없음
- [x] CSV 예시 항목(55,000,000 x 1 + 500,000 x 2 + 10,000 x 400)의 합계가 60,000,000
- [x] CSV와 같은 형태의 mock 응답이 스키마를 통과하고, 알 수 없는 상태 값은 실패
- [x] `toUnavailableReason`이 기존 `UnavailableReason` 값만 사용 (`not_found`는 `invalid`, 나머지는 `error`)
- [x] `calculateInvoiceTotals`가 env, 노션 클라이언트에 의존하지 않는 순수 함수

## 구현 단계

- [x] 노션 SDK 설치 타입(`@notionhq/client`)으로 속성 응답 구조 확인
- [x] 도메인 타입 수정, 노션 스키마, PDF props, 에러 타입 작성
- [x] 상수와 계산 유틸 작성
- [x] 스크래치패드 스크립트로 스키마와 합계 검증 (프로젝트에 테스트 파일 추가 없음)
- [x] README 폴더 구조 갱신

## 후속 확인 사항

- 실제 노션 응답으로 속성 타입(`클라이언트명`, `총 금액` 등)을 맞춰 봐야 합니다. 노션 조회(F001) 구현 단계에서 진행합니다.
- 스키마의 날짜는 노션 API가 주는 ISO 형식 기준입니다. CSV의 `2026년 11월 3일` 형식은 내보내기 전용입니다.
