# Task 006: 에러, 빈 상태, 로딩 UI

> 상태: ✅ 완료

## 명세서

Phase 1의 404, 접근 불가, 에러 화면을 공통 `StatusCard`로 정리하고, 견적서 레이아웃에 맞춘 로딩 스켈레톤과 항목 0건 빈 상태를 추가합니다.

### 설계 결정

- 새 에러 컴포넌트를 만들지 않고 `StatusCard`를 확장합니다. (`tone`, `code` prop)
- 중복되던 안내 문구와 버튼은 `StatusCardContactNote`, `StatusCardChecklist`, `StatusCardHomeButton`으로 뽑았습니다.
- 404 화면은 아이콘, 큰 `404`, 제목, 설명, 확인 사항, 홈 버튼 순서입니다. 큰 숫자는 장식이라 `aria-hidden`입니다.
- `error.tsx`의 `retry` 시그니처는 설치된 `next@16.4.6` 번들 문서(v16.3.0부터 `retry` stable)와 일치해 수정하지 않았습니다.
- 에러 원문(`error.message`), 노션 응답, ID는 화면에 노출하지 않습니다.
- `loading.tsx`는 새로 쓰지 않고 실제 컴포넌트 높이와 대조해 보정했습니다.
- 항목 0건이어도 "견적 항목" 제목은 유지하고 그 아래에 빈 상태를 보여 줍니다.

## 관련 파일

- `components/layout/status-card.tsx` - `tone`, `code`, 체크리스트/문의/홈 버튼 (수정)
- `app/not-found.tsx` (수정)
- `app/unavailable/page.tsx` (수정)
- `app/invoice/[token]/error.tsx` (수정)
- `app/invoice/[token]/loading.tsx` - 실제 레이아웃에 맞춰 보정 (수정)
- `components/invoice/invoice-empty-items.tsx` - 항목 0건 빈 상태 (신규)
- `components/invoice/invoice-items-table.tsx` - 빈 상태 연결 (수정)

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과, `any` 사용 없음
- [x] 404 화면이 라이트/다크에서 올바르게 표시됨
- [x] 존재하지 않는 토큰이 404 화면으로 연결됨
- [x] 잘못된 형식의 토큰이 접근 불가 화면(`reason=invalid`)으로 이동하고 가로 스크롤이 없음
- [x] 항목 0건 견적서가 빈 상태 안내와 합계 0원을 표시함
- [x] 에러 원문, 노션 응답, ID가 화면에 노출되지 않음

## 구현 단계

- [x] `StatusCard` 확장과 중복 문구/버튼 정리
- [x] 404, 접근 불가, 에러 화면에 적용
- [x] 로딩 스켈레톤을 실제 레이아웃에 맞춰 보정
- [x] `InvoiceEmptyItems` 추가와 연결
- [x] Playwright MCP로 확인

## 후속 확인 사항

- `error.tsx`는 에러를 실제로 던져서 동작을 확인하지 못했습니다. 노션 조회(Task 007~008) 구현 후 실패 시나리오로 확인합니다.
- 로딩 스켈레톤은 코드상 높이 기준으로 맞췄고, 느린 응답 상태에서 실제 일치 여부는 눈으로 확인하지 못했습니다.

## 검증 결과 (2026-11-12)

- `npm run lint` 에러 없음, `npx tsc --noEmit` 에러 없음, `npm run build` 성공
- Playwright MCP 확인 범위
  - 404 화면: 1280px 라이트, 375px 다크 확인 (아이콘, 404, 제목, 확인 사항, 홈 버튼 순서)
  - 항목 0건 견적서: 1280px 다크 확인 (빈 상태 안내, 합계 0원)
  - 접근 불가: 형식 오류 토큰이 `/unavailable?reason=invalid`로 이동하고 가로 스크롤 없음
- 확인하지 못한 항목
  - 에러 화면(`error.tsx`)을 실제 에러로 띄워 보지 못함
  - 로딩 스켈레톤을 화면에서 비교하지 못함 (코드상 높이 기준으로만 보정)
  - 항목 0건 빈 상태의 375/768px, 404의 768px 확인은 하지 않음
