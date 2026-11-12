import { formatCurrency } from "@/lib/format"
import type { InvoiceTotals as InvoiceTotalsData } from "@/types/invoice"

interface InvoiceTotalsProps {
  totals: InvoiceTotalsData
}

// 합계 요약 (부가세 없음, 항목 금액 합계만 표시)
export function InvoiceTotals({ totals }: InvoiceTotalsProps) {
  return (
    <dl className="ml-auto w-full space-y-2 border-t pt-4 sm:w-72">
      <div className="flex items-center justify-between text-lg font-bold">
        <dt>합계</dt>
        <dd>{formatCurrency(totals.total)}</dd>
      </div>
    </dl>
  )
}
