'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  ADMIN_NAV_ITEMS,
  isNavItemActive,
} from '@/components/admin/admin-nav-items'
import { cn } from '@/lib/utils'

// 사이드바 메뉴 링크: 현재 경로를 강조 (aria-current)
export function AdminNavLinks() {
  const pathname = usePathname()

  return (
    <nav aria-label="관리자 메뉴" className="flex flex-col gap-1">
      {ADMIN_NAV_ITEMS.map(item => {
        const active = isNavItemActive(item, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
