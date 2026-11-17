import { describe, expect, it } from 'vitest'

import {
  buildInvoiceDetailHref,
  buildInvoiceListHref,
  DEFAULT_INVOICE_LIST_QUERY,
  paginate,
  parseInvoiceListQuery,
  sortInvoices,
  toggleSort,
} from '@/lib/invoice-list-query'
import type { InvoiceSummary } from '@/types/invoice-list'

// 목록 쿼리 파싱, 정렬, 페이지 분할 테스트 (순수 함수)

function summary(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return {
    id: 'id-1',
    invoiceNumber: 'INV-2026-001',
    status: '대기',
    clientName: '가나다',
    issuedAt: '2026-11-01',
    validUntil: '2026-12-31',
    totalAmount: 1000,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('parseInvoiceListQuery', () => {
  it('값이 없으면 기본값', () => {
    expect(parseInvoiceListQuery({})).toEqual(DEFAULT_INVOICE_LIST_QUERY)
  })

  it('올바른 값은 그대로 사용', () => {
    expect(
      parseInvoiceListQuery({ page: '3', sort: 'totalAmount', order: 'asc' })
    ).toEqual({
      ...DEFAULT_INVOICE_LIST_QUERY,
      page: 3,
      sort: 'totalAmount',
      order: 'asc',
    })
  })

  it.each([['0'], ['-1'], ['abc'], ['1.5'], [''], ['9999999999']])(
    '잘못된 page(%s)는 1',
    page => {
      expect(parseInvoiceListQuery({ page }).page).toBe(1)
    }
  )

  it('잘못된 sort, order는 기본값', () => {
    expect(parseInvoiceListQuery({ sort: 'password', order: 'up' })).toEqual(
      DEFAULT_INVOICE_LIST_QUERY
    )
  })

  it('같은 키가 여러 번 오면 첫 값 사용', () => {
    expect(parseInvoiceListQuery({ page: ['2', '5'] }).page).toBe(2)
  })
})

describe('sortInvoices', () => {
  const a = summary({
    id: 'a',
    invoiceNumber: 'INV-2026-002',
    clientName: '나',
    issuedAt: '2026-11-02',
    status: '승인',
    totalAmount: 300,
  })
  const b = summary({
    id: 'b',
    invoiceNumber: 'INV-2026-010',
    clientName: '가',
    issuedAt: '2026-11-10',
    status: '대기',
    totalAmount: 100,
  })
  const c = summary({
    id: 'c',
    invoiceNumber: 'INV-2026-001',
    clientName: '다',
    issuedAt: '2026-10-01',
    status: '거절',
    totalAmount: 200,
  })

  const ids = (list: InvoiceSummary[]) => list.map(i => i.id)

  it('견적서 번호는 숫자를 숫자로 비교', () => {
    expect(ids(sortInvoices([a, b, c], 'invoiceNumber', 'asc'))).toEqual([
      'c',
      'a',
      'b',
    ])
  })

  it('클라이언트명 한글 정렬', () => {
    expect(ids(sortInvoices([a, b, c], 'clientName', 'asc'))).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('발행일, 총액 내림차순', () => {
    expect(ids(sortInvoices([a, b, c], 'issuedAt', 'desc'))).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(ids(sortInvoices([a, b, c], 'totalAmount', 'desc'))).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('상태는 대기, 승인, 거절 순서', () => {
    expect(ids(sortInvoices([a, b, c], 'status', 'asc'))).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('같은 값이면 견적서 번호로 안정 정렬하고 원본은 바꾸지 않음', () => {
    const x = summary({ id: 'x', invoiceNumber: 'INV-2', totalAmount: 5 })
    const y = summary({ id: 'y', invoiceNumber: 'INV-1', totalAmount: 5 })
    const input = [x, y]
    expect(ids(sortInvoices(input, 'totalAmount', 'desc'))).toEqual(['y', 'x'])
    expect(ids(input)).toEqual(['x', 'y'])
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1)

  it('10개 단위로 나눔 (마지막 페이지는 나머지)', () => {
    expect(paginate(items, 1).items).toHaveLength(10)
    expect(paginate(items, 3)).toMatchObject({
      items: [21, 22, 23, 24, 25],
      page: 3,
      totalPages: 3,
      totalCount: 25,
    })
  })

  it('정확히 10개면 1페이지, 11개면 2페이지', () => {
    expect(paginate(items.slice(0, 10), 1).totalPages).toBe(1)
    expect(paginate(items.slice(0, 11), 1).totalPages).toBe(2)
  })

  it('범위를 벗어난 페이지는 끝 페이지로 보정', () => {
    expect(paginate(items, 99).page).toBe(3)
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate(items, -5).page).toBe(1)
  })

  it('빈 목록은 1페이지, 항목 없음', () => {
    expect(paginate([], 4)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
    })
  })
})

describe('buildInvoiceListHref / toggleSort', () => {
  it('기본값은 URL에서 생략', () => {
    expect(buildInvoiceListHref(DEFAULT_INVOICE_LIST_QUERY)).toBe(
      '/admin/invoices'
    )
  })

  it('기본값과 다른 값만 포함', () => {
    expect(
      buildInvoiceListHref({
        ...DEFAULT_INVOICE_LIST_QUERY,
        page: 2,
        sort: 'clientName',
        order: 'asc',
      })
    ).toBe('/admin/invoices?sort=clientName&order=asc&page=2')
  })

  it('정렬 토글: 새 컬럼은 오름차순, 같은 컬럼은 반전, 항상 1페이지', () => {
    const start = {
      ...DEFAULT_INVOICE_LIST_QUERY,
      page: 4,
      sort: 'issuedAt',
      order: 'desc',
    } as const
    expect(toggleSort(start, 'clientName')).toEqual({
      ...DEFAULT_INVOICE_LIST_QUERY,
      page: 1,
      sort: 'clientName',
      order: 'asc',
    })
    expect(toggleSort({ ...start, order: 'asc' }, 'issuedAt').order).toBe(
      'desc'
    )
    expect(toggleSort(start, 'issuedAt').order).toBe('asc')
  })
})

describe('buildInvoiceDetailHref', () => {
  it('쿼리가 없으면 상세 경로만', () => {
    expect(buildInvoiceDetailHref('abc123')).toBe('/admin/invoices/abc123')
    expect(buildInvoiceDetailHref('abc123', DEFAULT_INVOICE_LIST_QUERY)).toBe(
      '/admin/invoices/abc123'
    )
  })

  it('목록 쿼리를 유지하고 상세에서 다시 파싱하면 같은 값', () => {
    const query = {
      ...DEFAULT_INVOICE_LIST_QUERY,
      q: '삼성',
      page: 2,
      sort: 'clientName',
      order: 'asc',
    } as const
    const href = buildInvoiceDetailHref('abc/123', query)
    expect(href.startsWith('/admin/invoices/abc%2F123?')).toBe(true)
    const params = Object.fromEntries(new URL(href, 'http://x').searchParams)
    expect(parseInvoiceListQuery(params)).toEqual(query)
  })
})
