import { describe, expect, it } from 'vitest'

import {
  formatKstDate,
  normalizeNotionDate,
  parseNotionInvoice,
  parseNotionItem,
  parseNotionItems,
} from '@/lib/notion-parser'

import {
  buildInvoicePage,
  buildItemPage,
  TEST_PAGE_ID,
} from './fixtures/notion'

// 노션 응답 → 도메인 변환 테스트

describe('formatKstDate / normalizeNotionDate', () => {
  it('UTC 15시부터 KST 다음 날', () => {
    expect(formatKstDate(new Date('2026-11-16T14:59:59Z'))).toBe('2026-11-16')
    expect(formatKstDate(new Date('2026-11-16T15:00:00Z'))).toBe('2026-11-17')
  })

  it('날짜만 있으면 그대로, 시각이 있으면 KST 날짜로', () => {
    expect(
      normalizeNotionDate({ type: 'date', date: { start: '2026-11-03' } })
    ).toBe('2026-11-03')
    expect(
      normalizeNotionDate({
        type: 'date',
        date: { start: '2026-11-03T16:00:00.000Z' },
      })
    ).toBe('2026-11-04')
  })

  it('값이 없거나 해석할 수 없으면 null', () => {
    expect(normalizeNotionDate({ type: 'date', date: null })).toBeNull()
    expect(
      normalizeNotionDate({ type: 'date', date: { start: 'not-a-date' } })
    ).toBeNull()
  })
})

describe('parseNotionItem / parseNotionItems', () => {
  it('Formula 금액을 무시하고 수량 x 단가로 재계산', () => {
    const result = parseNotionItem(
      buildItemPage({ quantity: 3, unitPrice: 2000, amount: 1 })
    )
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'item-1',
        name: '항목',
        quantity: 3,
        unitPrice: 2000,
        amount: 6000,
      },
    })
  })

  it('수량 또는 단가가 비어 있으면 실패 (경로만 반환)', () => {
    const result = parseNotionItem(buildItemPage({ quantity: null }))
    expect(result).toEqual({ ok: false, issues: ['item.properties.수량'] })
  })

  it('필수 속성이 없으면 실패', () => {
    const page = buildItemPage()
    const properties: Partial<typeof page.properties> = { ...page.properties }
    delete properties.항목명
    const result = parseNotionItem({ ...page, properties })
    expect(result.ok).toBe(false)
  })

  it('하나라도 실패하면 전체 실패, 인덱스를 경로에 포함', () => {
    const result = parseNotionItems([
      buildItemPage(),
      buildItemPage({ unitPrice: null }),
    ])
    expect(result).toEqual({
      ok: false,
      issues: ['items[1].item.properties.단가'],
    })
  })

  it('빈 목록은 성공', () => {
    expect(parseNotionItems([])).toEqual({ ok: true, data: [] })
  })
})

describe('parseNotionInvoice', () => {
  it('견적서 페이지를 Invoice로 변환', () => {
    const result = parseNotionInvoice(buildInvoicePage(), [])
    expect(result).toEqual({
      ok: true,
      data: {
        id: TEST_PAGE_ID,
        invoiceNumber: 'INV-2026-011',
        status: '대기',
        clientName: '테스트 클라이언트',
        issuedAt: '2026-11-03',
        validUntil: '2026-12-31',
        items: [],
      },
    })
  })

  it('유효기간이 비어 있으면 실패', () => {
    const result = parseNotionInvoice(
      buildInvoicePage({ validUntil: null }),
      []
    )
    expect(result).toEqual({
      ok: false,
      issues: ['invoice.properties.유효기간'],
    })
  })

  it('알 수 없는 상태 값은 실패', () => {
    const result = parseNotionInvoice(buildInvoicePage({ status: '보류' }), [])
    expect(result.ok).toBe(false)
  })
})
