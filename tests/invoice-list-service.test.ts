import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildInvoicePage,
  buildItemPage,
  TEST_ENV,
  TEST_INVOICE_DATABASE_ID,
  TEST_ITEM_DATABASE_ID,
  TEST_ITEM_DATA_SOURCE_ID,
} from './fixtures/notion'

// getInvoiceSummaries 테스트 (노션 클라이언트, 환경변수, next/cache 모킹, 네트워크 호출 없음)

const INVOICE_DATA_SOURCE_ID = 'dddddddddddddddddddddddddddddddd'
const ID_A = '11111111111111111111111111111111'
const ID_B = '22222222222222222222222222222222'
const ID_C = '33333333333333333333333333333333'

const notion = {
  databases: { retrieve: vi.fn() },
  dataSources: { query: vi.fn() },
}

vi.mock('@/lib/notion', () => ({ getNotionClient: () => notion }))
vi.mock('@/lib/env', () => ({ getServerEnv: () => TEST_ENV }))
// 캐시는 실행만 통과시키는 모킹 (캐시 동작은 invoice-service 테스트에서 검증)
vi.mock('next/cache', () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}))

interface QueryResponse {
  results: unknown[]
  has_more: boolean
  next_cursor: string | null
}

function response(
  results: unknown[],
  nextCursor: string | null = null
): QueryResponse {
  return { results, has_more: nextCursor !== null, next_cursor: nextCursor }
}

/** data source별 응답 큐를 연결합니다. (호출 순서대로 소비) */
function mockNotion(
  invoiceResponses: QueryResponse[],
  itemResponses: QueryResponse[]
) {
  notion.databases.retrieve.mockImplementation(
    async ({ database_id }: { database_id: string }) => ({
      data_sources: [
        {
          id:
            database_id === TEST_INVOICE_DATABASE_ID
              ? INVOICE_DATA_SOURCE_ID
              : TEST_ITEM_DATA_SOURCE_ID,
        },
      ],
    })
  )
  const queues = new Map<string, QueryResponse[]>([
    [INVOICE_DATA_SOURCE_ID, [...invoiceResponses]],
    [TEST_ITEM_DATA_SOURCE_ID, [...itemResponses]],
  ])
  notion.dataSources.query.mockImplementation(
    async ({ data_source_id }: { data_source_id: string }) => {
      const next = queues.get(data_source_id)?.shift()
      if (!next) {
        throw new Error('예상하지 못한 추가 조회')
      }
      return next
    }
  )
}

async function loadService() {
  vi.resetModules()
  return import('@/lib/invoice-list-service')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('getInvoiceSummaries', () => {
  it('항목의 수량 x 단가를 견적서별로 합산 (노션 금액 필드 무시)', async () => {
    mockNotion(
      [
        response([
          buildInvoicePage({ id: ID_A, invoiceNumber: 'INV-A' }),
          buildInvoicePage({ id: ID_B, invoiceNumber: 'INV-B' }),
        ]),
      ],
      [
        response([
          buildItemPage({
            id: 'i1',
            quantity: 2,
            unitPrice: 1000,
            amount: 999999,
            invoiceIds: [ID_A],
          }),
          buildItemPage({
            id: 'i2',
            quantity: 3,
            unitPrice: 500,
            invoiceIds: [ID_A],
          }),
          buildItemPage({
            id: 'i3',
            quantity: 1,
            unitPrice: 7000,
            invoiceIds: [ID_B],
          }),
        ]),
      ]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invoices.map(i => [i.invoiceNumber, i.totalAmount])).toEqual([
      ['INV-A', 3500],
      ['INV-B', 7000],
    ])
  })

  it('노션 created_time, last_edited_time을 createdAt, updatedAt으로 전달', async () => {
    mockNotion(
      [
        response([
          buildInvoicePage({
            id: ID_A,
            createdTime: '2026-11-01T00:00:00.000Z',
            lastEditedTime: '2026-11-05T03:00:00.000Z',
          }),
        ]),
      ],
      [response([])]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result).toMatchObject({
      ok: true,
      invoices: [
        {
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-05T03:00:00.000Z',
        },
      ],
    })
  })

  it('항목이 없는 견적서는 합계 0원', async () => {
    mockNotion([response([buildInvoicePage({ id: ID_A })])], [response([])])
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result).toMatchObject({
      ok: true,
      invoices: [{ id: ID_A, totalAmount: 0 }],
    })
  })

  it('견적서와 항목을 각각 cursor로 끝까지 조회하고 항목 조회는 견적서 수와 무관하게 1회 순회', async () => {
    mockNotion(
      [
        response([buildInvoicePage({ id: ID_A })], 'cursor-1'),
        response([buildInvoicePage({ id: ID_B })], 'cursor-2'),
        response([buildInvoicePage({ id: ID_C })]),
      ],
      [
        response(
          [buildItemPage({ id: 'i1', unitPrice: 100, invoiceIds: [ID_A] })],
          'item-cursor'
        ),
        response([
          buildItemPage({ id: 'i2', unitPrice: 200, invoiceIds: [ID_C] }),
        ]),
      ]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invoices.map(i => [i.id, i.totalAmount])).toEqual([
      [ID_A, 100],
      [ID_B, 0],
      [ID_C, 200],
    ])
    // 견적서 3회 + 항목 2회 (견적서별 항목 조회 없음)
    expect(notion.dataSources.query).toHaveBeenCalledTimes(5)
    expect(notion.dataSources.query).toHaveBeenCalledWith(
      expect.objectContaining({ start_cursor: 'cursor-1' })
    )
  })

  it('견적서 한 건 검증 실패는 목록에서만 제외하고 로그에는 경로만 남김', async () => {
    mockNotion(
      [
        response([
          buildInvoicePage({ id: ID_A, invoiceNumber: 'INV-OK' }),
          buildInvoicePage({ id: ID_B, issuedAt: null }),
        ]),
      ],
      [response([])]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result).toMatchObject({
      ok: true,
      invoices: [{ invoiceNumber: 'INV-OK' }],
    })
    const logged = vi.mocked(console.error).mock.calls.flat().join('\n')
    expect(logged).toContain('invoice.properties.발행일')
    expect(logged).not.toContain(ID_B)
  })

  it('항목 검증 실패는 연결된 견적서만 제외 (합계가 틀린 채 보이지 않게)', async () => {
    mockNotion(
      [
        response([
          buildInvoicePage({ id: ID_A, invoiceNumber: 'INV-OK' }),
          buildInvoicePage({ id: ID_B, invoiceNumber: 'INV-BROKEN' }),
        ]),
      ],
      [
        response([
          buildItemPage({ id: 'i1', unitPrice: 100, invoiceIds: [ID_A] }),
          buildItemPage({ id: 'i2', quantity: null, invoiceIds: [ID_B] }),
        ]),
      ]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invoices.map(i => i.invoiceNumber)).toEqual(['INV-OK'])
  })

  it('휴지통 견적서와 휴지통 항목은 제외', async () => {
    mockNotion(
      [
        response([
          buildInvoicePage({ id: ID_A, invoiceNumber: 'INV-OK' }),
          buildInvoicePage({ id: ID_B, inTrash: true }),
          buildInvoicePage({ id: ID_C, archived: true }),
        ]),
      ],
      [
        response([
          buildItemPage({ id: 'i1', unitPrice: 100, invoiceIds: [ID_A] }),
          {
            ...buildItemPage({ id: 'i2', unitPrice: 900, invoiceIds: [ID_A] }),
            in_trash: true,
          },
        ]),
      ]
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result).toMatchObject({
      ok: true,
      invoices: [{ invoiceNumber: 'INV-OK', totalAmount: 100 }],
    })
  })

  it('노션 조회 오류는 ok:false이고 응답과 로그에 원문과 DB ID를 남기지 않음', async () => {
    notion.databases.retrieve.mockRejectedValue(
      new Error(`database ${TEST_ITEM_DATABASE_ID} secret-body`)
    )
    const { getInvoiceSummaries } = await loadService()

    const result = await getInvoiceSummaries()

    expect(result).toEqual({ ok: false })
    const logged = vi.mocked(console.error).mock.calls.flat().join('\n')
    expect(logged).not.toContain(TEST_ITEM_DATABASE_ID)
    expect(logged).not.toContain('secret-body')
  })
})
