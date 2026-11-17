import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'

import { InvoicePdfDocument } from '@/components/pdf/invoice-template'
import { calculateInvoiceTotals } from '@/lib/invoice-calculations'
import { logServerError } from '@/lib/logger'
import { toSafeFileName } from '@/lib/pdf/file-name'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import type { Invoice } from '@/types/invoice'

// 견적서 PDF 응답 생성 (공개 PDF 라우트와 관리자 PDF 라우트가 공유)
// 접근 판정(공유 토큰, 관리자 세션)은 호출하는 쪽 책임이고, 여기서는 렌더링과 응답 헤더만 만듭니다.

/** PDF 렌더링 실패 응답 문구 */
export const RENDER_FAILED_MESSAGE =
  'PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** 간단한 텍스트 오류 응답 (캐시 금지) */
export function textResponse(
  status: number,
  message: string,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

/**
 * 견적서를 PDF 첨부 파일 응답으로 만듭니다. 렌더링에 실패하면 500 텍스트 응답을 반환합니다.
 * @param invoice 접근이 허용된 견적서
 */
export async function renderInvoicePdfResponse(
  invoice: Invoice
): Promise<Response> {
  try {
    registerPdfFonts()
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
    // 원인은 서버 로그(name만)에 남기고 응답에는 노출하지 않음
    logServerError({
      scope: 'pdf-route',
      stage: 'render',
      event: 'PDF 생성 실패',
      token: invoice.id,
      error,
    })
    return textResponse(500, RENDER_FAILED_MESSAGE)
  }
}
