import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getAccessibleInvoice,
  getKstToday,
  isInvoiceExpired,
} from '@/lib/invoice-access'
import { getInvoiceByPageId } from '@/lib/invoice-service'

import { buildInvoice, TEST_PAGE_ID } from './fixtures/notion'

// 접근 판정 테스트 (조회 서비스는 모킹)
vi.mock('@/lib/invoice-service', () => ({ getInvoiceByPageId: vi.fn() }))

const mockedGetInvoice = vi.mocked(getInvoiceByPageId)

afterEach(() => {
  vi.useRealTimers()
})

describe('isInvoiceExpired', () => {
  it('유효기간 당일까지 유효, 다음 날부터 만료', () => {
    expect(isInvoiceExpired('2026-11-16', '2026-11-16')).toBe(false)
    expect(isInvoiceExpired('2026-11-15', '2026-11-16')).toBe(true)
  })
})

describe('getKstToday', () => {
  it('UTC 15시 경계에서 KST 날짜가 바뀐다', () => {
    expect(getKstToday(new Date('2026-11-16T14:59:59Z'))).toBe('2026-11-16')
    expect(getKstToday(new Date('2026-11-16T15:00:00Z'))).toBe('2026-11-17')
  })
})

describe('getAccessibleInvoice', () => {
  it('형식 오류 토큰은 조회 없이 invalid', async () => {
    await expect(getAccessibleInvoice('short')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(mockedGetInvoice).not.toHaveBeenCalled()
  })

  it('조회 결과 not_found는 not_found', async () => {
    mockedGetInvoice.mockResolvedValue({
      ok: false,
      error: { kind: 'not_found' },
    })
    await expect(getAccessibleInvoice(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('query_failed, validation_failed는 error', async () => {
    mockedGetInvoice.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'query_failed' },
    })
    mockedGetInvoice.mockResolvedValueOnce({
      ok: false,
      error: { kind: 'validation_failed', issues: [] },
    })
    await expect(getAccessibleInvoice(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      reason: 'error',
    })
    await expect(getAccessibleInvoice(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      reason: 'error',
    })
  })

  it('유효기간이 오늘(KST)보다 이전이면 expired, 당일이면 통과', async () => {
    vi.useFakeTimers()
    // KST 2026-11-17 00:30
    vi.setSystemTime(new Date('2026-11-16T15:30:00Z'))

    mockedGetInvoice.mockResolvedValueOnce({
      ok: true,
      invoice: buildInvoice({ validUntil: '2026-11-16' }),
    })
    await expect(getAccessibleInvoice(TEST_PAGE_ID)).resolves.toEqual({
      ok: false,
      reason: 'expired',
    })

    const invoice = buildInvoice({ validUntil: '2026-11-17' })
    mockedGetInvoice.mockResolvedValueOnce({ ok: true, invoice })
    await expect(getAccessibleInvoice(TEST_PAGE_ID)).resolves.toEqual({
      ok: true,
      invoice,
    })
  })

  it('같은(캐시된) 견적서도 날짜가 바뀌면 매 요청 만료를 다시 판정', async () => {
    vi.useFakeTimers()
    const invoice = buildInvoice({ validUntil: '2026-11-16' })
    mockedGetInvoice.mockResolvedValue({ ok: true, invoice })

    vi.setSystemTime(new Date('2026-11-16T14:59:00Z')) // KST 11-16 23:59
    expect((await getAccessibleInvoice(TEST_PAGE_ID)).ok).toBe(true)

    vi.setSystemTime(new Date('2026-11-16T15:01:00Z')) // KST 11-17 00:01
    expect(await getAccessibleInvoice(TEST_PAGE_ID)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })
})
