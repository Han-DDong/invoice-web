# Task 010: 성능 최적화 및 캐싱 (010-A, 010-B)

> 상태: 010-A, 010-B 완료 (2026-11-16, 010-B는 측정·검토만, subset 미적용)

## 결정 사항 (2026-11-16, 사용자 별도 답변이 없어 지시된 기본안으로 확정)

- [x] **캐시 TTL 길이** (010-A): **30초로 결정** (`INVOICE_CACHE_TTL_SECONDS`).: 기본 제안 30~60초. 길수록 노션 호출이 줄지만 노션에서 고친 내용(금액, 유효기간)이 그만큼 늦게 반영됩니다.
- [x] **캐시 방식** (010-A): **`unstable_cache` 유지로 결정**, `cacheComponents` 설정은 변경하지 않음.: 기본안은 `unstable_cache`. Next.js 16 문서는 대부분의 경우 Cache Components(`use cache`)를 권장하지만, 이 프로젝트는 `cacheComponents` 설정을 쓰지 않으므로 전환 범위가 커집니다. 기본안 유지 여부를 확인합니다.
- [x] **폰트 subset 적용 여부** (010-B): **적용하지 않음** (측정만 수행, 사유는 테스트 결과 참고). 현행 OTF 원본 유지. KS X 1001 완성형 2350자에 없는 글자(예: 일부 이름, 상호의 드문 글자)는 PDF에서 빠지거나 깨질 수 있습니다. 적용하지 않으면 현행 OTF 원본을 유지합니다.

## 명세서

### 010-A: 노션 호출 최적화와 캐싱

현재 견적서 화면(`app/invoice/[token]/page.tsx`)과 PDF 라우트(`app/invoice/[token]/pdf/route.ts`)는 각각 `getAccessibleInvoice` → `getInvoiceByPageId`를 호출하므로, 화면을 연 직후 PDF를 받으면 같은 견적서를 노션에서 두 번 조회합니다. (`pages.retrieve` 1회 + `dataSources.query` 1회 이상, 각각 요청마다 반복) 이 중복을 서비스 계층의 짧은 TTL 캐시로 줄입니다.

- 캐시 위치: `lib/invoice-service.ts`의 `getInvoiceByPageId` 결과(`Invoice`)를 서비스 계층에서 캐시합니다. 키는 페이지 ID(정규화된 32자리)입니다.
- **성공 결과만 캐시**: `not_found`, `query_failed`, `validation_failed`는 캐시하지 않습니다. 장애가 TTL 동안 고정되거나, 노션에서 새로 만든 페이지가 404로 남는 것을 막기 위해서입니다.
- **캐시 밖에서 매 요청 수행**: 토큰 형식 검증(`shareTokenSchema`)과 만료 판정(`isInvoiceExpired`)은 `lib/invoice-access.ts`의 `getAccessibleInvoice`에서 지금처럼 매 요청 수행합니다. 만료 판정을 캐시 안에 넣으면 자정(KST)을 넘겨도 TTL 동안 만료가 반영되지 않습니다.
- `lib/notion.ts`의 `fetch: ... cache: 'no-store'`는 유지합니다. 캐시는 노션 fetch 단위가 아니라 서비스 결과 단위 하나로만 둡니다.
- `Invoice`는 문자열, 숫자, 배열로만 구성되어 직렬화 가능합니다. (`types/invoice.ts`)
- 응답 헤더 `Cache-Control: no-store`(PDF 라우트)는 유지합니다. 서버 내부 캐시와 브라우저/CDN 캐시는 별개입니다.
- 전후 비교: 같은 토큰으로 화면 → PDF를 순서대로 요청했을 때 노션 호출 횟수와 응답 시간을 기록합니다.

설계 근거 (공식 문서로 확인한 사실):

- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`: Cache Components를 쓰지 않는 프로젝트에서 `fetch`가 아닌 함수의 결과는 `unstable_cache`로 캐시하고 `revalidate`(초)로 TTL을 지정합니다.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`: 캐시 함수 안에서 `headers()`, `cookies()`, `connection()` 같은 요청 의존 API를 쓸 수 없고, 함수 인자와 `keyParts`가 캐시 키가 됩니다. 결과는 요청과 배포 사이에 유지됩니다.

추론/가정 (구현 시 확인 필요):

- `unstable_cache`는 반환값을 그대로 저장하므로, 실패를 캐시하지 않으려면 캐시 함수 안에서 실패 시 예외를 던지고 바깥에서 `InvoiceResult`로 되돌리는 구조가 필요합니다. 예외가 캐시되지 않는지는 구현 시 실제로 확인합니다.
- 캐시 함수 안의 `fetch(..., { cache: 'no-store' })`가 `unstable_cache` 안에서 경고나 동작 차이를 만드는지 확인합니다.
- 서버리스 환경에서 캐시가 인스턴스 사이에 공유되는지는 배포 플랫폼에 따라 다릅니다. (012-B에서 프리뷰 배포로 확인)

### 010-B: 폰트 subset과 렌더링 최적화 검토

- **폰트**: `assets/fonts/NotoSansKR-Regular.otf`(약 4.6MB)와 `NotoSansKR-Bold.otf`(약 4.8MB), 합계 약 9.5MB를 `lib/pdf/fonts.ts`의 `registerPdfFonts`가 등록합니다. subset은 KS X 1001 완성형 한글 2350자 + 영문 대소문자 + 숫자 + 기본 기호(₩, 원, 괄호, 쉼표, 하이픈 등)를 기준으로 하는 **일회성 스크립트**로 만들고, npm 의존성은 추가하지 않습니다. 결과 파일과 원본 중 무엇을 쓸지는 사용자 승인 후 결정합니다.
  - 로컬에 subset 도구(`pyftsubset` 등)가 설치되어 있지 않습니다. (2026-11-16 `which pyftsubset` 확인) 도구 선택도 사용자 확인이 필요합니다.
  - OFL 라이선스(`assets/fonts/OFL.txt`)는 subset 파일에도 함께 둡니다.
- **Suspense 경계**: `app/invoice/[token]/loading.tsx`가 세그먼트 전체를 Suspense로 감싸 스켈레톤을 보여줍니다. 견적서 화면은 데이터 한 건을 받아 한 번에 그리므로 추가 `<Suspense>`가 같은 역할을 반복한다면 **현행 유지**로 결론냅니다.
- **이미지 최적화**: `next/image`와 `<img>` 사용처가 없고 `public/` 폴더도 없습니다. (2026-11-16 `app`, `components`, `lib` 검색으로 확인) **해당 없음**으로 ROADMAP에 명시합니다.

## 관련 파일

- `lib/invoice-service.ts` - `getInvoiceByPageId` 캐시 래핑 (010-A, 수정 예정)
- `lib/invoice-access.ts` - 토큰 검증과 `isInvoiceExpired`를 캐시 밖에서 유지하는지 확인 (010-A, 원칙상 변경 없음)
- `lib/notion.ts` - `cache: 'no-store'` 유지, 주석의 "Task 010에서 결정" 문구 갱신 (010-A)
- `app/invoice/[token]/page.tsx` - 주석의 "캐시 전략은 Task 010" 문구 갱신 (010-A)
- `lib/pdf/fonts.ts` - subset 적용 시 파일명 변경 (010-B, 승인 시에만)
- `assets/fonts/` - subset 결과 파일 (010-B, 승인 시에만)
- `app/invoice/[token]/loading.tsx` - Suspense 중복 검토 (010-B, 변경 없음 예상)
- `CLAUDE.md` - "캐시는 쓰지 않습니다" 서술 갱신 (010-A 완료 시)
- `docs/ROADMAP.md` - 완료 표시

## 수락 기준

### 010-A

- [x] 같은 토큰으로 화면 → PDF 순서로 요청할 때 TTL 안의 두 번째 요청은 노션을 호출하지 않음
- [x] 노션 조회 실패(`not_found`, `query_failed`, `validation_failed`)는 캐시되지 않고 다음 요청에서 다시 조회함
- [x] 토큰 형식 오류는 캐시 조회 없이 `invalid`로 판정됨
- [x] 만료 판정은 캐시된 `Invoice`에 대해서도 매 요청 KST 오늘 기준으로 수행됨
- [x] PDF 응답의 `Cache-Control: no-store` 유지
- [x] 전후 노션 호출 횟수와 응답 시간(5회, 중앙값)을 아래 테스트 결과에 기록
- [x] `npm run check-all`, `npm run build` 통과

### 010-B

- [x] 폰트 subset 적용 여부를 사용자에게 확인받음 (미적용 시 사유 기록) — 사용자 지시로 미적용, 사유 기록
- [ ] (적용 시) PDF 생성 결과의 한글, 숫자, 기호가 원본 폰트와 같게 보임 — 해당 없음 (미적용)
- [ ] (적용 시) 폰트 파일 합계 크기와 PDF 생성 시간(첫 요청, 이후 요청) 전후 비교 기록 — 해당 없음 (현행 측정값만 기록)
- [x] Suspense 경계 검토 결론 기록
- [x] ROADMAP에 이미지 최적화 "해당 없음" 명시

## 구현 단계

### 010-A

- [x] 현재 상태 측정: 화면 → PDF 요청 시 노션 호출 횟수와 응답 시간 (개발 서버, 5회)
- [x] TTL과 캐시 방식 사용자 확인
- [x] `getInvoiceByPageId`를 캐시 래핑 (성공만 캐시, 실패는 예외로 우회 후 `InvoiceResult`로 변환)
- [x] 실패가 캐시되지 않는지, TTL 경과 후 다시 조회하는지 확인
- [x] 변경 후 측정, 결과 기록
- [x] 관련 주석과 `CLAUDE.md` 캐시 서술 갱신

### 010-B

- [x] 폰트 subset 적용 여부와 도구 사용자 확인 (미적용, 도구 미선정)
- [ ] (승인 시) 일회성 스크립트로 subset 생성, 원본은 git 이력으로 복구 가능하게 유지 — 해당 없음
- [ ] (승인 시) 한글 견본 문자열과 실제 견적서 PDF로 누락 글자 확인 — 해당 없음
- [x] Suspense 경계 검토 결론 기록
- [x] 이미지 최적화 해당 없음 기록

## 테스트 체크리스트

### 010-A (curl + 서버 로그, 화면은 Playwright MCP)

- [x] 정상 토큰 화면 요청 → 서버 로그에서 노션 호출 발생 확인, 직후 `curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' http://localhost:3000/invoice/<정상 토큰>/pdf` → 200, 노션 호출 없음
- [x] TTL 경과 후 같은 PDF 요청 → 노션 호출 다시 발생
- [x] 없는 ID(`00000000000000000000000000000000`) 연속 2회 요청 → 두 번 모두 노션 호출, 404
- [x] 잘못된 키로 띄운 프로덕션 빌드 임시 서버에서 PDF 2회 요청 → 두 번 모두 500, 장애가 캐시되지 않음
- [x] 형식 오류 토큰 `/invoice/short/pdf` → 404, 노션 호출 없음
- [x] Playwright MCP: 정상 토큰 화면 표시 → PDF 버튼 클릭 → 다운로드 성공 (화면 총액 60,000,000원 확인, PDF 본문 합계 대조는 미확인: 로컬에 PDF 텍스트 추출 도구 없음)
- [x] Playwright MCP: `/invoice/short` → `/unavailable?reason=invalid` (curl은 `loading.tsx` 스트리밍 때문에 200으로 보이므로 리다이렉트는 브라우저로 확인)
- [ ] 노션에서 값 변경 → TTL 안에서는 이전 값, TTL 경과 후 새 값 표시 (반영 지연 확인) — **미확인**: 노션 실데이터 수정 권한을 쓰지 않음

### 010-B

- [x] (현행 측정으로 대체) `curl -sS -o /tmp/invoice.pdf -w '%{time_total}\n' http://localhost:3000/invoice/<정상 토큰>/pdf` 첫 요청과 이후 요청 시간 비교
- [ ] (적용 시) PDF를 열어 클라이언트명 — 해당 없음 (미적용). PDF를 열어, 항목명, 금액, 날짜가 빠짐없이 보이는지 확인

## 테스트 결과

### 010-A (2026-11-16)

구현: `lib/invoice-service.ts`

- `getInvoiceByPageId` = 형식 확인 → `unstable_cache(() => fetchInvoiceForCache(id), ['invoice', sha256(id)], { revalidate: 30 })`.
- 실패는 `UncachedFetchFailure` 예외로 던져 캐시에 저장되지 않게 하고, 바깥에서 `InvoiceResult`로 되돌립니다. 원인은 private 필드에 둬 Next.js가 예외를 로그로 출력해도 노션 원문이 나오지 않습니다.
- 캐시 키는 페이지 ID의 SHA-256입니다. Next.js가 백그라운드 갱신 실패 시 `revalidating cache with key: ...`로 키를 로그에 남기기 때문입니다. (실제 로그에서 해시만 출력되고 토큰은 0회 확인)
- **엄격한 TTL 처리 (문서 외 추가 확인 사항)**: `node_modules/next/dist/server/web/spec-extension/unstable-cache.js` 소스 확인 결과, `revalidate`가 지난 항목은 stale 값을 먼저 반환하고 백그라운드에서 갱신하며, 갱신이 실패하면 stale 값을 계속 반환합니다. 그대로 두면 노션에서 휴지통으로 옮긴 견적서가 무기한 노출될 수 있으므로, 캐시 값에 `fetchedAt`을 저장하고 30초를 넘긴 값은 쓰지 않고 직접 재조회합니다. 대가로 TTL 경과 직후 첫 요청은 직접 조회 + Next.js 백그라운드 갱신이 겹쳐 노션 호출이 한 번 더 발생합니다.
- 캐시 함수 안의 `fetch(..., { cache: 'no-store' })`: Next.js 소스상 unstable-cache 범위에서는 force-no-store와 같게 처리되며, dev/프로덕션 로그에 관련 경고는 없었습니다.
- 계층 자체의 예상하지 못한 오류는 `query_failed`로 처리합니다.

측정 (노션 호출 수는 측정 동안만 `lib/notion.ts` fetch에 임시 로그를 넣어 세고 제거함, 시간은 `curl %{time_total}`, 5회 중앙값)

- 변경 전 (dev): 화면 요청마다 노션 2회(pages 1 + data_sources 1, 첫 요청만 databases 포함 3회), PDF도 2회. 화면 0.579s, PDF 0.571s.
- 변경 후 (dev): 첫 화면 3회, 직후 PDF 0회, 2~5회차 화면·PDF 모두 0회. 캐시 적중 시 화면 0.037s, PDF 0.046s.
- 변경 후 (프로덕션 `next start`): 첫 화면 3회(1.00s), 이후 0회. 적중 시 화면 0.011s, PDF 0.051s.
- TTL 경과(32초 대기) 후 첫 PDF 요청: 노션 5회(직접 재조회 + 백그라운드 갱신), 0.91s. 다음 요청부터 다시 0회.
- 없는 ID PDF 2회: 2회 모두 404, 각각 노션 1회 호출 (not_found 비캐시 확인).
- `/invoice/short/pdf`: 404, 노션 0회.
- 잘못된 키(`NOTION_API_KEY`만 프로세스 환경변수로 덮어씀, `.env.local` 미수정) 프로덕션 서버 3102:
  - TTL 안: 3101 서버가 만든 캐시를 공유해 PDF 200. 같은 `.next/cache`를 쓰는 서버끼리 파일 캐시가 공유됨을 확인.
  - TTL 경과 후 2회: 2회 모두 500("PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."), 각각 노션 호출 발생. stale 값이 장애 중에 노출되지 않고 장애도 캐시되지 않음을 확인.
- 만료 판정: 코드상 `getAccessibleInvoice`가 캐시 결과에 대해 매 요청 `isInvoiceExpired`를 호출 (실데이터 만료 견적서가 없어 실제 만료 전환은 미확인, 012-A 단위 테스트 대상).
- PDF 응답 `Cache-Control: no-store` 유지 (route.ts 변경 없음).
- Playwright MCP (프로덕션 3101): 정상 토큰 화면 표시, PDF 다운로드 `invoice-INV-2026-011.pdf` 성공, `/invoice/short` → `/unavailable?reason=invalid`.
- 미확인: 노션 값 변경 후 반영 지연(실데이터 수정 안 함), PDF 본문 합계 대조(텍스트 추출 도구 없음), Vercel 인스턴스 간 캐시 공유(012-B 프리뷰 배포).

### 010-B (2026-11-16, 측정·검토만, 코드 변경 없음)

폰트 측정

- `NotoSansKR-Regular.otf` 4,644,748B, `NotoSansKR-Bold.otf` 4,816,044B, 합계 9,460,792B(약 9.0MiB).
- 프로덕션 서버 재시작 직후 PDF 6회 (견적서는 직전에 캐시해 노션 호출 제외): 1회차 1.097s, 2~6회차 0.029~0.039s (중앙값 0.032s). 1회차에는 라우트 모듈 로드와 폰트 파싱이 함께 들어 있어 폰트 비용만 분리하지는 못했습니다.
- 생성된 PDF는 67,049B로, `@react-pdf/renderer`가 사용한 글자만 PDF에 임베드합니다. 따라서 subset은 **다운로드 크기에는 영향이 없고** 서버의 첫 요청 폰트 파싱 시간과 배포 번들 크기에만 영향을 줍니다.
- 로컬에 subset 도구(`pyftsubset`, Python `fontTools`)가 없습니다. (2026-11-16 확인)

subset 미적용 사유

- KS X 1001 완성형 2,350자 밖의 한글(이름·상호의 드문 글자, 예: 똠, 햏 등)이 PDF에서 빠지거나 깨질 위험이 있고, 노션 입력값을 통제할 수 없습니다.
- 이득은 첫 요청 1회의 지연과 번들 크기뿐이고, 이후 요청은 이미 0.03s 수준입니다.
- 도구 설치(의존성 추가)가 필요합니다. 사용자 지시에 따라 측정만 하고 적용하지 않았습니다. 다시 검토한다면 Vercel 프리뷰의 콜드 스타트 PDF 시간을 먼저 측정해 판단하는 것을 제안합니다.

Suspense 경계

- `app/invoice/[token]/loading.tsx`가 세그먼트 전체를 Suspense로 감싸고 실제 레이아웃과 같은 스켈레톤을 보여줍니다. 견적서 화면은 `getAccessibleInvoice` 한 번으로 받은 데이터로 한 번에 그리므로 추가 `<Suspense>`는 같은 역할을 반복합니다. **현행 유지**로 결론. (코드 검색 결과 `Suspense` 직접 사용처 없음)

이미지 최적화

- `next/image`, `<img>` 사용처와 `public/` 폴더가 없습니다. (2026-11-16 `app`, `components`, `lib` 검색과 `ls public`으로 재확인) **해당 없음**.
