import type { Invoice, InvoiceTotals } from "@/types/invoice";

/** PDF 문서 컴포넌트에 전달하는 props (F003) */
export interface InvoicePdfProps {
  invoice: Invoice;
  totals: InvoiceTotals;
}
