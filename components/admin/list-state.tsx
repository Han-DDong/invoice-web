import type { LucideIcon } from 'lucide-react'

interface ListStateProps {
  icon: LucideIcon
  title: string
  description: string
  tone?: 'default' | 'destructive'
  /** 하단 영역 (버튼 등) */
  children?: React.ReactNode
}

// 목록의 빈 상태, 조회 실패 안내 (원인 원문은 노출하지 않고 고정 문구만 표시)
export function ListState({
  icon: Icon,
  title,
  description,
  tone = 'default',
  children,
}: ListStateProps) {
  return (
    <div
      role={tone === 'destructive' ? 'alert' : 'status'}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center"
    >
      <span
        className={
          tone === 'destructive'
            ? 'flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive'
            : 'flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground'
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}
