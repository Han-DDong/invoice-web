# Task 004: 공통 컴포넌트 기반 구축

> 상태: ✅ 완료

## 명세서

Phase 2(더미 데이터 기반 UI)의 선행 작업입니다. 견적서 화면에서 공통으로 쓰는 shadcn 컴포넌트, 포맷 유틸, 더미 견적서 데이터를 준비합니다.

### 설계 결정

- shadcn 컴포넌트는 CLI(`npx shadcn@latest add`)로만 추가하고 직접 작성하지 않습니다.
- 더미 견적서는 노션 CSV 예시 기준이며, 항목 금액은 `calculateItemAmount`로 채웁니다. 합계는 항목 금액 합계(60,000,000원)입니다.
- 더미의 `id`는 노션 페이지 ID 자리이며 URL 토큰으로 그대로 씁니다. 고정 토큰은 `shareTokenSchema`(16자 이상 영문/숫자)를 통과합니다.
- 더미 파일 경로는 `lib/dummy/invoice.ts`입니다. (shrimp 초안의 `lib/mock/invoices.ts`에서 변경)
- 더미는 Task 008에서 노션 조회 결과로 교체합니다.

## 관련 파일

- `components/ui/table.tsx`, `components/ui/separator.tsx` - shadcn 추가 (신규)
- `lib/format.ts` - `formatCurrency`(예: `55,000,000원`), `formatDate`(예: `2026년 11월 3일`) (신규)
- `lib/dummy/invoice.ts` - `DUMMY_TOKENS`, `getDummyInvoice(token)` (신규)
- `shrimp-rules.md` - 상태값 서술과 `components/ui` 목록 갱신 (수정)

## 더미 견적서

| 토큰 | 용도 |
| --- | --- |
| `dummyinvoicepending0001` | 상태 대기 |
| `dummyinvoiceapproved001` | 상태 승인 |
| `dummyinvoicerejected001` | 상태 거절 |
| `dummyinvoiceempty000001` | 항목 0건 (빈 상태 확인) |
| `dummyinvoiceexpired0001` | 유효기간 경과 (만료 처리 검증은 Task 008) |

`getDummyInvoice(token)`은 해당하는 더미가 없으면 `null`을 반환합니다.

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과, `any` 사용 없음
- [x] 더미 합계가 60,000,000원 (화면에서 확인)
- [x] 상태별(대기/승인/거절), 항목 0건, 만료 더미가 고정 토큰으로 제공됨
- [x] `getDummyInvoice`가 없는 토큰에 `null` 반환
- [x] `shrimp-rules.md`의 상태값과 `components/ui` 목록이 현재 코드와 일치

## 구현 단계

- [x] shadcn `table`, `separator` 추가
- [x] `formatCurrency`, `formatDate` 작성
- [x] 더미 견적서 5종과 `getDummyInvoice` 작성
- [x] 디자인 토큰(OKLCH) 점검 (변경 없음)
- [x] `shrimp-rules.md` 최소 수정

## 후속 확인 사항

- `app/globals.css` 토큰은 점검만 했고 추가하지 않았습니다.
- 만료 더미의 만료 판정(유효기간 경과 시 접근 불가)은 노션 조회와 함께 Task 008에서 구현합니다. 현재는 일반 견적서처럼 표시됩니다.

## 검증 결과 (2026-11-12)

- `npm run lint` 에러 없음, `npx tsc --noEmit` 에러 없음, `npm run build` 성공
- 합계 60,000,000원을 375/768/1280px 화면에서 확인
- 항목 0건 더미(`dummyinvoiceempty000001`)는 1280px 다크 모드에서 빈 상태와 합계 0원을 확인
- 만료 더미는 데이터만 만들었고 화면 동작은 확인 대상이 아님 (Task 008)
