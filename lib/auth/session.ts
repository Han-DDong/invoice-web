import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { getAdminEnv } from '@/lib/env'

// 관리자 세션 유틸 (Phase 5, Task 013-A)
// 서명된 쿠키 하나로 세션을 표현합니다. 토큰 = `v1.<만료 epoch 초>.<HMAC-SHA256 base64url>`
// 서버에 세션 저장소가 없으므로(서버리스) 만료 시각을 서명에 포함하고, 로그아웃은 쿠키 삭제로 처리합니다.

/** 세션 쿠키 이름 */
export const ADMIN_SESSION_COOKIE = 'admin_session'

/** 세션 유효 시간 (초): 8시간 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

/** 쿠키가 전송되는 경로 (관리자 영역에만 전송) */
export const ADMIN_COOKIE_PATH = '/admin'

const TOKEN_VERSION = 'v1'

/** 서명 대상 문자열에 HMAC-SHA256 서명을 만듭니다. */
function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** 두 문자열을 상수 시간으로 비교합니다. 길이가 달라도 시간 차이가 새지 않도록 해시 후 비교합니다. */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

/**
 * 세션 토큰을 만듭니다.
 * @param now 현재 시각 (밀리초, 테스트용)
 * @param secret 서명 시크릿 (생략 시 환경변수)
 */
export function createSessionToken(
  now: number = Date.now(),
  secret: string = getAdminEnv().ADMIN_SESSION_SECRET
): string {
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS
  const payload = `${TOKEN_VERSION}.${expiresAt}`
  return `${payload}.${sign(payload, secret)}`
}

/**
 * 세션 토큰의 서명과 만료를 검증합니다.
 * 형식이 틀리거나 서명이 다르거나 만료됐으면 false입니다. 예외는 던지지 않습니다.
 */
export function verifySessionToken(
  token: string | undefined,
  now: number = Date.now(),
  secret?: string
): boolean {
  if (!token) {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }
  const [version, expiresAtText, signature] = parts
  if (version !== TOKEN_VERSION || !/^\d{1,12}$/.test(expiresAtText)) {
    return false
  }

  let signingSecret: string
  try {
    signingSecret = secret ?? getAdminEnv().ADMIN_SESSION_SECRET
  } catch {
    // 환경변수 미설정: 어떤 토큰도 유효하지 않음
    return false
  }

  const expected = sign(`${version}.${expiresAtText}`, signingSecret)
  if (!safeEqual(signature, expected)) {
    return false
  }

  return Number(expiresAtText) > Math.floor(now / 1000)
}

/** 입력 비밀번호가 관리자 비밀번호와 같은지 상수 시간으로 비교합니다. */
export function verifyAdminPassword(
  input: string,
  expected: string = getAdminEnv().ADMIN_PASSWORD
): boolean {
  return safeEqual(input, expected)
}

/** 세션 쿠키 공통 옵션 (로그인 설정과 로그아웃 삭제에 같은 값을 써야 삭제됩니다.) */
export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: ADMIN_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  }
}
