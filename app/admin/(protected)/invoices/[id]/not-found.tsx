import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

import { ListState } from '@/components/admin/list-state'
import { Button } from '@/components/ui/button'

// 견적서를 찾을 수 없을 때 (잘못된 ID, 삭제, 다른 DB의 페이지)
export default function AdminInvoiceNotFound() {
  return (
    <ListState
      icon={FileQuestion}
      title="견적서를 찾을 수 없습니다"
      description="주소가 올바른지 확인하거나 목록에서 다시 선택해 주세요."
    >
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/invoices">목록으로</Link>
      </Button>
    </ListState>
  )
}
