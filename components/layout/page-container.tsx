import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

// 모든 페이지에서 공통으로 쓰는 중앙 정렬 컨테이너
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-4 py-12 md:py-16", className)}>
      {children}
    </div>
  )
}
