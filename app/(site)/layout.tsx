import { SiteShell } from '@/components/layout/site-shell'

// 공개 페이지(홈, 견적서 조회, 접근 불가 안내) 레이아웃: 공용 헤더와 푸터
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell>{children}</SiteShell>
}
