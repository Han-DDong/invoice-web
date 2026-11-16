import { renderToBuffer } from '@react-pdf/renderer'

import { InvoicePdfDocument } from '@/components/pdf/invoice-template'
import { PDF_FILE_NAME_PREFIX } from '@/lib/constants'
import {
  getAccessibleInvoice,
  type InvoiceAccessDeniedReason,
} from '@/lib/invoice-access'
import { calculateInvoiceTotals } from '@/lib/invoice-calculations'
import { registerPdfFonts } from '@/lib/pdf/fonts'

// 견적서 PDF 다운로드 (F003)
// 화면과 같은 getAccessibleInvoice로 검증해 검증 우회를 막습니다.
export const runtime = 'nodejs'

interface PdfRouteContext {
  params: Promise<{ token: string }>
}

/** 접근 불가 사유별 응답 (원문은 노출하지 않고 간단한 문구만 반환) */
const DENIED_RESPONSES: Record<
  InvoiceAccessDeniedReason,
  { status: number; message: string }
> = {
  invalid: { status: 404, message: '견적서를 찾을 수 없습니다.' },
  not_found: { status: 404, message: '견적서를 찾을 수 없습니다.' },
  expired: { status: 410, message: '유효기간이 지난 견적서입니다.' },
  error: {
    status: 500,
    message: 'PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
}

/** 간단한 텍스트 오류 응답 (캐시 금지) */
function textResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

/** 견적서 번호를 파일명에 안전한 문자(영문, 숫자, 하이픈)로 바꿉니다. */
function toSafeFileName(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^A-Za-z0-9-]/g, '_')
  return `${PDF_FILE_NAME_PREFIX}-${safe}.pdf`
}

export async function GET(
  _request: Request,
  { params }: PdfRouteContext
): Promise<Response> {
  const { token } = await params

  const access = await getAccessibleInvoice(token)
  if (!access.ok) {
    const denied = DENIED_RESPONSES[access.reason]
    return textResponse(denied.status, denied.message)
  }

  try {
    registerPdfFonts()
    const { invoice } = access
    // renderToBuffer는 Document 요소를 요구하므로 컴포넌트를 직접 호출
    const buffer = await renderToBuffer(
      InvoicePdfDocument({
        invoice,
        totals: calculateInvoiceTotals(invoice.items),
      })
    )

    const fileName = toSafeFileName(invoice.invoiceNumber)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    // 원인은 서버 로그에만 남기고 응답에는 노출하지 않음
    console.error('[pdf-route] PDF 생성 실패', error)
    return textResponse(500, DENIED_RESPONSES.error.message)
  }
}
