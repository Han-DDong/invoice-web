import 'server-only'

// 인메모리 고정 윈도우 rate limiter (서버 전용, Task 011-B)
// 한계: 카운터가 서버 인스턴스 메모리에만 있어 서버리스 인스턴스 사이에 공유되지 않고,
// 인스턴스가 재시작되면 초기화됩니다. 남용을 완화할 뿐 정확한 제한이 아닙니다. (README 참고)

/** 제한 판정 결과 */
export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterSeconds: number }

interface RateLimitOptions {
  /** 윈도우당 허용 요청 수 */
  limit: number
  /** 윈도우 길이 (밀리초) */
  windowMs: number
}

interface WindowEntry {
  count: number
  resetAt: number
}

export interface RateLimiter {
  /** 키(IP 등)의 요청 1회를 기록하고 허용 여부를 반환합니다. */
  check: (key: string, now?: number) => RateLimitResult
}

/** 고정 윈도우 rate limiter를 만듭니다. */
export function createRateLimiter({
  limit,
  windowMs,
}: RateLimitOptions): RateLimiter {
  const entries = new Map<string, WindowEntry>()
  let nextSweepAt = 0

  // 메모리 증가 방지: 윈도우 한 번에 최대 1회, 만료된 항목을 정리
  function sweep(now: number): void {
    if (now < nextSweepAt) {
      return
    }
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) {
        entries.delete(key)
      }
    }
    nextSweepAt = now + windowMs
  }

  return {
    check(key, now = Date.now()) {
      sweep(now)

      const entry = entries.get(key)
      if (!entry || entry.resetAt <= now) {
        entries.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true }
      }

      if (entry.count < limit) {
        entry.count += 1
        return { allowed: true }
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      }
    },
  }
}

/**
 * 요청 헤더에서 클라이언트 IP를 읽습니다.
 * Vercel 등 프록시가 설정하는 x-forwarded-for의 첫 값을 우선합니다.
 * 프록시 없이 직접 노출된 서버에서는 클라이언트가 이 헤더를 위조할 수 있습니다.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) {
    return forwardedFor
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
