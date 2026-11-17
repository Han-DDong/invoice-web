import { renderToBuffer } from '@react-pdf/renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hasAdminSession } from '@/lib/auth/admin-guard'
import { getAdminInvoice } from '@/lib/invoice-access'

import { buildInvoice, TEST_PAGE_ID } from './fixtures/notion'

// 관리자 PDF Route Handler 테스트 (세션, 접근 판정, PDF 렌더링, 폰트 모킹)

vi.mock('@/lib/auth/admin-guard', () => ({ hasAdminSession: vi.fn() }))
vi.mock('@/lib/invoice-access', () => ({ getAdminInvoice: vi.fn() }))
vi.mock('@/lib/pdf/fonts', () => ({ registerPdfFonts: vi.fn() }))
vi.mock('@/components/pdf/invoice-template', () => ({
  InvoicePdfDocument: vi.fn(() => null),
}))
vi.mock('@react-pdf/renderer', () => ({ renderToBuffer: vi.fn() }))

const mockedSession = vi.mocked(hasAdminSession)
const mockedAccess = vi.mocked(getAdminInvoice)
const mockedRender = vi.mocked(renderToBuffer)

async function callGet(id = TEST_PAGE_ID) {
  const { GET } =
    await import('@/app/admin/(protected)/invoices/[id]/pdf/route')
  return GET(new Request(`http://localhost/admin/invoices/${id}/pdf`), {
    params: Promise.resolve({ id }),
  })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('GET /admin/invoices/[id]/pdf', () => {
  it('세션이 없으면 401이고 노션 조회와 렌더링을 하지 않음', async () => {
    mockedSession.mockResolvedValue(false)
    const response = await callGet()

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mockedAccess).not.toHaveBeenCalled()
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid', 404, '견적서를 찾을 수 없습니다.'],
    ['not_found', 404, '견적서를 찾을 수 없습니다.'],
    ['error', 500, '견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'],
  ] as const)('%s → %i', async (reason, status, message) => {
    mockedSession.mockResolvedValue(true)
    mockedAccess.mockResolvedValue({ ok: false, reason })
    const response = await callGet()

    expect(response.status).toBe(status)
    expect(await response.text()).toBe(message)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('만료된 견적서도 200, application/pdf, 공개와 같은 파일명, no-store', async () => {
    mockedSession.mockResolvedValue(true)
    mockedAccess.mockResolvedValue({
      ok: true,
      invoice: buildInvoice({ validUntil: '2000-01-01' }),
    })
    mockedRender.mockResolvedValue(Buffer.from('%PDF-test'))
    const response = await callGet()

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
    mockedSession.mockResolvedValue(true)
    mockedAccess.mockResolvedValue({ ok: true, invoice: buildInvoice() })
    mockedRender.mockRejectedValue(new Error('secret render failure'))
    const response = await callGet()

    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('secret')
  })
})
