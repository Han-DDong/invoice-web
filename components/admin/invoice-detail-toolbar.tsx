import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface InvoiceDetailToolbarProps {
  /** 목록으로 돌아갈 URL (보던 검색, 정렬, 페이지 유지) */
  backHref: string
  /** 공개 견적서 경로 (/invoice/[id]) */
  publicHref: string
}

// 상세 상단 바: 목록으로 이동, 공개 링크 새 탭 열기
export function InvoiceDetailToolbar({
  backHref,
  publicHref,
}: InvoiceDetailToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft aria-hidden />
          목록으로
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={publicHref} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden />
          공개 링크 열기
        </a>
      </Button>
    </div>
  )
}
