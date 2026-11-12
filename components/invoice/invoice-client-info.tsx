import type { Invoice } from "@/types/invoice"
import { formatDate } from "@/lib/format"

interface InvoiceClientInfoProps {
  invoice: Pick<Invoice, "clientName" | "issuedAt" | "validUntil">
}

// 클라이언트 및 기간 정보 (정의 목록 구조)
export function InvoiceClientInfo({ invoice }: InvoiceClientInfoProps) {
  const fields = [
    { label: "클라이언트", value: invoice.clientName },
    { label: "발행일", value: formatDate(invoice.issuedAt) },
    { label: "유효기간", value: `${formatDate(invoice.validUntil)}까지` },
  ]

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="space-y-1">
          <dt className="text-sm text-muted-foreground">{field.label}</dt>
          <dd className="font-medium">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}
