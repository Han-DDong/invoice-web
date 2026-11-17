import { groupClients } from '@/lib/client-summary'
import { INVOICE_STATUSES, type InvoiceStatus } from '@/types/invoice'
import type { InvoiceSummary } from '@/types/invoice-list'

// 관리자 대시보드 집계와 최근 활동 (순수 함수, 노션과 환경변수에 의존하지 않음)

/** 만료 임박 기준 (일): 오늘 포함 N일 이내에 만료 */
export const EXPIRING_SOON_DAYS = 7

/** 대시보드 요약 */
export interface DashboardSummary {
  totalCount: number
  statusCounts: Record<InvoiceStatus, number>
  /** 모든 견적서의 합계 금액 (항목이 없으면 0원으로 계산) */
  totalAmount: number
  /** 공백, 대소문자를 정리한 뒤 센 클라이언트 수 */
  clientCount: number
  /** 유효기간이 오늘(KST)보다 지난 견적서 수 */
  expiredCount: number
  /** 유효기간이 오늘부터 EXPIRING_SOON_DAYS일 이내인 견적서 수 */
  expiringSoonCount: number
}

/** YYYY-MM-DD에 일수를 더합니다. (UTC 기준 날짜 계산이라 시간대 영향 없음) */
export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/**
 * 견적서 목록을 대시보드 요약으로 집계합니다.
 * @param today KST 기준 오늘 (YYYY-MM-DD)
 */
export function summarizeInvoices(
  invoices: readonly InvoiceSummary[],
  today: string
): DashboardSummary {
  const statusCounts = Object.fromEntries(
    INVOICE_STATUSES.map(status => [status, 0])
  ) as Record<InvoiceStatus, number>
  const soonLimit = addDays(today, EXPIRING_SOON_DAYS)
  let totalAmount = 0
  let expiredCount = 0
  let expiringSoonCount = 0

  for (const invoice of invoices) {
    statusCounts[invoice.status] += 1
    totalAmount += invoice.totalAmount
    if (invoice.validUntil < today) {
      expiredCount += 1
    } else if (invoice.validUntil <= soonLimit) {
      expiringSoonCount += 1
    }
  }

  return {
    totalCount: invoices.length,
    statusCounts,
    totalAmount,
    clientCount: groupClients(invoices).length,
    expiredCount,
    expiringSoonCount,
  }
}

/** 최근 발행 견적서 (발행일 내림차순, 같으면 생성 시각 최신순) */
export function getRecentInvoices(
  invoices: readonly InvoiceSummary[],
  limit: number
): InvoiceSummary[] {
  return [...invoices]
    .sort((a, b) =>
      a.issuedAt !== b.issuedAt
        ? a.issuedAt < b.issuedAt
          ? 1
          : -1
        : b.createdAt.localeCompare(a.createdAt)
    )
    .slice(0, limit)
}

/** 활동 종류 */
export type ActivityType = 'created' | 'updated'

/** 최근 활동 한 건 (별도 로그 없이 노션 created_time, last_edited_time으로 만듭니다.) */
export interface ActivityEvent {
  /** 목록 key용 (견적서 ID + 종류) */
  key: string
  type: ActivityType
  invoiceId: string
  invoiceNumber: string
  clientName: string
  /** 이벤트 시점의 견적서 상태 (수정 이벤트는 현재 상태) */
  status: InvoiceStatus
  /** 이벤트 시각 (ISO 8601) */
  at: string
}

/** 생성 직후 자동으로 갱신되는 last_edited_time을 수정으로 보지 않기 위한 기준 (밀리초) */
const EDIT_THRESHOLD_MS = 60_000

/**
 * 견적서의 생성, 수정 이벤트를 최신순으로 만듭니다.
 * 수정 이벤트는 마지막 수정 시각이 생성 시각보다 1분 넘게 늦을 때만 만들고, 시각을 해석할 수 없는 견적서는 건너뜁니다.
 */
export function buildActivities(
  invoices: readonly InvoiceSummary[],
  limit: number
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const invoice of invoices) {
    const created = new Date(invoice.createdAt).getTime()
    const updated = new Date(invoice.updatedAt).getTime()
    if (Number.isNaN(created)) {
      continue
    }

    const base = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      status: invoice.status,
    }
    events.push({
      ...base,
      key: `${invoice.id}:created`,
      type: 'created',
      at: invoice.createdAt,
    })
    if (!Number.isNaN(updated) && updated - created > EDIT_THRESHOLD_MS) {
      events.push({
        ...base,
        key: `${invoice.id}:updated`,
        type: 'updated',
        at: invoice.updatedAt,
      })
    }
  }

  return events
    .sort(
      (a, b) =>
        new Date(b.at).getTime() - new Date(a.at).getTime() ||
        a.invoiceNumber.localeCompare(b.invoiceNumber, 'ko', { numeric: true })
    )
    .slice(0, limit)
}
