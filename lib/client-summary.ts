import type { InvoiceSummary } from '@/types/invoice-list'

// 견적서의 clientName으로 클라이언트를 집계합니다. (별도 클라이언트 DB 없음, 순수 함수)

/** 이름이 비어 있는 견적서를 묶는 표시 이름 */
export const UNNAMED_CLIENT = '(이름 없음)'

/** 클라이언트 집계 한 줄 */
export interface ClientSummary {
  /** 표시 이름 (공백 정리, 같은 이름 중 가장 먼저 나온 표기) */
  name: string
  invoiceCount: number
  /** 총 견적 금액 (견적서 합계의 합) */
  totalAmount: number
  /** 승인된 견적서 수 */
  approvedCount: number
  /** 가장 최근 발행일 (YYYY-MM-DD) */
  latestIssuedAt: string
}

/** 앞뒤 공백을 지우고 연속 공백을 하나로 줄입니다. */
export function cleanClientName(name: string): string {
  return name.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/** 그룹핑용 키: 공백 정리 + 대소문자 무시 (Acme / ACME 와 "A  B" / "A B"를 같은 클라이언트로) */
export function clientKey(name: string): string {
  return cleanClientName(name).toLowerCase()
}

/** 견적서 목록을 클라이언트별로 집계합니다. 입력 순서에서 처음 나온 표기를 표시 이름으로 씁니다. */
export function groupClients(
  invoices: readonly InvoiceSummary[]
): ClientSummary[] {
  const groups = new Map<string, ClientSummary>()

  for (const invoice of invoices) {
    const displayName = cleanClientName(invoice.clientName) || UNNAMED_CLIENT
    const key = clientKey(displayName)
    const group = groups.get(key)

    if (!group) {
      groups.set(key, {
        name: displayName,
        invoiceCount: 1,
        totalAmount: invoice.totalAmount,
        approvedCount: invoice.status === '승인' ? 1 : 0,
        latestIssuedAt: invoice.issuedAt,
      })
      continue
    }

    group.invoiceCount += 1
    group.totalAmount += invoice.totalAmount
    if (invoice.status === '승인') {
      group.approvedCount += 1
    }
    if (invoice.issuedAt > group.latestIssuedAt) {
      group.latestIssuedAt = invoice.issuedAt
    }
  }

  return [...groups.values()]
}
