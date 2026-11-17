import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardSummary } from '@/lib/admin-dashboard'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/types/invoice'
import { cn } from '@/lib/utils'

// 막대 너비 (5% 단위). Tailwind가 정적 문자열만 찾으므로 클래스를 그대로 나열하고, 인라인 스타일은 쓰지 않습니다.
const BAR_WIDTHS = [
  'w-[0%]',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-[100%]',
] as const

/** 건수 비율을 막대 너비 클래스로 변환합니다. 1건 이상이면 최소 한 칸은 보이게 합니다. */
export function toBarWidth(count: number, total: number): string {
  if (total <= 0 || count <= 0) {
    return BAR_WIDTHS[0]
  }
  const step = Math.max(1, Math.round((count / total) * 20))
  return BAR_WIDTHS[step]
}

const BAR_COLORS: Record<InvoiceStatus, string> = {
  대기: 'bg-muted-foreground/50',
  승인: 'bg-primary',
  거절: 'bg-destructive',
}

interface StatusBreakdownProps {
  summary: DashboardSummary
}

// 상태별 건수와 비율 (CSS 막대, 행을 누르면 해당 상태로 필터된 목록으로 이동)
export function StatusBreakdown({ summary }: StatusBreakdownProps) {
  return (
    <Card className="rounded-xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">상태별 견적서</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {INVOICE_STATUSES.map(status => {
          const count = summary.statusCounts[status]
          const percent =
            summary.totalCount > 0
              ? Math.round((count / summary.totalCount) * 100)
              : 0
          return (
            <Link
              key={status}
              href={`/admin/invoices?${new URLSearchParams({ status })}`}
              className="block space-y-1.5 rounded-md hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{status}</span>
                <span className="text-muted-foreground tabular-nums">
                  {count}건 · {percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    BAR_COLORS[status],
                    toBarWidth(count, summary.totalCount)
                  )}
                />
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
