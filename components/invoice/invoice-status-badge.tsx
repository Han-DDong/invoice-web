import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { InvoiceStatus } from "@/types/invoice"

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

// 상태별 배지 스타일 (대기: 중립, 승인: 강조, 거절: 경고)
const statusVariant: Record<InvoiceStatus, "secondary" | "default" | "destructive"> = {
  대기: "secondary",
  승인: "default",
  거절: "destructive",
}

// 견적서 상태 배지
export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]} className={cn(className)}>
      {status}
    </Badge>
  )
}
