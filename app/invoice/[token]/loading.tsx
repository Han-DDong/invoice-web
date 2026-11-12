import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/page-container"

// 견적 항목 자리 표시 개수
const itemPlaceholderCount = 3

// 견적서 상세 로딩 스켈레톤 (헤더 → 기본 정보 → 항목 표 → 합계 순으로 실제 레이아웃과 맞춤)
// 높이 기준: 실제 화면 측정값 (헤더 89px, 정보 패널 86px, 표 헤더 48px, 표 행 53px, 모바일 카드 161px, 총액 카드 222px, 문의 박스 54px)
export default function InvoiceLoading() {
  return (
    <PageContainer>
      <div role="status" aria-busy="true">
        <span className="sr-only">견적서를 불러오는 중입니다</span>
        <Card className="gap-8 rounded-2xl shadow-sm">
          {/* 헤더: 견적서 제목, 발행 정보, PDF 버튼 */}
          <CardHeader className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-5 w-52" />
            </div>
            <Skeleton className="h-9 w-full sm:w-36" />
          </CardHeader>

          <CardContent className="space-y-10">
            {/* 기본 정보 패널: 클라이언트, 발행일, 유효기간 (라벨 16px + 값 24px) */}
            <div className="grid grid-cols-1 gap-5 rounded-xl bg-muted/40 p-5 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-full max-w-48" />
                </div>
              ))}
            </div>

            {/* 항목 영역: 제목 + 모바일 카드형 / 데스크톱 표 */}
            <div className="space-y-4">
              <Skeleton className="h-7 w-24" />
              <div className="space-y-4 md:hidden">
                {Array.from({ length: itemPlaceholderCount }, (_, index) => (
                  <Skeleton key={index} className="h-[161px] w-full rounded-xl" />
                ))}
              </div>
              <div className="hidden overflow-hidden rounded-xl border md:block">
                <Skeleton className="h-12 w-full rounded-none" />
                {Array.from({ length: itemPlaceholderCount }, (_, index) => (
                  <div key={index} className="flex h-[53px] items-center border-t px-5">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* 총액 카드: 실제와 동일한 테두리 카드 (데스크톱 222px) */}
            <Skeleton className="h-[222px] w-full rounded-xl" />
          </CardContent>
        </Card>
        {/* 문의 안내 박스 (54px) */}
        <Skeleton className="mt-6 h-[54px] w-full rounded-xl" />
      </div>
    </PageContainer>
  )
}
