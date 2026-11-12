"use client" // 에러 경계는 반드시 Client Component여야 함

import { useEffect } from "react"
import { RotateCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  StatusCard,
  StatusCardContactNote,
  StatusCardHomeButton,
} from "@/components/layout/status-card"

interface InvoiceErrorProps {
  // 서버 컴포넌트에서 던진 값은 Error, 클라이언트에서 던진 값은 임의 타입일 수 있음
  error: unknown
  // 세그먼트를 다시 요청하고 렌더링 (Next.js 16 권장)
  retry: () => void
}

// 견적서 상세 세그먼트 에러 경계
// 보안: error.message 원문, 노션 응답, ID는 화면에 출력하지 않고 고정 문구만 표시
export default function InvoiceError({ error, retry }: InvoiceErrorProps) {
  useEffect(() => {
    // 디버깅용으로 브라우저 콘솔에만 기록 (서버 로그와는 error.digest로 대조)
    console.error(error)
  }, [error])

  return (
    <StatusCard
      icon={TriangleAlert}
      tone="destructive"
      title="견적서를 표시하지 못했습니다"
      description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요."
    >
      <StatusCardContactNote />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" className="w-full sm:w-auto" onClick={() => retry()}>
          <RotateCw aria-hidden />
          다시 시도
        </Button>
        <StatusCardHomeButton />
      </div>
    </StatusCard>
  )
}
