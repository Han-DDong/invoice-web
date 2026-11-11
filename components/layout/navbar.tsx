import Link from "next/link"
import { FileText } from "lucide-react"
import { siteConfig } from "@/lib/site"
import { ThemeToggle } from "./theme-toggle"

// 헤더: 홈 링크와 테마 토글만 노출 (견적서 상세/접근 불가 페이지는 메뉴에 두지 않음)
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
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
