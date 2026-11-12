// 실제 노션 DB(견적서 / 견적 항목) 기반 견적서 도메인 타입
// 노션 응답은 Zod(types/notion.ts)로 검증한 뒤 이 타입으로 변환해 사용합니다. (F001)

/** 견적서 상태 값 (노션 Select/Status 옵션 이름 그대로 사용) */
export const INVOICE_STATUSES = ["대기", "승인", "거절"] as const;

/** 견적서 상태 */
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** 견적 항목 (견적 항목 DB) */
export interface InvoiceItem {
  /** 노션 페이지 ID */
  id: string;
  /** 항목명 */
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
  /** 노션 페이지 ID (공유 URL 토큰으로 사용) */
  id: string;
  /** 견적서 번호 (예: INV-2026-011) */
  invoiceNumber: string;
  /** 상태 */
  status: InvoiceStatus;
  /** 클라이언트명 */
  clientName: string;
  /** 발행일 (ISO 날짜 문자열) */
  issuedAt: string;
  /** 유효기간 종료일 (ISO 날짜 문자열) */
  validUntil: string;
  /** 견적 항목 목록 */
  items: InvoiceItem[];
}

/** 화면/PDF 표시에 쓰는 합계 정보 (부가세 없음) */
export interface InvoiceTotals {
  /** 항목 금액 합계 */
  total: number;
}
