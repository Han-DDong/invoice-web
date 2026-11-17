import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { InvoiceClientInfo } from '@/components/invoice/invoice-client-info'
import { InvoiceItemsTable } from '@/components/invoice/invoice-items-table'

// 긴 텍스트 레이아웃 회귀 테스트
// 공백 없이 긴 항목명, 클라이언트명이 모바일 화면을 가로로 넓히지 않도록 줄바꿈 클래스가 유지되는지 확인합니다.
// (실제 폭은 브라우저에서 확인: 노션 샘플 데이터로 375px에서 scrollWidth 20546 -> 375 수정)

describe('긴 텍스트 줄바꿈', () => {
  it('견적 항목명(모바일 카드, 데스크톱 표)에 wrap-anywhere 적용', () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceItemsTable, {
        items: [
          {
            id: 'i1',
            name: 'A'.repeat(500),
            quantity: 1,
            unitPrice: 1000,
            amount: 1000,
          },
        ],
      })
    )
    expect(html.match(/wrap-anywhere/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('클라이언트명에 wrap-anywhere 적용', () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceClientInfo, {
        invoice: {
          clientName: 'B'.repeat(500),
          issuedAt: '2026-11-01',
          validUntil: '2026-12-31',
        },
      })
    )
    expect(html).toContain('wrap-anywhere')
  })
})
