'use client' // 에러 경계는 반드시 Client Component여야 함

import { RotateCw, TriangleAlert } from 'lucide-react'

import { ListState } from '@/components/admin/list-state'
import { Button } from '@/components/ui/button'

interface AdminInvoicesErrorProps {
  error: unknown
  retry: () => void
}

// 목록 세그먼트 에러 경계: error.message 원문은 화면에 출력하지 않고 고정 문구만 표시
export default function AdminInvoicesError({ retry }: AdminInvoicesErrorProps) {
  return (
    <ListState
      icon={TriangleAlert}
      tone="destructive"
      title="화면을 표시하지 못했습니다"
      description="일시적인 오류일 수 있습니다. 다시 시도해 주세요."
    >
      <Button type="button" variant="outline" onClick={() => retry()}>
        <RotateCw aria-hidden />
        다시 시도
      </Button>
    </ListState>
  )
}
