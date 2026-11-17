import Link from 'next/link'

import { HighlightText } from '@/components/admin/highlight-text'
import { SortHead } from '@/components/admin/sort-head'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  buildClientInvoicesHref,
  buildClientListHref,
  toggleClientSort,
  type ClientListQuery,
  type ClientSortKey,
} from '@/lib/client-list-query'
import type { ClientSummary } from '@/lib/client-summary'
import { formatCurrency, formatDate } from '@/lib/format'

interface ClientTableProps {
  clients: ClientSummary[]
  query: ClientListQuery
}

const COLUMNS: { key: ClientSortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: '클라이언트' },
  { key: 'invoiceCount', label: '견적서 수', numeric: true },
  { key: 'totalAmount', label: '총 금액', numeric: true },
  { key: 'approvedCount', label: '승인', numeric: true },
  { key: 'latestIssuedAt', label: '최근 발행일' },
]

// 클라이언트 표: 이름을 누르면 해당 클라이언트의 견적서 목록으로 이동 (좁은 화면에서는 표만 가로 스크롤)
export function ClientTable({ clients, query }: ClientTableProps) {
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
                href={buildClientListHref(toggleClientSort(query, column.key))}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map(client => (
            <TableRow key={client.name}>
              <TableCell className="font-medium">
                <Link
                  href={buildClientInvoicesHref(client.name)}
                  className="underline-offset-4 hover:text-primary hover:underline"
                >
                  <HighlightText text={client.name} query={query.q} />
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {client.invoiceCount}건
              </TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                {formatCurrency(client.totalAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {client.approvedCount}건
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(client.latestIssuedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
