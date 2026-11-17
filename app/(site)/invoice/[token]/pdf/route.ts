import {
  getAccessibleInvoice,
  type InvoiceAccessDeniedReason,
} from '@/lib/invoice-access'
import {
  renderInvoicePdfResponse,
  textResponse,
} from '@/lib/pdf/invoice-pdf-response'
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

/** PDF 생성 rate limit: IP당 1분 10회 (Task 011-B) */
const PDF_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const

/** 제한 초과 응답 문구 */
const RATE_LIMITED_MESSAGE = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'

// Proxy는 전역 상태에 의존하지 말라는 공식 문서 안내에 따라 Route Handler 모듈에 둡니다.
// 인스턴스 메모리에만 있으므로 인스턴스 간 공유되지 않고 재시작 시 초기화됩니다.
const pdfRateLimiter = createRateLimiter(PDF_RATE_LIMIT)

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

  // 렌더링과 응답 헤더는 관리자 PDF 라우트와 공유 (lib/pdf/invoice-pdf-response.ts)
  return renderInvoicePdfResponse(access.invoice)
}
