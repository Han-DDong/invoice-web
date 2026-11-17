import { describe, expect, it } from 'vitest'

import {
  buildClientInvoicesHref,
  buildClientListHref,
  DEFAULT_CLIENT_LIST_QUERY,
  filterClients,
  parseClientListQuery,
  sortClients,
  toggleClientSort,
} from '@/lib/client-list-query'
import {
  cleanClientName,
  groupClients,
  UNNAMED_CLIENT,
} from '@/lib/client-summary'
import { paginate } from '@/lib/invoice-list-query'
import type { InvoiceSummary } from '@/types/invoice-list'

// 클라이언트 집계, 검색, 정렬 테스트 (순수 함수)

function summary(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return {
    id: 'id-1',
    invoiceNumber: 'INV-001',
    status: '대기',
    clientName: 'Acme',
    issuedAt: '2026-11-01',
    validUntil: '2026-12-31',
    totalAmount: 1000,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('groupClients', () => {
  it('빈 목록은 빈 배열', () => {
    expect(groupClients([])).toEqual([])
  })

  it('견적서 수, 총액, 승인 건수, 최근 발행일을 집계 (항목 0건 = 0원 포함)', () => {
    const [acme] = groupClients([
      summary({
        id: 'a',
        totalAmount: 100,
        status: '승인',
        issuedAt: '2026-11-01',
      }),
      summary({
        id: 'b',
        totalAmount: 0,
        status: '대기',
        issuedAt: '2026-11-09',
      }),
      summary({
        id: 'c',
        totalAmount: 300,
        status: '승인',
        issuedAt: '2026-11-05',
      }),
    ])
    expect(acme).toEqual({
      name: 'Acme',
      invoiceCount: 3,
      totalAmount: 400,
      approvedCount: 2,
      latestIssuedAt: '2026-11-09',
    })
  })

  it('공백, 대소문자가 다른 같은 이름은 하나로 묶고 처음 표기를 사용', () => {
    const groups = groupClients([
      summary({ id: 'a', clientName: '  삼성   물산 ' }),
      summary({ id: 'b', clientName: '삼성 물산' }),
      summary({ id: 'c', clientName: 'ACME' }),
      summary({ id: 'd', clientName: 'acme' }),
    ])
    expect(groups.map(g => [g.name, g.invoiceCount])).toEqual([
      ['삼성 물산', 2],
      ['ACME', 2],
    ])
  })

  it('이름이 비어 있으면 (이름 없음)으로 묶음', () => {
    const groups = groupClients([
      summary({ id: 'a', clientName: '' }),
      summary({ id: 'b', clientName: '   ' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe(UNNAMED_CLIENT)
    expect(groups[0].invoiceCount).toBe(2)
  })

  it('cleanClientName', () => {
    expect(cleanClientName('  a \n b\t c ')).toBe('a b c')
  })
})

describe('클라이언트 목록 쿼리', () => {
  const clients = groupClients([
    summary({
      id: 'a',
      clientName: 'Beta',
      totalAmount: 500,
      issuedAt: '2026-11-02',
    }),
    summary({
      id: 'b',
      clientName: 'Acme',
      totalAmount: 100,
      issuedAt: '2026-11-09',
    }),
    summary({
      id: 'c',
      clientName: 'Acme',
      totalAmount: 100,
      issuedAt: '2026-11-03',
    }),
    summary({ id: 'd', clientName: '(주)한빛 [본사]', totalAmount: 900 }),
  ])
  const names = (list: { name: string }[]) => list.map(c => c.name)

  it('파싱: 기본값과 잘못된 값 처리', () => {
    expect(parseClientListQuery({})).toEqual(DEFAULT_CLIENT_LIST_QUERY)
    expect(
      parseClientListQuery({ page: '-3', sort: 'x', order: 'up', q: '  a  ' })
    ).toEqual({ ...DEFAULT_CLIENT_LIST_QUERY, q: 'a' })
    expect(
      parseClientListQuery({ sort: 'totalAmount', order: 'asc' })
    ).toMatchObject({
      sort: 'totalAmount',
      order: 'asc',
    })
  })

  it('검색: 부분 일치, 대소문자 무시, 특수문자는 문자 그대로, 빈 검색어는 전체', () => {
    expect(names(filterClients(clients, ' ACM '))).toEqual(['Acme'])
    expect(names(filterClients(clients, '[본사]'))).toEqual(['(주)한빛 [본사]'])
    expect(filterClients(clients, '.*')).toEqual([])
    expect(filterClients(clients, '   ')).toHaveLength(3)
  })

  it('정렬: 총액 내림차순, 이름 오름차순, 최근 발행일', () => {
    expect(names(sortClients(clients, 'totalAmount', 'desc'))).toEqual([
      '(주)한빛 [본사]',
      'Beta',
      'Acme',
    ])
    expect(names(sortClients(clients, 'name', 'asc'))[0]).toBe(
      '(주)한빛 [본사]'
    )
    expect(names(sortClients(clients, 'latestIssuedAt', 'desc'))[0]).toBe(
      'Acme'
    )
  })

  it('정렬 값이 같으면 이름순으로 안정 정렬', () => {
    const tie = groupClients([
      summary({ id: 'a', clientName: 'B', totalAmount: 1 }),
      summary({ id: 'b', clientName: 'A', totalAmount: 1 }),
    ])
    expect(names(sortClients(tie, 'totalAmount', 'desc'))).toEqual(['A', 'B'])
  })

  it('페이지 분할은 invoice paginate 재사용', () => {
    const many = Array.from({ length: 12 }, (_, i) => i)
    expect(paginate(many, 2).items).toEqual([10, 11])
  })

  it('URL 만들기와 정렬 토글', () => {
    expect(buildClientListHref(DEFAULT_CLIENT_LIST_QUERY)).toBe(
      '/admin/clients'
    )
    expect(
      buildClientListHref({ q: '삼성', sort: 'name', order: 'asc', page: 2 })
    ).toBe('/admin/clients?q=%EC%82%BC%EC%84%B1&sort=name&order=asc&page=2')
    expect(
      toggleClientSort({ ...DEFAULT_CLIENT_LIST_QUERY, page: 3 }, 'name')
    ).toMatchObject({ sort: 'name', order: 'asc', page: 1 })
  })

  it('클라이언트의 견적서 목록 링크는 이름을 인코딩', () => {
    expect(buildClientInvoicesHref('A & B')).toBe('/admin/invoices?q=A+%26+B')
  })
})
