// PRD 데이터 모델 기반 견적서 도메인 타입
// 노션 응답은 Zod로 검증한 뒤 이 타입으로 변환해 사용합니다. (F001)

/** 견적서 상태 (노션 Select: 초안 / 발행 / 만료) */
export type InvoiceStatus = "draft" | "published" | "expired";

/** 견적 항목 (견적 항목 DB) */
export interface InvoiceItem {
  id: string;
  /** 품목명 */
  name: string;
  /** 수량 */
  quantity: number;
  /** 단가 */
  unitPrice: number;
  /** 금액 (수량 x 단가, 웹에서 재계산) */
  amount: number;
}

/** 견적서 (견적서 DB + 항목) */
export interface Invoice {
  id: string;
  /** 견적번호 (예: Q-2026-001) */
  invoiceNumber: string;
  /** 공유토큰 */
  shareToken: string;
  /** 상태 */
  status: InvoiceStatus;
  /** 수신처 */
  recipient: string;
  /** 발행일 (ISO 날짜 문자열) */
  issuedAt: string;
  /** 유효기간 종료일 (ISO 날짜 문자열) */
  validUntil: string;
  /** 부가세율 (예: 0.1 = 10%) */
  vatRate: number;
  /** 비고 */
  note: string;
  /** 견적 항목 목록 */
  items: InvoiceItem[];
}

/** 화면/PDF 표시에 쓰는 합계 정보 */
export interface InvoiceTotals {
  subtotal: number;
  vat: number;
  total: number;
}
