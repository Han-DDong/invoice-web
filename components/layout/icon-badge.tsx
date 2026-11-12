import type { LucideIcon } from "lucide-react"

interface IconBadgeProps {
  icon: LucideIcon
}

// 카드 제목 옆에 쓰는 아이콘 배지 (장식용이므로 스크린리더에서는 숨김)
export function IconBadge({ icon: Icon }: IconBadgeProps) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
