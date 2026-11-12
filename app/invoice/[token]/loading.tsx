import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"

// 견적 항목 자리 표시 개수
const itemPlaceholderCount = 3

// 견적서 상세 로딩 스켈레톤 (헤더 → 기본 정보 → 항목 표 → 합계 순으로 실제 레이아웃과 맞춤)
export default function InvoiceLoading() {
  return (
    <PageContainer>
      <div role="status" aria-busy="true" className="mx-auto max-w-4xl">
        <span className="sr-only">견적서를 불러오는 중입니다</span>
        <Card>
          {/* 헤더: 견적번호, 상태, PDF 버튼 */}
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-full sm:w-32" />
          </CardHeader>

          <CardContent className="space-y-8">
            {/* 기본 정보: 수신처, 발행일, 유효기간 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>

            {/* 항목 표: 모바일은 카드형, 데스크톱은 행 형태 */}
            <div className="space-y-3">
              <Skeleton className="hidden h-8 w-full md:block" />
              {Array.from({ length: itemPlaceholderCount }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full md:h-10" />
              ))}
            </div>

            {/* 합계 영역 */}
            <div className="ml-auto w-full space-y-2 sm:w-64">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
