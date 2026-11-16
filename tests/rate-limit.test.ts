import { describe, expect, it } from 'vitest'

import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

// 인메모리 rate limiter 테스트

describe('createRateLimiter', () => {
  it('윈도우 안에서 limit까지 허용하고 초과 시 남은 초를 반환', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 })
    expect(limiter.check('ip', 0)).toEqual({ allowed: true })
    expect(limiter.check('ip', 1_000)).toEqual({ allowed: true })
    expect(limiter.check('ip', 1_500)).toEqual({
      allowed: false,
      retryAfterSeconds: 59,
    })
  })

  it('윈도우가 지나면 다시 허용', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('ip', 0)
    expect(limiter.check('ip', 59_999).allowed).toBe(false)
    expect(limiter.check('ip', 60_000).allowed).toBe(true)
  })

  it('키별로 따로 센다', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limiter.check('a', 0)
    expect(limiter.check('b', 0).allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  it('x-forwarded-for 첫 값을 우선', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      'x-real-ip': '10.0.0.2',
    })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('없으면 x-real-ip, 둘 다 없으면 unknown', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '10.0.0.2' }))).toBe(
      '10.0.0.2'
    )
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
