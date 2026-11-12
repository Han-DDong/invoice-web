import { Card, CardContent } from "@/components/ui/card"
import { InvoiceClientInfo } from "@/components/invoice/invoice-client-info"
import { InvoiceHeader } from "@/components/invoice/invoice-header"
import { InvoiceInquiryNote } from "@/components/invoice/invoice-inquiry-note"
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
    <div className="space-y-6">
      <Card className="gap-8 rounded-2xl shadow-sm">
        <InvoiceHeader invoice={invoice} />
        <CardContent className="space-y-10">
          <InvoiceClientInfo invoice={invoice} />
          <InvoiceItemsTable items={invoice.items} />
          <InvoiceTotals totals={totals} itemCount={invoice.items.length} />
        </CardContent>
      </Card>
      <InvoiceInquiryNote />
    </div>
  )
}
