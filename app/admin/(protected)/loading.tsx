import { Skeleton } from '@/components/ui/skeleton'

// 대시보드 로딩 스켈레톤: 제목 → 요약 카드 → 두 열 카드 → 활동 순서로 실제 레이아웃과 맞춤
export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">대시보드를 불러오는 중입니다</span>
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[116px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
