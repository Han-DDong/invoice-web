import { describe, expect, it } from 'vitest'

import { parseUnavailableReason, shareTokenSchema } from '@/lib/access'
import {
  calculateInvoiceTotals,
  calculateItemAmount,
} from '@/lib/invoice-calculations'
import { toSafeFileName } from '@/lib/pdf/file-name'

// 순수 함수 테스트: 합계 계산, 토큰 형식, 접근 불가 사유, PDF 파일명

describe('calculateItemAmount / calculateInvoiceTotals', () => {
  it('항목 금액은 수량 x 단가', () => {
    expect(calculateItemAmount({ quantity: 3, unitPrice: 2500 })).toBe(7500)
  })

  it('합계는 항목 금액 합계이며 부가세를 더하지 않는다 (CSV 예시 60,000,000)', () => {
    const items = [
      { quantity: 1, unitPrice: 55_000_000 },
      { quantity: 2, unitPrice: 500_000 },
      { quantity: 400, unitPrice: 10_000 },
    ]
    expect(calculateInvoiceTotals(items)).toEqual({ total: 60_000_000 })
  })

  it('항목이 없으면 합계 0', () => {
    expect(calculateInvoiceTotals([])).toEqual({ total: 0 })
  })
})

describe('shareTokenSchema', () => {
  it('15자는 실패, 16자는 성공', () => {
    expect(shareTokenSchema.safeParse('a'.repeat(15)).success).toBe(false)
    expect(shareTokenSchema.safeParse('a'.repeat(16)).success).toBe(true)
  })

  it('128자는 성공, 129자는 실패', () => {
    expect(shareTokenSchema.safeParse('a'.repeat(128)).success).toBe(true)
    expect(shareTokenSchema.safeParse('a'.repeat(129)).success).toBe(false)
  })

  it('영문, 숫자, -, _ 만 허용', () => {
    expect(shareTokenSchema.safeParse('abcDEF0123456789-_').success).toBe(true)
    expect(shareTokenSchema.safeParse('abcdef0123456789/x').success).toBe(false)
    expect(shareTokenSchema.safeParse('abcdef0123456789 x').success).toBe(false)
  })
})

describe('parseUnavailableReason', () => {
  it('알려진 사유는 그대로 반환', () => {
    expect(parseUnavailableReason('expired')).toBe('expired')
    expect(parseUnavailableReason('error')).toBe('error')
  })

  it('알 수 없는 값, 배열, 빈 값은 invalid', () => {
    expect(parseUnavailableReason('hacked')).toBe('invalid')
    expect(parseUnavailableReason(['expired', 'error'])).toBe('invalid')
    expect(parseUnavailableReason(undefined)).toBe('invalid')
  })
})

describe('toSafeFileName', () => {
  it('견적서 번호로 invoice-<번호>.pdf를 만든다', () => {
    expect(toSafeFileName('INV-2026-011')).toBe('invoice-INV-2026-011.pdf')
  })

  it('영문, 숫자, 하이픈 외 문자는 _로 바꾼다 (헤더 주입, 경로 문자 방지)', () => {
    expect(toSafeFileName('견적/../"a"\r\n')).toBe('invoice-_______a___.pdf')
  })
})
