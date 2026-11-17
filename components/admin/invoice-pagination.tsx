import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface InvoicePaginationProps {
  /** 현재 페이지 (범위 보정 후) */
  page: number
  totalPages: number
  totalCount: number
  /** 페이지 번호로 이동 URL을 만드는 함수 (정렬, 검색 등 다른 쿼리를 유지하는 쪽이 책임) */
  getHref: (page: number) => string
}

/** 현재 페이지 주변의 표시할 페이지 번호 (최대 5개) */
function getVisiblePages(current: number, total: number): number[] {
  const windowSize = Math.min(5, total)
  const start = Math.min(
    Math.max(1, current - Math.floor(windowSize / 2)),
    total - windowSize + 1
  )
  return Array.from({ length: windowSize }, (_, index) => start + index)
}

// 페이지네이션: Link 기반 (정렬 등 다른 쿼리는 유지)
export function InvoicePagination({
  page: currentPage,
  totalPages,
  totalCount,
  getHref,
}: InvoicePaginationProps) {
  const hrefFor = getHref
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        총 {totalCount}건 · {currentPage} / {totalPages} 페이지
      </p>
      <nav aria-label="페이지 이동" className="flex items-center gap-1">
        {hasPrev ? (
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={hrefFor(currentPage - 1)} aria-label="이전 페이지">
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled
            aria-label="이전 페이지"
          >
            <ChevronLeft aria-hidden />
          </Button>
        )}
        {getVisiblePages(currentPage, totalPages).map(page => (
          <Button
            key={page}
            asChild
            variant={page === currentPage ? 'default' : 'outline'}
            size="icon"
            className="size-8"
          >
            <Link
              href={hrefFor(page)}
              aria-label={`${page}페이지`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Link>
          </Button>
        ))}
        {hasNext ? (
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={hrefFor(currentPage + 1)} aria-label="다음 페이지">
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled
            aria-label="다음 페이지"
          >
            <ChevronRight aria-hidden />
          </Button>
        )}
      </nav>
    </div>
  )
}
