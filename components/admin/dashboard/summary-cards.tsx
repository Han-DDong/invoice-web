import Link from 'next/link'
import {
  CalendarClock,
  FileText,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { DashboardSummary } from '@/lib/admin-dashboard'
import { formatCurrency } from '@/lib/format'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  /** 보조 설명 */
  hint?: string
  /** 있으면 카드 전체가 링크 */
  href?: string
}

// 요약 카드 한 장 (링크가 있으면 호버 시 강조)
function StatCard({ icon: Icon, label, value, hint, href }: StatCardProps) {
  const body = (
    <Card className="h-full rounded-xl py-0 shadow-xs transition-colors group-hover:border-primary/40">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          <Icon className="size-4" aria-hidden />
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  )
}

interface SummaryCardsProps {
  summary: DashboardSummary
}

// 대시보드 요약 카드: 전체 견적서, 총 견적 금액, 클라이언트 수, 만료 현황
export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section
      aria-label="요약"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        icon={FileText}
        label="전체 견적서"
        value={`${summary.totalCount.toLocaleString('ko-KR')}건`}
        href="/admin/invoices"
      />
      <StatCard
        icon={Wallet}
        label="총 견적 금액"
        value={formatCurrency(summary.totalAmount)}
        hint="항목 수량 x 단가 합계 (부가세 없음)"
      />
      <StatCard
        icon={Users}
        label="클라이언트"
        value={`${summary.clientCount.toLocaleString('ko-KR')}곳`}
        href="/admin/clients"
      />
      <StatCard
        icon={CalendarClock}
        label="유효기간"
        value={`만료 ${summary.expiredCount}건`}
        hint={`7일 이내 만료 예정 ${summary.expiringSoonCount}건`}
      />
    </section>
  )
}
