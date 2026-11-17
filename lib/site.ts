// 서비스 공통 정보 (메타데이터, 헤더/푸터에서 재사용)
export const siteConfig = {
  name: 'Invoice Web',
  description:
    '노션으로 작성한 견적서를 공유 링크 하나로 확인하고 PDF로 내려받을 수 있는 서비스입니다.',
} as const

// 관리자 영역 이름 (사이드바, 모바일 헤더, 문서 제목에서 재사용)
export const adminName = '견적서 관리 시스템'

// 본문/헤더/푸터가 함께 쓰는 컨테이너 폭 (폭 정책의 단일 출처)
export const containerWidthClass = 'mx-auto w-full max-w-3xl px-4'

// 관리자 영역 컨테이너 폭 (목록 테이블을 위해 공개 페이지보다 넓게)
export const adminContainerWidthClass = 'mx-auto w-full max-w-6xl px-4 md:px-6'
