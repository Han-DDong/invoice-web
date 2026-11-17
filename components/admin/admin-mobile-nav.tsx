'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface AdminMobileNavProps {
  /** 드로어 안에 표시할 사이드바 내용 (서버 컴포넌트를 그대로 전달) */
  children: React.ReactNode
}

// 모바일 드로어 메뉴: 링크를 누르면 닫힙니다.
export function AdminMobileNav({ children }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="메뉴 열기">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>관리자 메뉴</SheetTitle>
          <SheetDescription>관리자 페이지 이동 메뉴</SheetDescription>
        </SheetHeader>
        {/* 이벤트 위임: 안쪽 링크 클릭 시 드로어 닫기 */}
        <div
          className="h-full"
          onClick={event => {
            if ((event.target as HTMLElement).closest('a')) {
              setOpen(false)
            }
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
