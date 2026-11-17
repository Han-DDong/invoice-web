import { describe, expect, it, vi } from 'vitest'

import { getAccessibleInvoice, getAdminInvoice } from '@/lib/invoice-access'
import { getInvoiceByPageId } from '@/lib/invoice-service'

import { buildInvoice, TEST_PAGE_ID } from './fixtures/notion'

// 관리자 견적서 조회 테스트 (조회 서비스는 모킹): 만료 건 허용, 공개 경로는 여전히 만료 차단

vi.mock('@/lib/invoice-service', () => ({ getInvoiceByPageId: vi.fn() }))

const mockedGetInvoice = vi.mocked(getInvoiceByPageId)

const expiredInvoice = buildInvoice({ validUntil: '2000-01-01' })

describe('getAdminInvoice', () => {
  it('만료된 견적서도 조회 가능 (공개 경로는 expired로 차단)', async () => {
    mockedGetInvoice.mockResolvedValue({ ok: true, invoice: expiredInvoice })

    expect(await getAdminInvoice(TEST_PAGE_ID)).toEqual({
      ok: true,
      invoice: expiredInvoice,
    })
    expect(await getAccessibleInvoice(TEST_PAGE_ID)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('형식이 잘못된 ID는 노션 조회 없이 invalid', async () => {
    mockedGetInvoice.mockClear()
    expect(await getAdminInvoice('짧음!')).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(mockedGetInvoice).not.toHaveBeenCalled()
  })

  it('조회 서비스(견적서 DB 소속 확인 포함)의 not_found, 조회 실패를 구분', async () => {
    mockedGetInvoice.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'not_found' },
    })
    expect(await getAdminInvoice(TEST_PAGE_ID)).toEqual({
      ok: false,
      reason: 'not_found',
    })

    mockedGetInvoice.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'query_failed', cause: new Error('secret') },
    })
    expect(await getAdminInvoice(TEST_PAGE_ID)).toEqual({
      ok: false,
      reason: 'error',
    })
  })
})
