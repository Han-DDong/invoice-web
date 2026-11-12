import type { Metadata } from "next"
import { FileQuestion } from "lucide-react"
import {
  StatusCard,
  StatusCardChecklist,
  StatusCardHomeButton,
} from "@/components/layout/status-card"

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false },
}

// 전역 404 페이지 (미매칭 URL 또는 notFound() 호출 시)
// 토큰 유출 방지를 위해 견적서 목록이나 링크는 노출하지 않음
export default function NotFound() {
  return (
    <StatusCard
      icon={FileQuestion}
      code="404"
      title="페이지를 찾을 수 없습니다"
      description="요청하신 페이지가 존재하지 않습니다."
    >
      {/* 확인 사항: 원인 추정 안내 (링크·토큰 등 민감 정보 미노출) */}
      <StatusCardChecklist
        items={[
          "주소(URL)가 올바르게 입력되었는지 확인해 주세요.",
          "페이지가 삭제되었거나 이동되었을 수 있습니다.",
          "북마크나 받은 링크가 오래되었다면 담당자에게 새 링크를 요청해 주세요.",
        ]}
      />
      <StatusCardHomeButton />
    </StatusCard>
  )
}
