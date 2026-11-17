import { hasAdminSession } from '@/lib/auth/admin-guard'
import { getAdminInvoice } from '@/lib/invoice-access'
import {
  renderInvoicePdfResponse,
  textResponse,
} from '@/lib/pdf/invoice-pdf-response'

// 관리자 견적서 PDF 다운로드 (Phase 5)
// 세션을 확인한 뒤 만료 여부와 관계없이 내려줍니다. 렌더링과 헤더는 공개 PDF 라우트와 공유합니다.
// 세션 쿠키 path=/admin 범위 안의 경로입니다.
export const runtime = 'nodejs'

interface AdminPdfRouteContext {
  params: Promise<{ id: string }>
}

/** 조회 실패 사유별 응답 (노션 원문은 노출하지 않고 간단한 문구만 반환) */
const DENIED_RESPONSES = {
  invalid: { status: 404, message: '견적서를 찾을 수 없습니다.' },
  not_found: { status: 404, message: '견적서를 찾을 수 없습니다.' },
  error: {
    status: 500,
    message: '견적서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
} as const

export async function GET(
  _request: Request,
  { params }: AdminPdfRouteContext
): Promise<Response> {
  // 라우트 핸들러는 레이아웃 보호를 받지 않으므로 직접 세션을 확인 (리다이렉트 대신 401)
  if (!(await hasAdminSession())) {
    return textResponse(401, '로그인이 필요합니다.')
  }

  const { id } = await params

  const access = await getAdminInvoice(id)
  if (!access.ok) {
    const denied = DENIED_RESPONSES[access.reason]
    return textResponse(denied.status, denied.message)
  }

  return renderInvoicePdfResponse(access.invoice)
}
