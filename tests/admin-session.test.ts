import { describe, expect, it } from 'vitest'

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getSessionCookieOptions,
  verifyAdminPassword,
  verifySessionToken,
} from '@/lib/auth/session'

// 관리자 세션 유틸 테스트 (환경변수는 인자로 주입, 네트워크 없음)

const SECRET = 'test-secret-test-secret-test-secret-1234'
const OTHER_SECRET = 'other-secret-other-secret-other-secret-12'
const NOW = Date.UTC(2026, 10, 17, 0, 0, 0)

describe('세션 토큰', () => {
  it('발급한 토큰은 유효기간 안에서 검증 통과', () => {
    const token = createSessionToken(NOW, SECRET)
    expect(verifySessionToken(token, NOW + 1000, SECRET)).toBe(true)
  })

  it('만료 시각이 되면 거부', () => {
    const token = createSessionToken(NOW, SECRET)
    const expiresAtMs = NOW + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
    expect(verifySessionToken(token, expiresAtMs - 1000, SECRET)).toBe(true)
    expect(verifySessionToken(token, expiresAtMs, SECRET)).toBe(false)
    expect(verifySessionToken(token, expiresAtMs + 1000, SECRET)).toBe(false)
  })

  it('다른 시크릿으로 서명한 토큰은 거부', () => {
    const token = createSessionToken(NOW, OTHER_SECRET)
    expect(verifySessionToken(token, NOW, SECRET)).toBe(false)
  })

  it('만료 시각을 늘려 위조하면 거부', () => {
    const [version, expiresAt, signature] = createSessionToken(
      NOW,
      SECRET
    ).split('.')
    const forged = `${version}.${Number(expiresAt) + 99999}.${signature}`
    expect(verifySessionToken(forged, NOW, SECRET)).toBe(false)
  })

  it('서명을 바꾸거나 형식이 틀리면 거부', () => {
    const token = createSessionToken(NOW, SECRET)
    expect(verifySessionToken(`${token}x`, NOW, SECRET)).toBe(false)
    expect(verifySessionToken(token.slice(0, -2), NOW, SECRET)).toBe(false)
    expect(verifySessionToken('v1.abc.def', NOW, SECRET)).toBe(false)
    expect(verifySessionToken('v2.9999999999.abc', NOW, SECRET)).toBe(false)
    expect(verifySessionToken('', NOW, SECRET)).toBe(false)
    expect(verifySessionToken(undefined, NOW, SECRET)).toBe(false)
  })
})

describe('verifyAdminPassword', () => {
  it('같은 비밀번호만 통과', () => {
    expect(verifyAdminPassword('correct-password', 'correct-password')).toBe(
      true
    )
    expect(verifyAdminPassword('wrong', 'correct-password')).toBe(false)
    expect(verifyAdminPassword('', 'correct-password')).toBe(false)
  })

  it('길이가 달라도 예외 없이 거부', () => {
    expect(verifyAdminPassword('a', 'a-much-longer-password')).toBe(false)
    expect(verifyAdminPassword('a-much-longer-password-input', 'short')).toBe(
      false
    )
  })
})

describe('getSessionCookieOptions', () => {
  it('httpOnly, sameSite=lax, /admin 경로', () => {
    const options = getSessionCookieOptions(60)
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/admin',
      maxAge: 60,
    })
  })
})
