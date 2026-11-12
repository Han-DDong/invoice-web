# Task 001: 프로젝트 초기 설정 및 환경 구성

> 상태: ✅ 완료

## 명세서

코드 현황 기준으로 개발 환경이 정상인지 검증하고, 환경변수 관련 문서를 코드와 일치시킵니다.
`.env.local`은 비밀값이므로 생성하지 않고, 환경변수 검증은 `lib/env.ts`의 `getServerEnv()`가 담당합니다.

## 관련 파일

- `lib/env.ts` - 서버 환경변수 Zod 스키마 (지연 평가, 한국어 오류 메시지)
- `.env.example` - 환경변수 예제
- `README.md` - 환경변수 표
- `package.json` - 의존성 (Next.js 16, React 19, Zod 4, @notionhq/client 5)

## 환경변수 (3개)

| 이름 | 설명 |
| --- | --- |
| `NOTION_API_KEY` | 노션 통합 시크릿 키 |
| `NOTION_INVOICE_DATA_SOURCE_ID` | 견적서 DB 데이터 소스 ID |
| `NOTION_ITEM_DATA_SOURCE_ID` | 견적 항목 DB 데이터 소스 ID |

`NOTION_DATABASE_ID`는 폐기된 설계입니다.

## 수락 기준

- [x] `npm run lint`, `npx tsc --noEmit` 통과
- [x] `npm run dev` 기동 확인
- [x] `lib/env.ts` 스키마, `.env.example`, README 환경변수 표의 변수 이름이 일치
- [x] 환경변수 누락 시 `getServerEnv()`가 한국어 메시지로 실패

## 구현 단계

- [x] 린트와 타입 체크 확인
- [x] 개발 서버 기동 확인
- [x] 환경변수 스키마, 예제 파일, README 일치 점검
- [x] ROADMAP의 낡은 서술 목록화 (Next.js 15.5.3, `NOTION_DATABASE_ID`)
