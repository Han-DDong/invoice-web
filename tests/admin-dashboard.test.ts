import { describe, expect, it } from 'vitest'

import {
  addDays,
  buildActivities,
  getRecentInvoices,
  summarizeInvoices,
} from '@/lib/admin-dashboard'
import { formatKstDateTime, formatRelativeTime } from '@/lib/relative-time'
import type { InvoiceSummary } from '@/types/invoice-list'

// 대시보드 집계, 최근 활동, 시간 표시 테스트 (순수 함수)

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

describe('summarizeInvoices', () => {
  const today = '2026-11-17'

  it('빈 목록은 모두 0', () => {
    expect(summarizeInvoices([], today)).toEqual({
      totalCount: 0,
      statusCounts: { 대기: 0, 승인: 0, 거절: 0 },
      totalAmount: 0,
      clientCount: 0,
      expiredCount: 0,
      expiringSoonCount: 0,
    })
  })

  it('상태별 개수, 총액(항목 0건은 0원), 클라이언트 수', () => {
    const result = summarizeInvoices(
      [
        summary({ id: 'a', status: '대기', totalAmount: 100 }),
        summary({
          id: 'b',
          status: '승인',
          totalAmount: 200,
          clientName: ' acme ',
        }),
        summary({
          id: 'c',
          status: '승인',
          totalAmount: 0,
          clientName: 'Beta',
        }),
        summary({
          id: 'd',
          status: '거절',
          totalAmount: 50,
          clientName: 'Beta',
        }),
      ],
      today
    )
    expect(result.statusCounts).toEqual({ 대기: 1, 승인: 2, 거절: 1 })
    expect(result.totalAmount).toBe(350)
    expect(result.clientCount).toBe(2)
    expect(result.totalCount).toBe(4)
  })

  it('만료는 오늘 이전, 임박은 오늘부터 7일 이내(당일, 7일째 포함)', () => {
    const result = summarizeInvoices(
      [
        summary({ id: 'a', validUntil: '2026-11-16' }), // 어제: 만료
        summary({ id: 'b', validUntil: '2026-11-17' }), // 오늘: 임박
        summary({ id: 'c', validUntil: '2026-11-24' }), // 7일째: 임박
        summary({ id: 'd', validUntil: '2026-11-25' }), // 8일째: 해당 없음
      ],
      today
    )
    expect(result.expiredCount).toBe(1)
    expect(result.expiringSoonCount).toBe(2)
  })

  it('addDays는 월, 연도 경계를 넘김', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05')
    expect(addDays('2026-12-30', 7)).toBe('2027-01-06')
  })
})

describe('getRecentInvoices', () => {
  it('발행일 최신순, 같은 날이면 생성 시각 최신순, 개수 제한', () => {
    const list = [
      summary({ id: 'a', issuedAt: '2026-11-01' }),
      summary({
        id: 'b',
        issuedAt: '2026-11-05',
        createdAt: '2026-11-05T01:00:00Z',
      }),
      summary({
        id: 'c',
        issuedAt: '2026-11-05',
        createdAt: '2026-11-05T09:00:00Z',
      }),
    ]
    expect(getRecentInvoices(list, 2).map(i => i.id)).toEqual(['c', 'b'])
    expect(list.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('빈 목록', () => {
    expect(getRecentInvoices([], 5)).toEqual([])
  })
})

describe('buildActivities', () => {
  it('생성과 수정 이벤트를 최신순으로 정렬', () => {
    const events = buildActivities(
      [
        summary({
          id: 'a',
          invoiceNumber: 'INV-A',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-10T00:00:00Z',
          status: '승인',
        }),
        summary({
          id: 'b',
          invoiceNumber: 'INV-B',
          createdAt: '2026-11-05T00:00:00Z',
          updatedAt: '2026-11-05T00:00:30Z',
        }),
      ],
      10
    )
    expect(events.map(e => [e.invoiceNumber, e.type])).toEqual([
      ['INV-A', 'updated'],
      ['INV-B', 'created'],
      ['INV-A', 'created'],
    ])
    expect(events[0].status).toBe('승인')
  })

  it('생성 직후(1분 이내) 갱신은 수정으로 보지 않고, 1분 넘으면 수정', () => {
    const created = '2026-11-05T00:00:00Z'
    expect(
      buildActivities(
        [summary({ createdAt: created, updatedAt: '2026-11-05T00:01:00Z' })],
        10
      ).map(e => e.type)
    ).toEqual(['created'])
    expect(
      buildActivities(
        [summary({ createdAt: created, updatedAt: '2026-11-05T00:01:01Z' })],
        10
      ).map(e => e.type)
    ).toEqual(['updated', 'created'])
  })

  it('개수 제한, 빈 목록, 해석할 수 없는 시각은 건너뜀', () => {
    expect(buildActivities([], 5)).toEqual([])
    expect(
      buildActivities(
        [summary({ createdAt: 'invalid', updatedAt: 'invalid' })],
        5
      )
    ).toEqual([])
    const many = Array.from({ length: 8 }, (_, i) =>
      summary({ id: `id-${i}`, createdAt: `2026-11-0${i + 1}T00:00:00Z` })
    )
    expect(buildActivities(many, 5)).toHaveLength(5)
  })
})

describe('시간 표시', () => {
  const now = new Date('2026-11-17T03:00:00Z')

  it('formatKstDateTime은 KST로 변환', () => {
    expect(formatKstDateTime('2026-11-17T00:30:00Z')).toBe('2026-11-17 09:30')
    expect(formatKstDateTime('2026-11-16T15:00:00Z')).toBe('2026-11-17 00:00')
    expect(formatKstDateTime('invalid')).toBe('')
  })

  it('formatRelativeTime 구간', () => {
    expect(formatRelativeTime('2026-11-17T02:59:30Z', now)).toBe('방금 전')
    expect(formatRelativeTime('2026-11-17T02:55:00Z', now)).toBe('5분 전')
    expect(formatRelativeTime('2026-11-17T00:00:00Z', now)).toBe('3시간 전')
    expect(formatRelativeTime('2026-11-14T03:00:00Z', now)).toBe('3일 전')
    expect(formatRelativeTime('2026-08-17T03:00:00Z', now)).toBe('3개월 전')
    expect(formatRelativeTime('2026-11-18T03:00:00Z', now)).toBe('방금 전')
    expect(formatRelativeTime('invalid', now)).toBe('')
  })
})
