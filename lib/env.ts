import { z } from "zod";

// 서버 전용 환경변수 스키마 (.env.example과 동기화 유지)
const serverEnvSchema = z.object({
  NOTION_API_KEY: z.string().min(1, "NOTION_API_KEY가 설정되지 않았습니다."),
  NOTION_INVOICE_DATA_SOURCE_ID: z
    .string()
    .min(1, "NOTION_INVOICE_DATA_SOURCE_ID가 설정되지 않았습니다."),
  NOTION_ITEM_DATA_SOURCE_ID: z
    .string()
    .min(1, "NOTION_ITEM_DATA_SOURCE_ID가 설정되지 않았습니다."),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * 서버 환경변수를 검증해 반환합니다.
 * 빌드 시점이 아닌 실제 사용 시점에 검증하도록 지연 평가합니다.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message);
    throw new Error(`환경변수 검증 실패: ${messages.join(" ")}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
