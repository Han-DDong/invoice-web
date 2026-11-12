import { calculateItemAmount } from "@/lib/invoice-calculations"
import type { Invoice, InvoiceItem } from "@/types/invoice"

// 노션 CSV 예시 기준 더미 견적서 데이터 (Task 008에서 실제 노션 데이터로 교체)

type DummyItemInput = Pick<InvoiceItem, "id" | "name" | "quantity" | "unitPrice">

// 금액은 수량 x 단가로 계산
function toItem(input: DummyItemInput): InvoiceItem {
  return { ...input, amount: calculateItemAmount(input) }
}

// 노션 CSV 예시 항목 (합계 60,000,000원)
const sampleItems: InvoiceItem[] = [
  toItem({ id: "item-1", name: "웹 서비스 기획 및 개발", quantity: 1, unitPrice: 55000000 }),
  toItem({ id: "item-2", name: "디자인 시안 수정", quantity: 2, unitPrice: 500000 }),
  toItem({ id: "item-3", name: "콘텐츠 등록 작업 (건당)", quantity: 400, unitPrice: 10000 }),
]

// 고정 토큰 (shareTokenSchema 통과: 16자 이상 영문/숫자)
export const DUMMY_TOKENS = {
  pending: "dummyinvoicepending0001",
  approved: "dummyinvoiceapproved001",
  rejected: "dummyinvoicerejected001",
  empty: "dummyinvoiceempty000001",
  expired: "dummyinvoiceexpired0001",
} as const

const baseInvoice = {
  clientName: "주식회사 모두의컴퍼니",
  issuedAt: "2026-11-03",
  validUntil: "2026-11-30",
  items: sampleItems,
}

const dummyInvoices: Invoice[] = [
  { ...baseInvoice, id: DUMMY_TOKENS.pending, invoiceNumber: "INV-2026-011", status: "대기" },
  { ...baseInvoice, id: DUMMY_TOKENS.approved, invoiceNumber: "INV-2026-012", status: "승인" },
  { ...baseInvoice, id: DUMMY_TOKENS.rejected, invoiceNumber: "INV-2026-013", status: "거절" },
  // 항목 0건 (빈 상태 확인용)
  { ...baseInvoice, id: DUMMY_TOKENS.empty, invoiceNumber: "INV-2026-014", status: "대기", items: [] },
  // 유효기간 경과 (Task 008에서 만료 처리 검증용)
  {
    ...baseInvoice,
    id: DUMMY_TOKENS.expired,
    invoiceNumber: "INV-2026-001",
    status: "대기",
    issuedAt: "2026-01-05",
    validUntil: "2026-01-31",
  },
]

/** 토큰으로 더미 견적서를 조회합니다. 없으면 null을 반환합니다. */
export function getDummyInvoice(token: string): Invoice | null {
  return dummyInvoices.find((invoice) => invoice.id === token) ?? null
}
