import type { NextConfig } from 'next'

/**
 * 모든 응답에 붙이는 보안 헤더 (Task 011-B)
 * - Referrer-Policy: 토큰이 URL 경로(/invoice/<토큰>)에 있으므로 Referer를 보내지 않음
 * - X-Frame-Options: 다른 사이트의 iframe 삽입(클릭재킹) 차단
 * CSP(frame-ancestors 포함)는 도입하지 않기로 결정했습니다. (tasks/011 참고, 후속 과제)
 * CORS 허용 헤더는 추가하지 않습니다. 교차 출처에서 호출하는 API가 없습니다.
 */
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
