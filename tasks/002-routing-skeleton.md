# Task 002: 라우팅 골격 보완 (loading, error, not-found)

> 상태: ✅ 완료

## 명세서

실제 라우트는 `/invoice/[token]`이며, 이 작업에서 누락된 라우팅 경계 파일(`loading`, `error`, `not-found`)을 추가했습니다.
토큰은 노션 페이지 ID이고, 형식이 잘못되면 `/unavailable?reason=invalid`로 이동합니다.

## 관련 파일

- `app/invoice/[token]/page.tsx` - 견적서 페이지 (토큰 검증, 노션 조회는 TODO)
- `app/invoice/[token]/loading.tsx` - 로딩 스켈레톤 (신규)
- `app/invoice/[token]/error.tsx` - 에러 경계, Client Component (신규)
- `app/not-found.tsx` - 한국어 404 (신규)
- `app/unavailable/page.tsx` - 접근 불가 안내 (`StatusCard` 사용으로 수정)
- `components/layout/status-card.tsx` - 안내 카드 공통 컴포넌트 (신규)
- `components/ui/skeleton.tsx` - shadcn/ui Skeleton (신규)
- `README.md` - 라우트 표, 폴더 구조

## 수락 기준

- [x] 존재하지 않는 경로에서 한국어 404 표시, 홈 링크 외 다른 링크 없음, `noindex` 적용
- [x] `/invoice/abc` 접속 시 `/unavailable?reason=invalid`로 이동
- [x] `error.tsx`가 에러 원문, 노션 응답, ID를 화면에 노출하지 않음
- [x] 375px, 1200px 뷰포트에서 가로 넘침 없음
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과

## 구현 결정

- `error.tsx`는 설치된 Next.js 16.4 문서에 따라 `retry()`를 사용합니다.
- 로딩 화면이 생기면서 `/invoice/abc`의 HTTP 상태 코드가 307에서 200으로 바뀝니다. 이동 지시가 응답 본문(meta refresh)으로 전달되는 정상 동작이며, 사용자에게는 차이가 없습니다.
- 404, 에러, 접근 불가 화면이 같은 카드 형태라 `StatusCard`로 분리했습니다.

## 구현 단계

- [x] Next.js 16.4 번들 문서로 `error`, `not-found`, `loading` 시그니처 확인
- [x] shadcn Skeleton 추가 (CLI가 넣은 불필요한 `cn` 패키지는 제거)
- [x] `loading.tsx`, `error.tsx`, `not-found.tsx`, `StatusCard` 작성
- [x] README 갱신
- [x] Playwright로 404, 잘못된 토큰 이동, 반응형 확인

## 미확인 항목

- 에러 화면은 오류를 던지는 코드가 아직 없어 강제로 렌더링해 보지 못했습니다. 노션 조회(F001) 구현 후 확인합니다.
- 다크 모드는 토큰 색상만 사용했다는 것까지만 확인했습니다.
