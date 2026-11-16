import { APIErrorCode } from '@notionhq/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildInvoicePage,
  buildItemPage,
  buildNotionError,
  TEST_ENV,
  TEST_ITEM_DATA_SOURCE_ID,
  TEST_PAGE_ID,
} from './fixtures/notion'

// getInvoiceByPageId 테스트 (노션 클라이언트, 환경변수, next/cache 모킹, 네트워크 호출 없음)

const notion = {
  pages: { retrieve: vi.fn() },
  databases: { retrieve: vi.fn() },
  dataSources: { query: vi.fn() },
}

vi.mock('@/lib/notion', () => ({ getNotionClient: () => notion }))
vi.mock('@/lib/env', () => ({ getServerEnv: () => TEST_ENV }))

/**
 * next/cache의 unstable_cache를 흉내 내는 메모리 캐시입니다.
 * Next.js처럼 성공 값만 저장하고, revalidate가 지난 값은 먼저 돌려준 뒤 백그라운드에서 갱신합니다.
 */
const cacheStore = new Map<string, { value: unknown; storedAt: number }>()
vi.mock('next/cache', () => ({
  unstable_cache:
    <T>(
      fn: () => Promise<T>,
      keyParts: string[],
      options: { revalidate: number }
    ) =>
    async (): Promise<T> => {
      const key = keyParts.join(',')
      const entry = cacheStore.get(key)
      const store = (value: T) =>
        cacheStore.set(key, { value, storedAt: Date.now() })
      if (entry) {
        if (Date.now() - entry.storedAt > options.revalidate * 1000) {
          // 백그라운드 갱신 (실패하면 지난 값을 유지)
          fn().then(store, () => undefined)
        }
        return entry.value as T
      }
      const value = await fn()
      store(value)
      return value
    },
}))

/** 모듈 수준 캐시(data source ID, 견적서 캐시)가 테스트 사이에 남지 않도록 매번 새로 불러옵니다. */
async function loadService() {
  vi.resetModules()
  return import('@/lib/invoice-service')
}

function mockDataSource() {
  notion.databases.retrieve.mockResolvedValue({
    data_sources: [{ id: TEST_ITEM_DATA_SOURCE_ID }],
  })
}

function itemsResponse(
  results: unknown[],
  nextCursor: string | null = null
): { results: unknown[]; has_more: boolean; next_cursor: string | null } {
  return { results, has_more: nextCursor !== null, next_cursor: nextCursor }
}

beforeEach(() => {
  cacheStore.clear()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('getInvoiceByPageId 조회와 변환', () => {
  it('정상: 페이지 + 항목 → Invoice (금액 재계산)', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    notion.dataSources.query.mockResolvedValue(
      itemsResponse([
        buildItemPage({ id: 'a', quantity: 2, unitPrice: 5000, amount: 1 }),
      ])
    )

    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.invoice.items).toEqual([
        { id: 'a', name: '항목', quantity: 2, unitPrice: 5000, amount: 10000 },
      ])
    }
    expect(notion.dataSources.query).toHaveBeenCalledWith(
      expect.objectContaining({
        data_source_id: TEST_ITEM_DATA_SOURCE_ID,
        filter: { property: 'Invoice', relation: { contains: TEST_PAGE_ID } },
      })
    )
  })

  it('항목 0건: items가 빈 배열', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    notion.dataSources.query.mockResolvedValue(itemsResponse([]))

    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)

    expect(result).toEqual({
      ok: true,
      invoice: expect.objectContaining({ items: [] }),
    })
  })

  it('항목 150건: 커서로 2회 조회해 모두 수집', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    const pages = Array.from({ length: 150 }, (_, index) =>
      buildItemPage({ id: `item-${index}`, quantity: 1, unitPrice: 100 })
    )
    notion.dataSources.query
      .mockResolvedValueOnce(itemsResponse(pages.slice(0, 100), 'cursor-2'))
      .mockResolvedValueOnce(itemsResponse(pages.slice(100)))

    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)

    expect(notion.dataSources.query).toHaveBeenCalledTimes(2)
    expect(notion.dataSources.query).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ start_cursor: 'cursor-2', page_size: 100 })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.invoice.items).toHaveLength(150)
      const total = result.invoice.items.reduce(
        (sum, item) => sum + item.amount,
        0
      )
      expect(total).toBe(15000)
    }
  })

  it('노션 ID 형식이 아니면 API 호출 없이 not_found', async () => {
    const { getInvoiceByPageId } = await loadService()
    await expect(getInvoiceByPageId('not-a-notion-id-123')).resolves.toEqual({
      ok: false,
      error: { kind: 'not_found' },
    })
    expect(notion.pages.retrieve).not.toHaveBeenCalled()
  })

  it('다른 DB 페이지는 not_found', async () => {
    notion.pages.retrieve.mockResolvedValue(
      buildInvoicePage({ databaseId: 'dddddddddddddddddddddddddddddddd' })
    )
    const { getInvoiceByPageId } = await loadService()
    await expect(getInvoiceByPageId(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      error: { kind: 'not_found' },
    })
    expect(notion.dataSources.query).not.toHaveBeenCalled()
  })

  it.each([
    ['휴지통', { inTrash: true }],
    ['보관', { archived: true }],
  ])('%s 페이지는 not_found', async (_label, options) => {
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage(options))
    const { getInvoiceByPageId } = await loadService()
    await expect(getInvoiceByPageId(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      error: { kind: 'not_found' },
    })
  })

  it('노션 object_not_found → not_found', async () => {
    notion.pages.retrieve.mockRejectedValue(
      buildNotionError(APIErrorCode.ObjectNotFound, 404)
    )
    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)
    expect(result).toEqual({ ok: false, error: { kind: 'not_found' } })
  })

  it('그 외 노션 오류 → query_failed, 로그에는 code/status/토큰 앞 6자만', async () => {
    notion.pages.retrieve.mockRejectedValue(
      buildNotionError(APIErrorCode.Unauthorized, 401)
    )
    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('query_failed')
    }

    const logged = vi
      .mocked(console.error)
      .mock.calls.map(call => call.join(' '))
      .join('\n')
    expect(logged).toContain('"code":"unauthorized"')
    expect(logged).toContain('"status":401')
    expect(logged).toContain('"token":"123456…"')
    expect(logged).not.toContain(TEST_PAGE_ID)
    expect(logged).not.toContain('raw-body')
    expect(logged).not.toContain(TEST_ENV.NOTION_API_KEY)
  })

  it('항목 조회 단계 오류 → query_failed', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    notion.dataSources.query.mockRejectedValue(
      buildNotionError(APIErrorCode.ObjectNotFound, 404)
    )
    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)
    expect(result.ok === false && result.error.kind).toBe('query_failed')
  })

  it('항목 검증 실패 → validation_failed (경로만)', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    notion.dataSources.query.mockResolvedValue(
      itemsResponse([buildItemPage({ quantity: null })])
    )
    const { getInvoiceByPageId } = await loadService()
    await expect(getInvoiceByPageId(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      error: {
        kind: 'validation_failed',
        issues: ['items[0].item.properties.수량'],
      },
    })
  })

  it('견적서 검증 실패 → validation_failed', async () => {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(
      buildInvoicePage({ issuedAt: null })
    )
    notion.dataSources.query.mockResolvedValue(itemsResponse([]))
    const { getInvoiceByPageId } = await loadService()
    const result = await getInvoiceByPageId(TEST_PAGE_ID)
    expect(result.ok === false && result.error.kind).toBe('validation_failed')
  })
})

describe('getInvoiceByPageId 캐시 (TTL 30초)', () => {
  function mockSuccess() {
    mockDataSource()
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage())
    notion.dataSources.query.mockResolvedValue(itemsResponse([]))
  }

  it('TTL 안의 두 번째 호출은 노션을 호출하지 않음 (대시 유무가 달라도 같은 키)', async () => {
    mockSuccess()
    const { getInvoiceByPageId } = await loadService()
    await getInvoiceByPageId(TEST_PAGE_ID)
    await getInvoiceByPageId('12345678-90ab-cdef-1234-567890ABCDEF')
    expect(notion.pages.retrieve).toHaveBeenCalledTimes(1)
  })

  it('실패는 캐시하지 않고 다음 호출에서 다시 조회', async () => {
    mockDataSource()
    notion.dataSources.query.mockResolvedValue(itemsResponse([]))
    notion.pages.retrieve
      .mockRejectedValueOnce(buildNotionError(APIErrorCode.ObjectNotFound, 404))
      .mockRejectedValueOnce(
        buildNotionError(APIErrorCode.ServiceUnavailable, 503)
      )
      .mockResolvedValueOnce(buildInvoicePage())

    const { getInvoiceByPageId } = await loadService()
    expect((await getInvoiceByPageId(TEST_PAGE_ID)).ok).toBe(false)
    expect((await getInvoiceByPageId(TEST_PAGE_ID)).ok).toBe(false)
    expect((await getInvoiceByPageId(TEST_PAGE_ID)).ok).toBe(true)
    expect(notion.pages.retrieve).toHaveBeenCalledTimes(3)
  })

  it('TTL이 지나면 지난 값을 쓰지 않고 다시 조회해 휴지통 이동을 반영', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    mockSuccess()
    const { getInvoiceByPageId } = await loadService()
    expect((await getInvoiceByPageId(TEST_PAGE_ID)).ok).toBe(true)

    // 31초 뒤 노션에서 휴지통으로 이동된 상황
    now.mockReturnValue(1_031_000)
    notion.pages.retrieve.mockResolvedValue(buildInvoicePage({ inTrash: true }))

    await expect(getInvoiceByPageId(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      error: { kind: 'not_found' },
    })
  })
})
