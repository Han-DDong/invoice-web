import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/page-container"

interface StatusCardProps {
  icon: LucideIcon
  title: string
  description: string
  // 버튼 등 하단 영역 (선택)
  children?: React.ReactNode
}

// 404, 에러, 접근 불가처럼 상태를 안내하는 중앙 정렬 카드 화면
// 서버/클라이언트 컴포넌트 양쪽에서 재사용할 수 있도록 훅을 사용하지 않음
export function StatusCard({ icon: Icon, title, description, children }: StatusCardProps) {
  return (
    <PageContainer className="flex justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Icon className="mx-auto mb-2 h-10 w-10 text-muted-foreground" aria-hidden />
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent className="space-y-4">{children}</CardContent> : null}
      </Card>
    </PageContainer>
  )
}
