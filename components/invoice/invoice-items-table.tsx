import { InvoiceEmptyItems } from "@/components/invoice/invoice-empty-items"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"
import type { InvoiceItem } from "@/types/invoice"

interface InvoiceItemsTableProps {
  items: InvoiceItem[]
}

// 견적 항목: 모바일(md 미만)은 카드형, 데스크톱은 표
export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <section aria-labelledby="invoice-items-heading" className="space-y-4">
      <h2 id="invoice-items-heading" className="text-lg font-semibold tracking-tight">
        견적 항목
      </h2>

      {/* 항목 0건: 제목은 유지하고 빈 상태 안내 표시 */}
      {items.length === 0 ? (
        <InvoiceEmptyItems />
      ) : (
        <>
          {/* 모바일: 카드형 목록 */}
          <ul className="space-y-4 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="space-y-3 rounded-xl border bg-card p-5 shadow-xs">
                <p className="font-medium leading-snug">{item.name}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">수량</dt>
                  <dd className="text-right tabular-nums">
                    {item.quantity.toLocaleString("ko-KR")}
                  </dd>
                  <dt className="text-muted-foreground">단가</dt>
                  <dd className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</dd>
                  <dt className="border-t pt-2 font-medium">금액</dt>
                  <dd className="border-t pt-2 text-right font-semibold tabular-nums">
                    {formatCurrency(item.amount)}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>

          {/* 데스크톱: 표 (셀 패딩을 넓혀 여유 있는 행 간격 확보) */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-5 text-muted-foreground">항목명</TableHead>
                  <TableHead className="h-12 px-5 text-right text-muted-foreground">수량</TableHead>
                  <TableHead className="h-12 px-5 text-right text-muted-foreground">단가</TableHead>
                  <TableHead className="h-12 px-5 text-right text-muted-foreground">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-5 py-4 font-medium">{item.name}</TableCell>
                    <TableCell className="px-5 py-4 text-right tabular-nums">
                      {item.quantity.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right tabular-nums">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  )
}
