import 'server-only'

import { Client } from '@notionhq/client'

import { getServerEnv } from '@/lib/env'

// 노션 API 클라이언트 (서버 전용, F001)
// Server Component / Route Handler에서만 import합니다. "use client" 파일에서 import하면 빌드 에러가 납니다.

/** 요청 1회당 타임아웃 (밀리초) */
const NOTION_TIMEOUT_MS = 10_000

/** SDK 내장 재시도 설정 (429/529는 항상, 500/503은 멱등 요청만 재시도) */
const NOTION_RETRY_OPTIONS = {
  maxRetries: 2,
  initialRetryDelayMs: 500,
  maxRetryDelayMs: 5_000,
} as const

let cachedClient: Client | null = null

/**
 * 노션 클라이언트를 반환합니다. 모듈 단위로 한 번만 생성합니다.
 * 환경변수 검증은 첫 호출 시점에 수행합니다. (빌드 시점에 키가 없어도 빌드 가능)
 */
export function getNotionClient(): Client {
  if (cachedClient) {
    return cachedClient
  }

  const env = getServerEnv()

  cachedClient = new Client({
    auth: env.NOTION_API_KEY,
    timeoutMs: NOTION_TIMEOUT_MS,
    retry: NOTION_RETRY_OPTIONS,
    // 노션 데이터는 항상 최신으로 조회합니다. (캐시 전략은 Task 010에서 결정)
    fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
  })

  return cachedClient
}
