import Link from 'next/link'

import { InvoiceStatusBadge } from '@/components/invoice/invoice-status-badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buildInvoiceDetailHref } from '@/lib/invoice-list-query'
import { formatCurrency, formatDate } from '@/lib/format'
import type { InvoiceSummary } from '@/types/invoice-list'

interface RecentInvoicesProps {
  invoices: InvoiceSummary[]
}

// 최근 발행 견적서: 행을 누르면 견적서 번호로 검색한 목록으로 이동
export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card className="rounded-xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">최근 견적서</CardTitle>
        <CardAction>
          <Link
            href="/admin/invoices"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            전체 보기
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            표시할 견적서가 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {invoices.map(invoice => (
              <li key={invoice.id}>
                <Link
                  href={buildInvoiceDetailHref(invoice.id)}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md py-3 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.clientName} · {formatDate(invoice.issuedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="text-sm tabular-nums">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
