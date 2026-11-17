import Link from 'next/link'

import { HighlightText } from '@/components/admin/highlight-text'
import { SortHead } from '@/components/admin/sort-head'
import { InvoiceStatusBadge } from '@/components/invoice/invoice-status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  buildInvoiceDetailHref,
  buildInvoiceListHref,
  toggleSort,
  type InvoiceListQuery,
  type InvoiceSortKey,
} from '@/lib/invoice-list-query'
import type { InvoiceSummary } from '@/types/invoice-list'

interface InvoiceTableProps {
  invoices: InvoiceSummary[]
  /** 현재 URL 쿼리 (정렬 헤더 링크를 만드는 데 사용) */
  query: InvoiceListQuery
}

/** 컬럼 정의 (정렬 키, 제목, 숫자 열 여부) */
const COLUMNS: { key: InvoiceSortKey; label: string; numeric?: boolean }[] = [
  { key: 'invoiceNumber', label: '견적서 번호' },
  { key: 'clientName', label: '클라이언트' },
  { key: 'issuedAt', label: '발행일' },
  { key: 'status', label: '상태' },
  { key: 'totalAmount', label: '총액', numeric: true },
]

// 견적서 목록 표: 좁은 화면에서는 표 영역만 가로로 스크롤
export function InvoiceTable({ invoices, query }: InvoiceTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <Table className="min-w-[40rem]">
        <TableHeader>
          <TableRow>
            {COLUMNS.map(column => (
              <SortHead
                key={column.key}
                label={column.label}
                numeric={column.numeric}
                active={query.sort === column.key}
                order={query.order}
                href={buildInvoiceListHref(toggleSort(query, column.key))}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map(invoice => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium whitespace-nowrap">
                <Link
                  href={buildInvoiceDetailHref(invoice.id, query)}
                  className="underline-offset-4 hover:text-primary hover:underline"
                >
                  <HighlightText text={invoice.invoiceNumber} query={query.q} />
                </Link>
              </TableCell>
              <TableCell>
                <HighlightText text={invoice.clientName} query={query.q} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(invoice.issuedAt)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                {formatCurrency(invoice.totalAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
