import type { InvoiceStatus } from '@/types/invoice'

// 관리자 견적서 목록용 요약 타입 (Phase 5, Task 014-A)

/** 견적서 목록 한 줄 */
export interface InvoiceSummary {
  /** 노션 페이지 ID (공유 URL 토큰) */
  id: string
  /** 견적서 번호 */
  invoiceNumber: string
  /** 상태 */
  status: InvoiceStatus
  /** 클라이언트명 */
  clientName: string
  /** 발행일 (YYYY-MM-DD) */
  issuedAt: string
  /** 유효기간 종료일 (YYYY-MM-DD) */
  validUntil: string
  /** 총액 (항목 수량 x 단가 합계, 부가세 없음) */
  totalAmount: number
  /** 노션 페이지 생성 시각 (ISO 8601, created_time) */
  createdAt: string
  /** 노션 페이지 마지막 수정 시각 (ISO 8601, last_edited_time) */
  updatedAt: string
}
