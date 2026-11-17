import { APIResponseError, APIErrorCode } from '@notionhq/client'

import type { Invoice } from '@/types/invoice'

// 노션 API 응답 픽스처 (테스트 전용, 실제 키·DB ID 아님)

export const TEST_INVOICE_DATABASE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export const TEST_ITEM_DATABASE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
export const TEST_ITEM_DATA_SOURCE_ID = 'cccccccccccccccccccccccccccccccc'
export const TEST_PAGE_ID = '1234567890abcdef1234567890abcdef'

/** 테스트용 서버 환경변수 */
export const TEST_ENV = {
  NOTION_API_KEY: 'test-notion-key',
  NOTION_INVOICE_DATABASE_ID: TEST_INVOICE_DATABASE_ID,
  NOTION_ITEM_DATABASE_ID: TEST_ITEM_DATABASE_ID,
}

const text = (value: string) => [{ plain_text: value }]

interface InvoicePageOptions {
  id?: string
  databaseId?: string
  invoiceNumber?: string
  issuedAt?: string | null
  validUntil?: string | null
  status?: string | null
  clientName?: string
  inTrash?: boolean
  archived?: boolean
  createdTime?: string
  lastEditedTime?: string
}

/** 견적서 DB 페이지 응답 */
export function buildInvoicePage({
  id = TEST_PAGE_ID,
  databaseId = TEST_INVOICE_DATABASE_ID,
  invoiceNumber = 'INV-2026-011',
  issuedAt = '2026-11-03',
  validUntil = '2026-12-31',
  status = '대기',
  clientName = '테스트 클라이언트',
  inTrash = false,
  archived = false,
  createdTime = '2026-11-03T01:00:00.000Z',
  lastEditedTime = '2026-11-03T01:00:00.000Z',
}: InvoicePageOptions = {}) {
  return {
    object: 'page',
    id,
    created_time: createdTime,
    last_edited_time: lastEditedTime,
    in_trash: inTrash,
    archived,
    parent: { type: 'database_id', database_id: databaseId },
    properties: {
      '견적서 번호': { type: 'title', title: text(invoiceNumber) },
      발행일: { type: 'date', date: issuedAt ? { start: issuedAt } : null },
      상태: { type: 'select', select: status ? { name: status } : null },
      유효기간: {
        type: 'date',
        date: validUntil ? { start: validUntil } : null,
      },
      '총 금액': { type: 'number', number: 999 },
      클라이언트명: { type: 'rich_text', rich_text: text(clientName) },
      항목: { type: 'relation', relation: [] },
    },
  }
}

interface ItemPageOptions {
  id?: string
  name?: string
  quantity?: number | null
  unitPrice?: number | null
  /** 노션 Formula 금액 (웹에서는 무시해야 함) */
  amount?: number | null
  /** 연결된 견적서 페이지 ID 목록 */
  invoiceIds?: string[]
}

/** 견적 항목 DB 페이지 응답 */
export function buildItemPage({
  id = 'item-1',
  name = '항목',
  quantity = 1,
  unitPrice = 1000,
  amount = 1,
  invoiceIds = [TEST_PAGE_ID],
}: ItemPageOptions = {}) {
  return {
    object: 'page',
    id,
    properties: {
      항목명: { type: 'title', title: text(name) },
      Invoice: {
        type: 'relation',
        relation: invoiceIds.map(invoiceId => ({ id: invoiceId })),
      },
      금액: { type: 'formula', formula: { type: 'number', number: amount } },
      단가: { type: 'number', number: unitPrice },
      수량: { type: 'number', number: quantity },
    },
  }
}

/** 노션 API 오류 응답 */
export function buildNotionError(
  code: APIErrorCode,
  status: number
): APIResponseError {
  return new APIResponseError({
    code,
    status,
    message: `Could not find page with ID: ${TEST_PAGE_ID}`,
    headers: new Headers(),
    rawBodyText: '{"secret":"raw-body"}',
    additional_data: undefined,
    request_id: undefined,
  })
}

/** 도메인 Invoice 예시 */
export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: TEST_PAGE_ID,
    invoiceNumber: 'INV-2026-011',
    status: '대기',
    clientName: '테스트 클라이언트',
    issuedAt: '2026-11-03',
    validUntil: '2026-12-31',
    items: [
      { id: 'i1', name: '개발', quantity: 1, unitPrice: 10000, amount: 10000 },
    ],
    ...overrides,
  }
}
