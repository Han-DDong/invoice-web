import { calculateItemAmount } from "@/lib/invoice-calculations"
import type { Invoice, InvoiceItem } from "@/types/invoice"

// 노션 CSV 예시 기준 더미 견적서 데이터 (Task 008에서 실제 노션 데이터로 교체)

type DummyItemInput = Pick<InvoiceItem, "id" | "name" | "quantity" | "unitPrice">

// 금액은 수량 x 단가로 계산
function toItem(input: DummyItemInput): InvoiceItem {
  return { ...input, amount: calculateItemAmount(input) }
}

export const dummyInvoice: Invoice = {
  id: "00000000000000000000000000000001",
  invoiceNumber: "INV-2026-011",
  status: "대기",
  clientName: "주식회사 모두의컴퍼니",
  issuedAt: "2026-11-03",
  validUntil: "2026-11-30",
  items: [
    toItem({ id: "item-1", name: "웹 서비스 기획 및 개발", quantity: 1, unitPrice: 55000000 }),
    toItem({ id: "item-2", name: "디자인 시안 수정", quantity: 2, unitPrice: 500000 }),
    toItem({ id: "item-3", name: "콘텐츠 등록 작업 (건당)", quantity: 400, unitPrice: 10000 }),
  ],
}
