import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/page-container"
import { getUnavailableUrl, shareTokenSchema } from "@/lib/access"

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

  // TODO(F001): 토큰으로 노션 견적서 조회 후 상태/유효기간 검증
  //   - 미발행 → getUnavailableUrl("unpublished")
  //   - 만료 → getUnavailableUrl("expired")
  //   - 조회 실패 → getUnavailableUrl("error")
  // TODO(F002): 견적 기본 정보, 항목 표(모바일 카드형), 합계/부가세 표시
  // TODO(F003): PDF 다운로드 버튼 (app/invoice/[token]/pdf/route.ts)
  return (
    <PageContainer>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>견적서 준비 중</CardTitle>
          <CardDescription>견적서 조회 기능은 아직 구현되지 않았습니다.</CardDescription>
        </CardHeader>
      </Card>
    </PageContainer>
  )
}
