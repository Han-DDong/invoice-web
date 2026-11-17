import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarX, TriangleAlert } from 'lucide-react'

import { InvoiceDetailToolbar } from '@/components/admin/invoice-detail-toolbar'
import { ListState } from '@/components/admin/list-state'
import { InvoiceView } from '@/components/invoice/invoice-view'
import { requireAdminSession } from '@/lib/auth/admin-guard'
import { getAdminInvoice, isInvoiceExpired } from '@/lib/invoice-access'
import {
  buildInvoiceListHref,
  parseInvoiceListQuery,
  type RawSearchParams,
} from '@/lib/invoice-list-query'

export const metadata: Metadata = { title: '견적서 상세' }

interface AdminInvoiceDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<RawSearchParams>
}

// 관리자 견적서 상세: 공개 견적서와 같은 화면 컴포넌트를 재사용하고 PDF는 관리자 경로로 내려받습니다.
// 만료된 견적서도 볼 수 있습니다. (공개 경로와 달리 만료 판정을 건너뜀)
export default async function AdminInvoiceDetailPage({
  params,
  searchParams,
}: AdminInvoiceDetailPageProps) {
  // 레이아웃은 이동 시 재실행되지 않으므로 데이터를 읽기 전에 페이지에서도 세션 확인
  await requireAdminSession()

  const { id } = await params
  const access = await getAdminInvoice(id)

  // 형식 오류, 존재하지 않는 견적서는 404 (노션 원문은 노출하지 않음)
  if (!access.ok && access.reason !== 'error') {
    notFound()
  }

  // 목록에서 넘어온 검색, 정렬, 페이지 쿼리를 다시 파싱해 "목록으로" 링크에 사용 (임의 값은 기본값으로 대체됨)
  const backHref = buildInvoiceListHref(
    parseInvoiceListQuery(await searchParams)
  )

  if (!access.ok) {
    return (
      <div className="space-y-6">
        <InvoiceDetailToolbar
          backHref={backHref}
          publicHref={`/invoice/${encodeURIComponent(id)}`}
        />
        <ListState
          icon={TriangleAlert}
          tone="destructive"
          title="견적서를 불러오지 못했습니다"
          description="일시적인 오류일 수 있습니다. 잠시 후 페이지를 새로고침해 주세요."
        />
      </div>
    )
  }

  const { invoice } = access
  const expired = isInvoiceExpired(invoice.validUntil)

  return (
    <div className="space-y-6">
      <InvoiceDetailToolbar
        backHref={backHref}
        publicHref={`/invoice/${encodeURIComponent(invoice.id)}`}
      />
      {expired ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <CalendarX className="mt-0.5 size-4 shrink-0" aria-hidden />
          유효기간이 지난 견적서입니다. 관리자만 볼 수 있고, 공개 링크로는
          열람할 수 없습니다.
        </p>
      ) : null}
      <InvoiceView
        invoice={invoice}
        pdfHref={`/admin/invoices/${encodeURIComponent(invoice.id)}/pdf`}
        showInquiryNote={false}
      />
    </div>
  )
}
