import type { Metadata } from "next"
import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusCard } from "@/components/layout/status-card"

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
      title="페이지를 찾을 수 없습니다"
      description="주소가 올바르지 않거나 이동되었거나 삭제된 페이지입니다."
    >
      <p className="text-sm text-muted-foreground">
        견적서 링크를 받았다면 주소를 다시 확인하거나 담당자에게 문의해 주세요.
      </p>
      <Button asChild variant="outline">
        <Link href="/">홈으로 이동</Link>
      </Button>
    </StatusCard>
  )
}
