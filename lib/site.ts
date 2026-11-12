// 서비스 공통 정보 (메타데이터, 헤더/푸터에서 재사용)
export const siteConfig = {
  name: "Invoice Web",
  description:
    "노션으로 작성한 견적서를 공유 링크 하나로 확인하고 PDF로 내려받을 수 있는 서비스입니다.",
} as const;

// 본문/헤더/푸터가 함께 쓰는 컨테이너 폭 (폭 정책의 단일 출처)
export const containerWidthClass = "mx-auto w-full max-w-3xl px-4";
