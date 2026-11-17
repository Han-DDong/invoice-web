import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'

interface SiteShellProps {
  children: React.ReactNode
}

// 공개 페이지 공통 틀 (헤더 + 본문 + 푸터)
// 라우트 그룹 (site) 레이아웃과 루트 not-found가 함께 사용합니다.
// 관리자 영역(/admin)은 자체 헤더를 쓰므로 이 틀을 쓰지 않습니다.
export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
