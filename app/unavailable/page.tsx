import type { Metadata } from "next"
import { ShieldAlert } from "lucide-react"
import {
  StatusCard,
  StatusCardContactNote,
  StatusCardHomeButton,
} from "@/components/layout/status-card"
import { parseUnavailableReason, type UnavailableReason } from "@/lib/access"

export const metadata: Metadata = {
  title: "견적서를 열 수 없습니다",
  robots: { index: false, follow: false },
}

// 사유별 안내 문구 (F010)
const reasonMessages: Record<UnavailableReason, { title: string; description: string }> = {
  invalid: {
    title: "잘못된 링크입니다",
    description: "링크 주소가 올바르지 않거나 더 이상 존재하지 않는 견적서입니다.",
  },
  unpublished: {
    title: "아직 발행되지 않은 견적서입니다",
    description: "작성자가 견적서를 발행하면 같은 링크로 확인할 수 있습니다.",
  },
  expired: {
    title: "유효기간이 지난 견적서입니다",
    description: "최신 견적서가 필요하다면 작성자에게 재발행을 요청해 주세요.",
  },
  error: {
    title: "견적서를 불러오지 못했습니다",
    description: "일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.",
  },
}

interface UnavailablePageProps {
  searchParams: Promise<{ reason?: string | string[] }>
}

export default async function UnavailablePage({ searchParams }: UnavailablePageProps) {
  const { reason } = await searchParams
  const message = reasonMessages[parseUnavailableReason(reason)]

  return (
    <StatusCard
      icon={ShieldAlert}
      tone="warning"
      title={message.title}
      description={message.description}
    >
      <StatusCardContactNote />
      <StatusCardHomeButton />
    </StatusCard>
  )
}
