import Link from 'next/link'
import { FilePlus, Pencil } from 'lucide-react'

import { InvoiceStatusBadge } from '@/components/invoice/invoice-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityEvent, ActivityType } from '@/lib/admin-dashboard'
import { buildInvoiceDetailHref } from '@/lib/invoice-list-query'
import { formatKstDateTime, formatRelativeTime } from '@/lib/relative-time'

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  created: '견적서 생성',
  updated: '견적서 수정',
}

interface ActivityListProps {
  events: ActivityEvent[]
  /** 상대 시간 기준 (서버 렌더 시각) */
  now: Date
}

// 최근 활동: 노션 created_time, last_edited_time으로 만든 이벤트 (별도 로그 저장소 없음)
export function ActivityList({ events, now }: ActivityListProps) {
  return (
    <Card className="rounded-xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            최근 활동이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map(event => {
              const Icon = event.type === 'created' ? FilePlus : Pencil
              return (
                <li key={event.key} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">
                        {ACTIVITY_LABELS[event.type]}
                      </span>
                      <Link
                        href={buildInvoiceDetailHref(event.invoiceId)}
                        className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {event.invoiceNumber}
                      </Link>
                      <InvoiceStatusBadge status={event.status} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={event.at}>
                        {formatRelativeTime(event.at, now)} ·{' '}
                        {formatKstDateTime(event.at)} (KST)
                      </time>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
