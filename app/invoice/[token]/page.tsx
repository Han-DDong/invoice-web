import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { InvoiceView } from "@/components/invoice/invoice-view"
import { PageContainer } from "@/components/layout/page-container"
import { getUnavailableUrl, shareTokenSchema } from "@/lib/access"
import { getDummyInvoice } from "@/lib/dummy/invoice"

export const metadata: Metadata = {
  title: "견적서",
  // 공유 링크 페이지는 검색엔진에 노출하지 않음
  robots: { index: false, follow: false },
}

interface InvoicePageProps {
  params: Promise<{ token: string }>
}

// 견적서 상세 페이지 (공유 토큰 링크로만 진입)
export default async function InvoicePage({ params }: InvoicePageProps) {
  const { token } = await params

  // F004: 형식이 잘못된 토큰은 노션 조회 없이 접근 불가 페이지로 이동
  if (!shareTokenSchema.safeParse(token).success) {
    redirect(getUnavailableUrl("invalid"))
  }

  // TODO(Task 008): 더미 조회를 노션 페이지 ID 기반 조회로 교체 (더미 사용 지점은 이곳 한 곳)
  const invoice = getDummyInvoice(token)

  // F011: 존재하지 않는 견적서는 404 화면
  if (!invoice) {
    notFound()
  }

  // TODO(F001): 노션 조회 실패 시 getUnavailableUrl("error")
  // TODO(F003): PDF 다운로드 동작 연결 (app/invoice/[token]/pdf/route.ts, 합계는 항목 금액 합계, 부가세 없음)
  return (
    <PageContainer>
      <InvoiceView invoice={invoice} />
    </PageContainer>
  )
}
