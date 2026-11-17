import type { Metadata } from 'next'
import { FileX, TriangleAlert } from 'lucide-react'

import { ActivityList } from '@/components/admin/dashboard/activity-list'
import { RecentInvoices } from '@/components/admin/dashboard/recent-invoices'
import { StatusBreakdown } from '@/components/admin/dashboard/status-breakdown'
import { SummaryCards } from '@/components/admin/dashboard/summary-cards'
import { ListState } from '@/components/admin/list-state'
import {
  buildActivities,
  getRecentInvoices,
  summarizeInvoices,
} from '@/lib/admin-dashboard'
import { requireAdminSession } from '@/lib/auth/admin-guard'
import { getKstToday } from '@/lib/invoice-access'
import { getInvoiceSummaries } from '@/lib/invoice-list-service'
import type { InvoiceSummary } from '@/types/invoice-list'

export const metadata: Metadata = { title: '대시보드' }

/** 최근 견적서 개수 */
const RECENT_INVOICE_COUNT = 5
/** 최근 활동 개수 */
const ACTIVITY_COUNT = 8

interface DashboardContentProps {
  invoices: InvoiceSummary[]
  now: Date
}

// 집계는 순수 함수(lib/admin-dashboard.ts)가 하고, 여기서는 배치만 합니다.
function DashboardContent({ invoices, now }: DashboardContentProps) {
  const summary = summarizeInvoices(invoices, getKstToday(now))

  return (
    <>
      <SummaryCards summary={summary} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdown summary={summary} />
        <RecentInvoices
          invoices={getRecentInvoices(invoices, RECENT_INVOICE_COUNT)}
        />
      </div>
      <ActivityList
        events={buildActivities(invoices, ACTIVITY_COUNT)}
        now={now}
      />
    </>
  )
}

// 관리자 대시보드: 요약 카드, 상태별 현황, 최근 견적서, 최근 활동
// 견적서 목록과 같은 캐시(getInvoiceSummaries, 30초)를 쓰므로 노션 호출이 늘지 않습니다.
export default async function AdminDashboardPage() {
  await requireAdminSession()

  const result = await getInvoiceSummaries()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
      {!result.ok ? (
        <ListState
          icon={TriangleAlert}
          tone="destructive"
          title="대시보드를 불러오지 못했습니다"
          description="일시적인 오류일 수 있습니다. 잠시 후 페이지를 새로고침해 주세요."
        />
      ) : result.invoices.length === 0 ? (
        <ListState
          icon={FileX}
          title="등록된 견적서가 없습니다"
          description="노션 견적서 데이터베이스에 견적서를 추가하면 여기에 표시됩니다."
        />
      ) : (
        <DashboardContent invoices={result.invoices} now={new Date()} />
      )}
    </div>
  )
}
