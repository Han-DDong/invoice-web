import 'server-only'

import { isNotionClientError, type Logger } from '@notionhq/client'

// 서버 전용 로거 (Task 011-A)
// 로그 한 줄 = JSON 한 줄입니다. 배포 플랫폼 로그에서 필드별로 검색하기 쉽게 하기 위해서입니다.
// 남기는 값: scope, stage, 오류 code / status / name, 토큰 앞 6자, Zod 검증 실패 경로
// 남기지 않는 값: 오류 객체 원문과 message, 노션 응답 본문, 요청 헤더, API 키, DB ID, 전체 토큰

/** 로그를 남기는 모듈 */
export type LogScope = 'invoice-service' | 'pdf-route' | 'notion-sdk'

/** 로그를 남기는 단계 */
export type LogStage =
  'page' | 'items' | 'validation' | 'render' | 'cache' | 'request'

/** 로그에 남길 수 있는 값 */
interface ServerLogEntry {
  scope: LogScope
  stage: LogStage
  /** 사람이 읽는 고정 문구 (사용자 입력이나 오류 원문을 넣지 않음) */
  event: string
  /** 공유 토큰(노션 페이지 ID). 앞 6자만 기록합니다. */
  token?: string
  /** 원인 오류. code, status, name만 꺼내 기록합니다. */
  error?: unknown
  /** Zod 검증 실패 필드 경로 (값은 포함하지 않음) */
  issues?: string[]
}

/** 토큰에서 남길 앞부분 길이 */
const TOKEN_PREFIX_LENGTH = 6

/** 토큰을 앞 6자 + '…'로 줄입니다. 너무 짧으면 전부 가립니다. */
export function maskToken(token: string): string {
  if (token.length <= TOKEN_PREFIX_LENGTH) {
    return '…'
  }
  return `${token.slice(0, TOKEN_PREFIX_LENGTH)}…`
}

/** 오류에서 기록해도 안전한 값(code, status, name)만 꺼냅니다. message는 ID를 포함할 수 있어 제외합니다. */
export function describeError(error: unknown): {
  errorName?: string
  code?: string
  status?: number
} {
  if (isNotionClientError(error)) {
    return {
      errorName: error.name,
      code: error.code,
      status: 'status' in error ? error.status : undefined,
    }
  }
  if (error instanceof Error) {
    return { errorName: error.name }
  }
  return { errorName: typeof error }
}

/** 오류 로그를 JSON 한 줄로 출력합니다. */
export function logServerError(entry: ServerLogEntry): void {
  const { error, token, ...rest } = entry
  const line = {
    level: 'error',
    ...rest,
    ...(token === undefined ? {} : { token: maskToken(token) }),
    ...(error === undefined ? {} : describeError(error)),
  }
  console.error(JSON.stringify(line))
}

/**
 * 노션 SDK 내부 로그를 대체하는 로거입니다.
 * SDK 기본 로거는 오류 message(페이지 ID 포함)를 그대로 출력하므로 code만 남깁니다.
 */
export const notionSdkLogger: Logger = (level, message, extraInfo) => {
  const code = typeof extraInfo.code === 'string' ? extraInfo.code : undefined
  console.warn(
    JSON.stringify({
      level,
      scope: 'notion-sdk',
      stage: 'request',
      event: message,
      ...(code === undefined ? {} : { code }),
    })
  )
}
