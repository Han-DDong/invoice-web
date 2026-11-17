import { AdminShell } from '@/components/admin/admin-shell'
import { requireAdminSession } from '@/lib/auth/admin-guard'

// 로그인한 관리자만 볼 수 있는 화면의 레이아웃 (사이드바 대시보드 틀)
// 로그인 화면(/admin/login)은 이 그룹 밖에 있어 리다이렉트가 반복되지 않습니다.
// 레이아웃은 클라이언트 이동 시 다시 실행되지 않으므로 각 페이지에서도 requireAdminSession을 호출합니다.
export default async function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminSession()

  return <AdminShell>{children}</AdminShell>
}
