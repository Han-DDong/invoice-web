import { PackageOpen } from "lucide-react"

interface InvoiceEmptyItemsProps {
  // 안내 문구 (선택, 기본: 항목 없음 안내)
  message?: string
}

// 견적 항목이 0건일 때 표시하는 빈 상태 안내
export function InvoiceEmptyItems({
  message = "등록된 견적 항목이 없습니다.",
}: InvoiceEmptyItemsProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-md border border-dashed px-4 py-10 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageOpen className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-sm text-muted-foreground text-balance">
          견적 내용이 궁금하다면 견적서를 보내 준 담당자에게 문의해 주세요.
        </p>
      </div>
    </div>
  )
}
