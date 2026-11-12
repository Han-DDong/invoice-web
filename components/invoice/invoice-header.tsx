import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusBadge } from "@/components/invoice/invoice-status-badge"
import { PdfDownloadButton } from "@/components/invoice/pdf-download-button"
import { formatDate } from "@/lib/format"
import type { Invoice } from "@/types/invoice"

interface InvoiceHeaderProps {
  invoice: Pick<Invoice, "invoiceNumber" | "status" | "issuedAt">
}

// 견적서 헤더: 번호, 상태, 발행일, PDF 버튼 (모바일은 세로, sm 이상은 가로 배치)
export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  return (
    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-2xl">견적서</CardTitle>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <CardDescription>
          {invoice.invoiceNumber} · {formatDate(invoice.issuedAt)} 발행
        </CardDescription>
      </div>
      <PdfDownloadButton />
    </CardHeader>
  )
}
