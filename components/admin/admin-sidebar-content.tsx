import Link from 'next/link'
import { FileText, LogOut } from 'lucide-react'

import { AdminNavLinks } from '@/components/admin/admin-nav-links'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { adminName } from '@/lib/site'

// 사이드바 내용: 로고, 메뉴, 테마 토글, 로그아웃 (데스크톱 사이드바와 모바일 드로어가 공유)
// 로그아웃은 JS 없이 동작하는 일반 form POST입니다.
export function AdminSidebarContent() {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/admin"
        className="flex items-center gap-2 px-2 font-bold transition-opacity hover:opacity-70"
      >
        <FileText className="size-5 text-primary" aria-hidden />
        <span>{adminName}</span>
      </Link>
      <AdminNavLinks />
      <div className="mt-auto flex items-center gap-2 border-t pt-4">
        <ThemeToggle />
        <form action="/admin/session" method="post" className="flex-1">
          <input type="hidden" name="intent" value="logout" />
          <Button type="submit" variant="outline" className="w-full">
            <LogOut aria-hidden />
            로그아웃
          </Button>
        </form>
      </div>
    </div>
  )
}
