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
    <section aria-labelledby="invoice-items-heading" className="space-y-3">
      <h2 id="invoice-items-heading" className="text-lg font-semibold">
        견적 항목
      </h2>

      {/* 항목 0건: 제목은 유지하고 빈 상태 안내 표시 */}
      {items.length === 0 ? (
        <InvoiceEmptyItems />
      ) : (
        <>
          {/* 모바일: 카드형 목록 */}
          <ul className="space-y-3 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 rounded-md border p-4">
                <p className="font-medium">{item.name}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">수량</dt>
                  <dd className="text-right">{item.quantity.toLocaleString("ko-KR")}</dd>
                  <dt className="text-muted-foreground">단가</dt>
                  <dd className="text-right">{formatCurrency(item.unitPrice)}</dd>
                  <dt className="font-medium">금액</dt>
                  <dd className="text-right font-semibold">{formatCurrency(item.amount)}</dd>
                </dl>
              </li>
            ))}
          </ul>

          {/* 데스크톱: 표 */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>항목명</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity.toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
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
