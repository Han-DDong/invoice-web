import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { InvoiceView } from '@/components/invoice/invoice-view'
import { PageContainer } from '@/components/layout/page-container'
import { getUnavailableUrl } from '@/lib/access'
import { getAccessibleInvoice } from '@/lib/invoice-access'

export const metadata: Metadata = {
  title: '견적서',
  // 공유 링크 페이지는 검색엔진에 노출하지 않음
  robots: { index: false, follow: false },
}

interface InvoicePageProps {
  params: Promise<{ token: string }>
}

// 견적서 상세 페이지 (공유 토큰 = 노션 페이지 ID 링크로만 진입)
// 노션 조회 결과는 서비스 계층에서 30초 캐시, 만료 판정은 요청마다 수행 (Task 010-A)
export default async function InvoicePage({ params }: InvoicePageProps) {
  const { token } = await params

  // F004, F010, F011: 토큰 형식 → 노션 조회 → 유효기간 순으로 판정
  const access = await getAccessibleInvoice(token)

  if (!access.ok) {
    // 존재하지 않는 견적서는 404 화면
    if (access.reason === 'not_found') {
      notFound()
    }
    // 형식 오류(invalid), 만료(expired), 조회 실패(error)는 접근 불가 페이지로 이동
    redirect(getUnavailableUrl(access.reason))
  }

  return (
    <PageContainer>
      <InvoiceView invoice={access.invoice} />
    </PageContainer>
  )
}
