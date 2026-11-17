import { LayoutDashboard, FileText, Users, type LucideIcon } from 'lucide-react'

// 관리자 메뉴 정의 (사이드바와 모바일 드로어가 공유)

export interface AdminNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** true면 경로가 정확히 같을 때만 활성 (대시보드는 /admin 하위 모든 경로와 겹치므로) */
  exact?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/invoices', label: '견적서 관리', icon: FileText },
  { href: '/admin/clients', label: '클라이언트 관리', icon: Users },
]

/** 현재 경로에서 메뉴가 활성인지 판정합니다. */
export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
