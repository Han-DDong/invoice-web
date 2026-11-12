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
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-5 w-52" />
            </div>
            <Skeleton className="h-9 w-full sm:w-36" />
          </CardHeader>

          <CardContent className="space-y-8">
            {/* 기본 정보: 클라이언트, 발행일, 유효기간 (dt 20px + dd 24px) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-6 w-full max-w-48" />
                </div>
              ))}
            </div>

            {/* 항목 영역: 제목 + 모바일 카드형(약 128px) / 데스크톱 표(헤더 40px, 행 41px) */}
            <div className="space-y-3">
              <Skeleton className="h-7 w-24" />
              <div className="space-y-3 md:hidden">
                {Array.from({ length: itemPlaceholderCount }, (_, index) => (
                  <Skeleton key={index} className="h-32 w-full" />
                ))}
              </div>
              <div className="hidden space-y-1 md:block">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: itemPlaceholderCount }, (_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            </div>

            {/* 합계 영역: 실제와 동일하게 상단 구분선 + 한 줄 합계 */}
            <div className="ml-auto w-full border-t pt-4 sm:w-72">
              <Skeleton className="h-7 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
