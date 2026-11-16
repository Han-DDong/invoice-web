import 'server-only'

import { shareTokenSchema } from '@/lib/access'
import { getInvoiceByPageId } from '@/lib/invoice-service'
import { formatKstDate } from '@/lib/notion-parser'
import type { Invoice } from '@/types/invoice'

// 공유 링크 접근 판정 (F004, F010, F011)
// 견적서 페이지와 PDF 라우트(Task 009-B)가 같은 함수로 판정해 검증 우회를 막습니다.

/** 접근 불가 사유 (not_found는 404, 나머지는 접근 불가 페이지로 연결) */
export type InvoiceAccessDeniedReason =
  'invalid' | 'not_found' | 'expired' | 'error'

/** 접근 판정 결과 */
export type InvoiceAccessResult =
  | { ok: true; invoice: Invoice }
  | { ok: false; reason: InvoiceAccessDeniedReason }

/** 오늘 날짜를 KST 기준 YYYY-MM-DD로 반환합니다. (서버 시간대와 무관) */
export function getKstToday(now: Date = new Date()): string {
  return formatKstDate(now)
}

/**
 * 유효기간이 지났는지 판정합니다.
 * validUntil 당일까지는 유효하고, 오늘(KST)보다 이전 날짜일 때만 만료입니다.
 * 두 값 모두 YYYY-MM-DD 형식이라 문자열 비교로 판정합니다.
 */
export function isInvoiceExpired(
  validUntil: string,
  today: string = getKstToday()
): boolean {
  return validUntil < today
}

/**
 * 공유 토큰(노션 페이지 ID)으로 견적서 접근 가능 여부를 판정합니다.
 * 토큰 형식 검증 → 노션 조회 → 유효기간 확인 순서입니다.
 */
export async function getAccessibleInvoice(
  token: string
): Promise<InvoiceAccessResult> {
  // F004: 형식이 잘못된 토큰은 노션 조회 없이 거부
  if (!shareTokenSchema.safeParse(token).success) {
    return { ok: false, reason: 'invalid' }
  }

  const result = await getInvoiceByPageId(token)
  if (!result.ok) {
    return {
      ok: false,
      reason: result.error.kind === 'not_found' ? 'not_found' : 'error',
    }
  }

  // F010: 유효기간이 지난 견적서는 접근 불가
  if (isInvoiceExpired(result.invoice.validUntil)) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, invoice: result.invoice }
}
