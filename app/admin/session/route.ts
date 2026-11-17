import { getAdminEnv } from '@/lib/env'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getSessionCookieOptions,
  verifyAdminPassword,
} from '@/lib/auth/session'
import { logServerError } from '@/lib/logger'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

// 관리자 로그인 / 로그아웃 처리 (Phase 5, Task 013-A)
// 일반 form POST(intent=login | logout)를 받아 쿠키를 설정하거나 삭제하고 303으로 이동시킵니다.
// 참고: 로그인 화면(page.tsx)과 같은 경로에는 route.ts를 둘 수 없어 /admin/session에 둡니다.
export const runtime = 'nodejs'

/** 로그인 시도 제한: IP당 1분 5회 */
const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 60_000 } as const

// 인스턴스 메모리에만 있으므로 인스턴스 간 공유되지 않고 재시작 시 초기화됩니다. (lib/rate-limit.ts 참고)
const loginRateLimiter = createRateLimiter(LOGIN_RATE_LIMIT)

/** 이동 대상 (고정 경로만 사용해 open redirect를 막습니다.) */
function redirectTo(
  path: string,
  setCookie?: { name: string; value: string; maxAge: number }
): Response {
  const headers = new Headers({
    Location: path,
    'Cache-Control': 'no-store',
  })
  if (setCookie) {
    const options = getSessionCookieOptions(setCookie.maxAge)
    const attributes = [
      `${setCookie.name}=${setCookie.value}`,
      `Path=${options.path}`,
      `Max-Age=${options.maxAge}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(options.secure ? ['Secure'] : []),
    ]
    headers.append('Set-Cookie', attributes.join('; '))
  }
  return new Response(null, { status: 303, headers })
}

/**
 * 다른 출처에서 보낸 요청인지 확인합니다.
 * 이 서비스는 Referrer-Policy: no-referrer를 쓰므로 같은 출처 form POST도 Origin이 'null'로 올 수 있어,
 * 브라우저가 보내는 Sec-Fetch-Site를 먼저 보고 없을 때만 Origin과 Host를 비교합니다.
 */
function isCrossOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite) {
    return fetchSite !== 'same-origin' && fetchSite !== 'none'
  }

  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}

export async function POST(request: Request): Promise<Response> {
  if (isCrossOrigin(request)) {
    return new Response('허용되지 않는 요청입니다.', {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const formData = await request.formData().catch(() => null)
  const intent = formData?.get('intent')

  // 로그아웃: 로그인 때와 같은 경로·옵션으로 만료시켜 쿠키를 삭제
  if (intent === 'logout') {
    return redirectTo('/admin/login', {
      name: ADMIN_SESSION_COOKIE,
      value: '',
      maxAge: 0,
    })
  }

  if (intent !== 'login') {
    return redirectTo('/admin/login?error=invalid')
  }

  const limited = loginRateLimiter.check(getClientIp(request.headers))
  if (!limited.allowed) {
    return redirectTo('/admin/login?error=rate_limited')
  }

  try {
    getAdminEnv()
  } catch (error) {
    // 설정 누락: 값은 로그에 남기지 않고 이름만 있는 오류 종류만 기록
    logServerError({
      scope: 'admin-auth',
      stage: 'auth',
      event: '관리자 환경변수 검증 실패',
      error,
    })
    return redirectTo('/admin/login?error=config')
  }

  const password = formData?.get('password')
  if (typeof password !== 'string' || !verifyAdminPassword(password)) {
    return redirectTo('/admin/login?error=invalid')
  }

  return redirectTo('/admin', {
    name: ADMIN_SESSION_COOKIE,
    value: createSessionToken(),
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}
