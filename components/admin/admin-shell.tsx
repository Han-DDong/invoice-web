import Link from 'next/link'
import { FileText } from 'lucide-react'

import { AdminMobileNav } from '@/components/admin/admin-mobile-nav'
import { AdminSidebarContent } from '@/components/admin/admin-sidebar-content'
import { adminContainerWidthClass, adminName } from '@/lib/site'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  children: React.ReactNode
}

// 관리자 대시보드 틀: 데스크톱(md 이상)은 좌측 고정 사이드바, 모바일은 상단 헤더 + 드로어 메뉴
export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card md:block">
        <AdminSidebarContent />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <FileText className="size-5 text-primary" aria-hidden />
          <span>{adminName}</span>
        </Link>
        <AdminMobileNav>
          <AdminSidebarContent />
        </AdminMobileNav>
      </header>

      <main className="min-w-0 flex-1 py-6 md:py-8">
        <div className={cn(adminContainerWidthClass)}>{children}</div>
      </main>
    </div>
  )
}
