import { z } from "zod";

// 공유 링크 접근 제어 관련 스키마와 헬퍼 (F004, F010)

/**
 * 공유 토큰 형식 검증
 * 추측 불가능한 랜덤 문자열(영문/숫자/-/_)만 허용해 노션 조회 전에 잘못된 링크를 걸러냅니다.
 */
export const shareTokenSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

/** 접근 불가 사유 */
export const unavailableReasonSchema = z.enum([
  "invalid",
  "unpublished",
  "expired",
  "error",
]);

export type UnavailableReason = z.infer<typeof unavailableReasonSchema>;

/** 접근 불가 페이지 경로 */
export const UNAVAILABLE_PATH = "/unavailable";

/** 사유를 포함한 접근 불가 페이지 URL을 만듭니다. */
export function getUnavailableUrl(reason: UnavailableReason): string {
  return `${UNAVAILABLE_PATH}?reason=${reason}`;
}

/** 쿼리 파라미터 값을 사유로 변환합니다. 알 수 없는 값은 "invalid"로 처리합니다. */
export function parseUnavailableReason(
  value: string | string[] | undefined,
): UnavailableReason {
  const result = unavailableReasonSchema.safeParse(value);
  return result.success ? result.data : "invalid";
}
