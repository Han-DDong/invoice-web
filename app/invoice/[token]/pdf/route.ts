import { renderToBuffer } from '@react-pdf/renderer'

import { InvoicePdfDocument } from '@/components/pdf/invoice-template'
import {
  getAccessibleInvoice,
  type InvoiceAccessDeniedReason,
} from '@/lib/invoice-access'
import { calculateInvoiceTotals } from '@/lib/invoice-calculations'
import { logServerError } from '@/lib/logger'
import { toSafeFileName } from '@/lib/pdf/file-name'
import { registerPdfFonts } from '@/lib/pdf/fonts'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

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
    message: '견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
}

/** PDF 렌더링 실패 응답 문구 */
const RENDER_FAILED_MESSAGE =
  'PDF를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** PDF 생성 rate limit: IP당 1분 10회 (Task 011-B) */
const PDF_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const

/** 제한 초과 응답 문구 */
const RATE_LIMITED_MESSAGE = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'

// Proxy는 전역 상태에 의존하지 말라는 공식 문서 안내에 따라 Route Handler 모듈에 둡니다.
// 인스턴스 메모리에만 있으므로 인스턴스 간 공유되지 않고 재시작 시 초기화됩니다.
const pdfRateLimiter = createRateLimiter(PDF_RATE_LIMIT)

/** 간단한 텍스트 오류 응답 (캐시 금지) */
function textResponse(
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

export async function GET(
  request: Request,
  { params }: PdfRouteContext
): Promise<Response> {
  // 가장 비싼 작업(노션 조회, PDF 렌더링) 전에 IP 기준으로 제한
  const limited = pdfRateLimiter.check(getClientIp(request.headers))
  if (!limited.allowed) {
    return textResponse(429, RATE_LIMITED_MESSAGE, {
      'Retry-After': String(limited.retryAfterSeconds),
    })
  }

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
    // 원인은 서버 로그(name만)에 남기고 응답에는 노출하지 않음
    logServerError({
      scope: 'pdf-route',
      stage: 'render',
      event: 'PDF 생성 실패',
      token,
      error,
    })
    return textResponse(500, RENDER_FAILED_MESSAGE)
  }
}
