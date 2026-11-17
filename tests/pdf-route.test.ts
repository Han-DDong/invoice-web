import { renderToBuffer } from '@react-pdf/renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessibleInvoice } from '@/lib/invoice-access'

import { buildInvoice, TEST_PAGE_ID } from './fixtures/notion'

// PDF Route Handler 상태코드 매핑 테스트 (접근 판정, PDF 렌더링, 폰트 등록 모킹)

vi.mock('@/lib/invoice-access', () => ({ getAccessibleInvoice: vi.fn() }))
vi.mock('@/lib/pdf/fonts', () => ({ registerPdfFonts: vi.fn() }))
vi.mock('@/components/pdf/invoice-template', () => ({
  InvoicePdfDocument: vi.fn(() => null),
}))
vi.mock('@react-pdf/renderer', () => ({ renderToBuffer: vi.fn() }))

const mockedAccess = vi.mocked(getAccessibleInvoice)
const mockedRender = vi.mocked(renderToBuffer)

/** rate limiter 상태가 테스트 사이에 남지 않도록 라우트 모듈을 새로 불러옵니다. */
async function loadRoute() {
  vi.resetModules()
  return import('@/app/(site)/invoice/[token]/pdf/route')
}

function callGet(
  GET: Awaited<ReturnType<typeof loadRoute>>['GET'],
  token = TEST_PAGE_ID,
  ip = '198.51.100.1'
) {
  const request = new Request(`http://localhost/invoice/${token}/pdf`, {
    headers: { 'x-forwarded-for': ip },
  })
  return GET(request, { params: Promise.resolve({ token }) })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('GET /invoice/[token]/pdf', () => {
  it.each([
    ['invalid', 404, '견적서를 찾을 수 없습니다.'],
    ['not_found', 404, '견적서를 찾을 수 없습니다.'],
    ['expired', 410, '유효기간이 지난 견적서입니다.'],
    ['error', 500, '견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'],
  ] as const)('%s → %i', async (reason, status, message) => {
    mockedAccess.mockResolvedValue({ ok: false, reason })
    const { GET } = await loadRoute()
    const response = await callGet(GET)

    expect(response.status).toBe(status)
    expect(await response.text()).toBe(message)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it('정상 → 200, application/pdf, 파일명, no-store', async () => {
    mockedAccess.mockResolvedValue({ ok: true, invoice: buildInvoice() })
    mockedRender.mockResolvedValue(Buffer.from('%PDF-test'))
    const { GET } = await loadRoute()
    const response = await callGet(GET)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain(
      'filename="invoice-INV-2026-011.pdf"'
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      '%PDF-test'
    )
  })

  it('렌더링 예외 → 500, 오류 원문 미노출', async () => {
    mockedAccess.mockResolvedValue({ ok: true, invoice: buildInvoice() })
    mockedRender.mockRejectedValue(new Error('secret render failure'))
    const { GET } = await loadRoute()
    const response = await callGet(GET)

    expect(response.status).toBe(500)
    const body = await response.text()
    expect(body).toBe('PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    expect(body).not.toContain('secret')
  })

  it('같은 IP 11번째 요청부터 429 + Retry-After, 다른 IP는 영향 없음', async () => {
    mockedAccess.mockResolvedValue({ ok: false, reason: 'not_found' })
    const { GET } = await loadRoute()

    for (let i = 0; i < 10; i += 1) {
      expect((await callGet(GET)).status).toBe(404)
    }
    const limited = await callGet(GET)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(limited.headers.get('Cache-Control')).toBe('no-store')
    expect(await limited.text()).toBe(
      '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    )
    // 제한된 요청은 접근 판정(노션 조회)까지 가지 않음
    expect(mockedAccess).toHaveBeenCalledTimes(10)

    expect((await callGet(GET, TEST_PAGE_ID, '198.51.100.2')).status).toBe(404)
  })
})
