import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

// 관리자 세션 확인 (레이아웃과 각 페이지가 함께 사용)
// 레이아웃은 클라이언트 이동 시 다시 실행되지 않으므로, 데이터를 읽는 페이지에서도 반드시 호출합니다.

/** 현재 요청에 유효한 관리자 세션이 있는지 확인합니다. */
export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
}

/** 세션이 없으면 로그인 페이지로 보냅니다. */
export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) {
    redirect('/admin/login')
  }
}
