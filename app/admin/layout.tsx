import type { Metadata } from 'next'

import { adminName } from '@/lib/site'

// 관리자 영역 공통: 검색엔진 색인 금지
// 헤더와 푸터는 공개 페이지용이라 쓰지 않고, 인증이 필요한 화면은 (protected) 그룹에서 처리합니다.
export const metadata: Metadata = {
  title: { default: adminName, template: `%s | ${adminName}` },
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex flex-1 flex-col">{children}</div>
}
