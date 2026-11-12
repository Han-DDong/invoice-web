import type { UnavailableReason } from "@/lib/access";

/** 노션 조회 실패 (원인 구분용 판별 유니온) */
export type InvoiceFetchError =
  | { kind: "not_found" }
  | { kind: "query_failed"; cause?: unknown }
  | { kind: "validation_failed"; issues: string[] };

/**
 * 조회 실패를 접근 불가 사유로 변환합니다.
 * not_found는 잘못된 링크(invalid), 나머지는 일시 오류(error)로 처리합니다.
 */
export function toUnavailableReason(
  error: InvoiceFetchError,
): UnavailableReason {
  switch (error.kind) {
    case "not_found":
      return "invalid";
    case "query_failed":
    case "validation_failed":
      return "error";
  }
}
