import { describe, expect, it } from 'vitest'

import {
  buildInvoiceListHref,
  DEFAULT_INVOICE_LIST_QUERY,
  filterInvoices,
  hasActiveFilters,
  paginate,
  parseInvoiceListQuery,
  sortInvoices,
  withFilterChange,
} from '@/lib/invoice-list-query'
import { splitByQuery } from '@/lib/utils/highlight'
import type { InvoiceSummary } from '@/types/invoice-list'

// 검색, 필터, 하이라이팅 테스트 (순수 함수)

function summary(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return {
    id: 'id-1',
    invoiceNumber: 'INV-2026-001',
    status: '대기',
    clientName: 'Acme Corp',
    issuedAt: '2026-11-10',
    validUntil: '2026-12-31',
    totalAmount: 1000,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

const invoices = [
  summary({ id: 'a', invoiceNumber: 'INV-2026-001', clientName: 'Acme Corp' }),
  summary({
    id: 'b',
    invoiceNumber: 'INV-2026-002',
    clientName: '(주)한빛 [본사]',
    status: '승인',
    issuedAt: '2026-11-15',
  }),
  summary({
    id: 'c',
    invoiceNumber: 'INV-2026-003',
    clientName: 'a+b*c?',
    status: '거절',
    issuedAt: '2026-11-20',
  }),
]

const noFilter = { q: '', status: null, from: null, to: null } as const
const ids = (list: InvoiceSummary[]) => list.map(i => i.id)

describe('parseInvoiceListQuery 필터', () => {
  it('q는 앞뒤 공백을 제거하고 100자로 제한', () => {
    expect(parseInvoiceListQuery({ q: '  acme  ' }).q).toBe('acme')
    expect(parseInvoiceListQuery({ q: 'x'.repeat(500) }).q).toHaveLength(100)
    expect(parseInvoiceListQuery({ q: '   ' }).q).toBe('')
  })

  it('잘못된 status는 필터 없음', () => {
    expect(parseInvoiceListQuery({ status: '완료' }).status).toBeNull()
    expect(parseInvoiceListQuery({ status: "' OR 1=1" }).status).toBeNull()
    expect(parseInvoiceListQuery({ status: '승인' }).status).toBe('승인')
  })

  it('잘못된 날짜(형식, 존재하지 않는 날짜)는 무시', () => {
    expect(parseInvoiceListQuery({ from: '2026-13-01' }).from).toBeNull()
    expect(parseInvoiceListQuery({ from: '2026-02-30' }).from).toBeNull()
    expect(parseInvoiceListQuery({ from: '2026/11/01' }).from).toBeNull()
    expect(parseInvoiceListQuery({ to: 'abc' }).to).toBeNull()
    expect(parseInvoiceListQuery({ from: '2026-11-01' }).from).toBe(
      '2026-11-01'
    )
  })

  it('from이 to보다 늦으면 두 값 모두 무시, 같은 날은 허용', () => {
    expect(
      parseInvoiceListQuery({ from: '2026-11-20', to: '2026-11-10' })
    ).toMatchObject({ from: null, to: null })
    expect(
      parseInvoiceListQuery({ from: '2026-11-10', to: '2026-11-10' })
    ).toMatchObject({ from: '2026-11-10', to: '2026-11-10' })
  })
})

describe('filterInvoices', () => {
  it('필터가 없으면 전체 (빈 검색어, 공백만 있는 검색어 포함)', () => {
    expect(ids(filterInvoices(invoices, noFilter))).toEqual(['a', 'b', 'c'])
    expect(ids(filterInvoices(invoices, { ...noFilter, q: '   ' }))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('클라이언트명, 견적서 번호 부분 일치 (대소문자 무시, 앞뒤 공백 무시)', () => {
    expect(ids(filterInvoices(invoices, { ...noFilter, q: ' ACME ' }))).toEqual(
      ['a']
    )
    expect(
      ids(filterInvoices(invoices, { ...noFilter, q: 'inv-2026-002' }))
    ).toEqual(['b'])
    expect(ids(filterInvoices(invoices, { ...noFilter, q: '한빛' }))).toEqual([
      'b',
    ])
    expect(ids(filterInvoices(invoices, { ...noFilter, q: '2026' }))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('특수문자는 정규식이 아니라 문자 그대로 비교', () => {
    expect(ids(filterInvoices(invoices, { ...noFilter, q: 'a+b*c?' }))).toEqual(
      ['c']
    )
    expect(ids(filterInvoices(invoices, { ...noFilter, q: '[본사]' }))).toEqual(
      ['b']
    )
    expect(ids(filterInvoices(invoices, { ...noFilter, q: '(주)' }))).toEqual([
      'b',
    ])
    expect(filterInvoices(invoices, { ...noFilter, q: '.*' })).toEqual([])
  })

  it('상태 필터', () => {
    expect(
      ids(filterInvoices(invoices, { ...noFilter, status: '승인' }))
    ).toEqual(['b'])
  })

  it('발행일 범위는 시작일과 종료일 당일을 포함', () => {
    expect(
      ids(
        filterInvoices(invoices, {
          ...noFilter,
          from: '2026-11-15',
          to: '2026-11-20',
        })
      )
    ).toEqual(['b', 'c'])
    expect(
      ids(
        filterInvoices(invoices, {
          ...noFilter,
          from: '2026-11-15',
          to: '2026-11-15',
        })
      )
    ).toEqual(['b'])
    expect(
      ids(filterInvoices(invoices, { ...noFilter, to: '2026-11-10' }))
    ).toEqual(['a'])
  })

  it('필터를 함께 적용하면 모두 만족하는 항목만', () => {
    expect(
      ids(
        filterInvoices(invoices, {
          q: 'inv',
          status: '거절',
          from: '2026-11-01',
          to: '2026-11-30',
        })
      )
    ).toEqual(['c'])
  })
})

describe('필터 → 정렬 → 페이지 분할 순서', () => {
  it('필터 후 결과 기준으로 페이지 분할', () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      summary({
        id: `id-${index}`,
        invoiceNumber: `INV-${String(index).padStart(3, '0')}`,
        status: index % 5 === 0 ? '승인' : '대기',
      })
    )
    const filtered = filterInvoices(many, { ...noFilter, status: '승인' })
    const paged = paginate(sortInvoices(filtered, 'invoiceNumber', 'asc'), 1)
    expect(paged.totalCount).toBe(5)
    expect(paged.totalPages).toBe(1)
  })

  it('필터가 바뀌면 page는 1', () => {
    const query = { ...DEFAULT_INVOICE_LIST_QUERY, page: 4 }
    expect(withFilterChange(query, { q: 'acme' }).page).toBe(1)
    expect(withFilterChange(query, { status: '승인' }).page).toBe(1)
  })
})

describe('buildInvoiceListHref / hasActiveFilters', () => {
  it('필터는 URL에 포함, 비어 있으면 생략', () => {
    expect(
      buildInvoiceListHref({
        ...DEFAULT_INVOICE_LIST_QUERY,
        q: '한빛 & co',
        status: '승인',
        from: '2026-11-01',
        to: '2026-11-30',
      })
    ).toBe(
      '/admin/invoices?q=%ED%95%9C%EB%B9%9B+%26+co&status=%EC%8A%B9%EC%9D%B8&from=2026-11-01&to=2026-11-30'
    )
    expect(buildInvoiceListHref(DEFAULT_INVOICE_LIST_QUERY)).toBe(
      '/admin/invoices'
    )
  })

  it('URL로 만든 쿼리를 다시 파싱하면 같은 값', () => {
    const query = {
      ...DEFAULT_INVOICE_LIST_QUERY,
      q: 'a&b=c',
      status: '거절' as const,
    }
    const href = buildInvoiceListHref(query)
    const params = Object.fromEntries(new URL(href, 'http://x').searchParams)
    expect(parseInvoiceListQuery(params)).toEqual(query)
  })

  it('hasActiveFilters', () => {
    expect(hasActiveFilters(DEFAULT_INVOICE_LIST_QUERY)).toBe(false)
    expect(
      hasActiveFilters({ ...DEFAULT_INVOICE_LIST_QUERY, to: '2026-11-01' })
    ).toBe(true)
  })
})

describe('splitByQuery', () => {
  const joined = (segments: { text: string }[]) =>
    segments.map(s => s.text).join('')

  it('일치 구간을 대소문자 구분 없이 모두 표시하고 원문 보존', () => {
    const segments = splitByQuery('Acme acme ACME', 'acme')
    expect(segments.filter(s => s.match).map(s => s.text)).toEqual([
      'Acme',
      'acme',
      'ACME',
    ])
    expect(joined(segments)).toBe('Acme acme ACME')
  })

  it('빈 검색어, 공백 검색어는 하이라이팅 없음', () => {
    expect(splitByQuery('Acme', '')).toEqual([{ text: 'Acme', match: false }])
    expect(splitByQuery('Acme', '   ')).toEqual([
      { text: 'Acme', match: false },
    ])
    expect(splitByQuery('', 'a')).toEqual([])
  })

  it('특수문자는 문자 그대로 찾고 예외가 없음', () => {
    expect(splitByQuery('a+b*c?', '+b*')).toEqual([
      { text: 'a', match: false },
      { text: '+b*', match: true },
      { text: 'c?', match: false },
    ])
    expect(() => splitByQuery('abc', '(((')).not.toThrow()
    expect(splitByQuery('abc', '.*')).toEqual([{ text: 'abc', match: false }])
  })

  it('일치가 없거나 전체가 일치하는 경우', () => {
    expect(splitByQuery('abc', 'x')).toEqual([{ text: 'abc', match: false }])
    expect(splitByQuery('abc', 'ABC')).toEqual([{ text: 'abc', match: true }])
  })

  it('검색어 앞뒤 공백은 무시', () => {
    expect(splitByQuery('hello world', ' world ')).toEqual([
      { text: 'hello ', match: false },
      { text: 'world', match: true },
    ])
  })
})
