import { PDF_FILE_NAME_PREFIX } from '@/lib/constants'

/** 견적서 번호를 파일명에 안전한 문자(영문, 숫자, 하이픈)로 바꿔 PDF 파일명을 만듭니다. */
export function toSafeFileName(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^A-Za-z0-9-]/g, '_')
  return `${PDF_FILE_NAME_PREFIX}-${safe}.pdf`
}
