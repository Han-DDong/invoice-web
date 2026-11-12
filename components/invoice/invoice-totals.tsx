import { Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import type { InvoiceTotals as InvoiceTotalsData } from "@/types/invoice"

interface InvoiceTotalsProps {
  totals: InvoiceTotalsData
  // 견적 항목 개수 (총액 카드 우측 배지에 표시)
  itemCount: number
}

// 총액 카드: 제목, 총 견적 금액(강조), 총 항목 수 배지 (부가세 없음, 항목 금액 합계만 표시)
export function InvoiceTotals({ totals, itemCount }: InvoiceTotalsProps) {
  return (
    <section aria-labelledby="invoice-totals-heading" className="rounded-xl border p-5 sm:p-6">
      <h2
        id="invoice-totals-heading"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <Wallet className="size-5 text-muted-foreground" aria-hidden />
        총액
      </h2>

      <dl className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <dt className="text-sm text-muted-foreground">총 견적 금액</dt>
          <dd className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            {formatCurrency(totals.total)}
          </dd>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
          <dt>총 항목</dt>
          <dd className="text-base font-semibold tabular-nums text-foreground">
            {itemCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-sm font-normal text-muted-foreground">개</span>
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        * 부가세는 별도로 청구됩니다.
      </p>
    </section>
  )
}
