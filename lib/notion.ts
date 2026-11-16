import 'server-only'

import { Client } from '@notionhq/client'

import { getServerEnv } from '@/lib/env'
import { notionSdkLogger } from '@/lib/logger'

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
    // SDK 기본 로거는 오류 원문(페이지 ID 포함)을 출력하므로 code만 남기는 로거로 대체 (Task 011-A)
    logger: notionSdkLogger,
    // fetch 단위로는 캐시하지 않습니다. 캐시는 lib/invoice-service.ts에서
    // 조회 결과(Invoice) 단위로 한 곳에서만 합니다. (Task 010-A)
    fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
  })

  return cachedClient
}
