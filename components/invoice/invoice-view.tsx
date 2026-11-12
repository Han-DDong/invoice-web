import { Card, CardContent } from "@/components/ui/card"
import { InvoiceClientInfo } from "@/components/invoice/invoice-client-info"
import { InvoiceHeader } from "@/components/invoice/invoice-header"
import { InvoiceItemsTable } from "@/components/invoice/invoice-items-table"
import { InvoiceTotals } from "@/components/invoice/invoice-totals"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import type { Invoice } from "@/types/invoice"

interface InvoiceViewProps {
  invoice: Invoice
}

// 견적서 조회 화면 조합 (헤더 → 기본 정보 → 항목 → 합계)
export function InvoiceView({ invoice }: InvoiceViewProps) {
  const totals = calculateInvoiceTotals(invoice.items)

  return (
    <Card className="mx-auto max-w-4xl">
      <InvoiceHeader invoice={invoice} />
      <CardContent className="space-y-8">
        <InvoiceClientInfo invoice={invoice} />
        <InvoiceItemsTable items={invoice.items} />
        <InvoiceTotals totals={totals} />
      </CardContent>
    </Card>
  )
}
