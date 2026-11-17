import { Skeleton } from '@/components/ui/skeleton'

// 목록 로딩 스켈레톤: 제목 → 표 헤더 → 행 → 페이지네이션 순서로 실제 레이아웃과 맞춤
const ROW_COUNT = 10

export default function AdminInvoicesLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">견적서 목록을 불러오는 중입니다</span>
      <Skeleton className="h-8 w-40" />
      <div className="overflow-hidden rounded-xl border">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <div key={index} className="flex h-[53px] items-center border-t px-4">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
    </div>
  )
}
