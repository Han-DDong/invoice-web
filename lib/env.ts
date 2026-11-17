import { z } from 'zod'

// 서버 전용 환경변수 스키마 (.env.example과 동기화 유지)
const serverEnvSchema = z.object({
  NOTION_API_KEY: z.string().min(1, 'NOTION_API_KEY가 설정되지 않았습니다.'),
  NOTION_INVOICE_DATABASE_ID: z
    .string()
    .min(1, 'NOTION_INVOICE_DATABASE_ID가 설정되지 않았습니다.'),
  NOTION_ITEM_DATABASE_ID: z
    .string()
    .min(1, 'NOTION_ITEM_DATABASE_ID가 설정되지 않았습니다.'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedEnv: ServerEnv | null = null

/**
 * 서버 환경변수를 검증해 반환합니다.
 * 빌드 시점이 아닌 실제 사용 시점에 검증하도록 지연 평가합니다.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv
  }

  const result = serverEnvSchema.safeParse(process.env)
  if (!result.success) {
    const messages = result.error.issues.map(issue => issue.message)
    throw new Error(`환경변수 검증 실패: ${messages.join(' ')}`)
  }

  cachedEnv = result.data
  return cachedEnv
}

// 관리자 인증 환경변수 스키마 (Phase 5, Task 013-A)
// 공개 견적서 조회에는 필요 없으므로 서버 환경변수와 분리해, 관리자 설정이 없어도 공개 페이지는 동작합니다.
const adminEnvSchema = z.object({
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD가 설정되지 않았습니다.'),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(32, 'ADMIN_SESSION_SECRET은 32자 이상이어야 합니다.'),
})

export type AdminEnv = z.infer<typeof adminEnvSchema>

let cachedAdminEnv: AdminEnv | null = null

/**
 * 관리자 환경변수를 검증해 반환합니다. (지연 평가)
 * 오류 메시지에는 변수 이름만 담고 값은 포함하지 않습니다.
 */
export function getAdminEnv(): AdminEnv {
  if (cachedAdminEnv) {
    return cachedAdminEnv
  }

  const result = adminEnvSchema.safeParse(process.env)
  if (!result.success) {
    const messages = result.error.issues.map(issue => issue.message)
    throw new Error(`관리자 환경변수 검증 실패: ${messages.join(' ')}`)
  }

  cachedAdminEnv = result.data
  return cachedAdminEnv
}
