import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/page-container"
import { cn } from "@/lib/utils"

// 상태 톤: 안내(기본) / 경고 / 오류에 따라 아이콘 배경 색을 구분
type StatusTone = "default" | "warning" | "destructive"

const toneStyles: Record<StatusTone, string> = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
}

interface StatusCardProps {
  icon: LucideIcon
  title: string
  description: string
  // 아이콘 강조 톤 (기본: default)
  tone?: StatusTone
  // 상태 코드 (예: "404") - 아이콘 아래에 강조 표시 (선택)
  code?: string
  // 버튼 등 하단 영역 (선택)
  children?: React.ReactNode
}

// 404, 에러, 접근 불가처럼 상태를 안내하는 중앙 정렬 카드 화면
// 서버/클라이언트 컴포넌트 양쪽에서 재사용할 수 있도록 훅을 사용하지 않음
export function StatusCard({
  icon: Icon,
  title,
  description,
  tone = "default",
  code,
  children,
}: StatusCardProps) {
  return (
    <PageContainer className="flex justify-center">
      <Card className="w-full max-w-md text-center shadow-sm">
        <CardHeader className="items-center gap-3">
          {/* 아이콘 배지 */}
          <div
            className={cn(
              "mx-auto flex size-14 items-center justify-center rounded-full",
              toneStyles[tone],
            )}
          >
            <Icon className="size-7" aria-hidden />
          </div>
          {/* 상태 코드: 장식용 큰 숫자 (제목이 의미를 전달하므로 스크린리더에서는 숨김) */}
          {code ? (
            <p
              aria-hidden
              className="text-5xl font-bold tracking-tight text-muted-foreground/40 sm:text-6xl"
            >
              {code}
            </p>
          ) : null}
          <CardTitle className="text-xl">
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription className="text-balance">{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent className="space-y-4">{children}</CardContent> : null}
      </Card>
    </PageContainer>
  )
}

// 확인 사항 목록 박스 (404 등 원인 안내용)
export function StatusCardChecklist({
  title = "확인 사항",
  items,
}: {
  title?: string
  items: string[]
}) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/60">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

// 담당자 문의 안내 문구 (404, 접근 불가, 에러 화면 공통)
export function StatusCardContactNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground text-balance">
      {children ?? "문제가 계속되면 견적서를 보내 준 담당자에게 문의해 주세요."}
    </p>
  )
}

// 홈으로 이동 버튼 (공통)
export function StatusCardHomeButton({ className }: { className?: string }) {
  return (
    <Button asChild variant="outline" className={cn("w-full sm:w-auto", className)}>
      <Link href="/">홈으로 이동</Link>
    </Button>
  )
}
