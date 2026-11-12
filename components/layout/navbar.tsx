import Link from "next/link"
import { FileText } from "lucide-react"
import { containerWidthClass, siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

// 헤더: 홈 링크와 테마 토글만 노출 (견적서 상세/접근 불가 페이지는 메뉴에 두지 않음)
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className={cn(containerWidthClass, "flex h-14 items-center justify-between")}>
        <Link
          href="/"
          className="flex items-center gap-2 font-bold transition-opacity hover:opacity-70"
        >
          <FileText className="h-5 w-5 text-primary" aria-hidden />
          <span>{siteConfig.name}</span>
        </Link>
        <nav className="flex items-center">
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
