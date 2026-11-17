import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const ITEM_PLACEHOLDER_COUNT = 3

// 견적서 상세 로딩 스켈레톤 (상단 바 → 헤더 → 기본 정보 → 항목 → 합계)
export default function AdminInvoiceDetailLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">견적서를 불러오는 중입니다</span>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Card className="gap-8 rounded-2xl shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-52" />
          </div>
          <Skeleton className="h-9 w-full sm:w-36" />
        </CardHeader>
        <CardContent className="space-y-10">
          <Skeleton className="h-[86px] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-24" />
            {Array.from({ length: ITEM_PLACEHOLDER_COUNT }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[222px] w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  )
}
