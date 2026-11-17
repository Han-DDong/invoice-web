import { Skeleton } from '@/components/ui/skeleton'

const ROW_COUNT = 8

// 클라이언트 목록 로딩 스켈레톤
export default function AdminClientsLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">클라이언트 목록을 불러오는 중입니다</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-full sm:max-w-sm" />
      <div className="overflow-hidden rounded-xl border">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <div key={index} className="flex h-[53px] items-center border-t px-4">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
