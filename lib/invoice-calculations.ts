import type { InvoiceItem, InvoiceTotals } from "@/types/invoice";

// 합계 계산 순수 함수 (env, 노션 클라이언트에 의존하지 않음)

/** 항목 금액을 수량 x 단가로 계산합니다. 노션 금액 값은 신뢰하지 않습니다. */
export function calculateItemAmount(
  item: Pick<InvoiceItem, "quantity" | "unitPrice">,
): number {
  return item.quantity * item.unitPrice;
}

/** 항목 목록의 합계를 계산합니다. (부가세 없음) */
export function calculateInvoiceTotals(
  items: Pick<InvoiceItem, "quantity" | "unitPrice">[],
): InvoiceTotals {
  const total = items.reduce((sum, item) => sum + calculateItemAmount(item), 0);

  return { total };
}
