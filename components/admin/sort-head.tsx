import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface SortHeadProps {
  label: string
  /** 현재 이 컬럼으로 정렬 중인지 */
  active: boolean
  /** 현재 정렬 방향 (active일 때만 의미 있음) */
  order: 'asc' | 'desc'
  /** 클릭 시 이동할 URL (정렬 토글 결과) */
  href: string
  numeric?: boolean
}

// 정렬 헤더: JS 없이 동작하는 Link 기반 (견적서, 클라이언트 표 공용)
export function SortHead({
  label,
  active,
  order,
  href,
  numeric,
}: SortHeadProps) {
  const Icon = !active ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown
  const ariaSort = !active
    ? 'none'
    : order === 'asc'
      ? 'ascending'
      : 'descending'

  return (
    <TableHead aria-sort={ariaSort} className={cn(numeric && 'text-right')}>
      <Link
        href={href}
        className={cn(
          '-mx-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </Link>
    </TableHead>
  )
}
