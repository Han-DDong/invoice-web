'use client'

import { useState } from 'react'
import { ListFilter, RotateCcw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  buildInvoiceListHref,
  hasActiveFilters,
  parseInvoiceListQuery,
  withFilterChange,
  type InvoiceListQuery,
} from '@/lib/invoice-list-query'
import { cn } from '@/lib/utils'
import { INVOICE_STATUSES } from '@/types/invoice'

interface FilterPanelProps {
  /** 서버에서 파싱한 현재 쿼리 (입력의 초기값과 적용 개수 표시에 사용) */
  query: InvoiceListQuery
}

/** 적용 중인 필터 개수 (검색어 포함) */
function countActiveFilters(query: InvoiceListQuery): number {
  return [query.q !== '', query.status !== null, query.from, query.to].filter(
    Boolean
  ).length
}

// 필터 패널: 상태, 발행일 범위, 초기화. 모든 변경은 URL 쿼리로 반영하고 1페이지로 돌립니다.
// 모바일(md 미만)에서는 접어 두고, 필터가 적용 중이면 처음부터 펼칩니다.
export function FilterPanel({ query }: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(() => hasActiveFilters(query))
  const activeCount = countActiveFilters(query)

  function update(patch: Parameters<typeof withFilterChange>[1]) {
    // 다른 값은 현재 URL 기준으로 유지 (검색어 입력과 동시에 바뀌어도 덮어쓰지 않음)
    const current = parseInvoiceListQuery(
      Object.fromEntries(searchParams.entries())
    )
    router.replace(buildInvoiceListHref(withFilterChange(current, patch)))
  }

  function reset() {
    update({ q: '', status: null, from: null, to: null })
  }

  // URL이 바뀌면 key가 바뀌어 입력이 새 값으로 다시 그려집니다. (초기화 포함)
  const inputKey = `${query.status}|${query.from}|${query.to}`

  return (
    <section aria-label="필터" className="space-y-3">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls="invoice-filter-fields"
          onClick={() => setOpen(prev => !prev)}
        >
          <ListFilter aria-hidden />
          필터{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </div>

      <div
        id="invoice-filter-fields"
        className={cn(
          'flex-col gap-3 rounded-xl border bg-card p-4 md:flex md:flex-row md:flex-wrap md:items-end',
          open ? 'flex' : 'hidden'
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="filter-status">상태</Label>
          <select
            key={`status-${inputKey}`}
            id="filter-status"
            defaultValue={query.status ?? ''}
            onChange={event =>
              update({
                status:
                  INVOICE_STATUSES.find(
                    status => status === event.target.value
                  ) ?? null,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-36 dark:bg-input/30"
          >
            <option value="">전체</option>
            {INVOICE_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-from">발행일 (시작)</Label>
          <Input
            key={`from-${inputKey}`}
            id="filter-from"
            type="date"
            defaultValue={query.from ?? ''}
            max={query.to ?? undefined}
            onChange={event => update({ from: event.target.value || null })}
            className="md:w-44"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-to">발행일 (종료)</Label>
          <Input
            key={`to-${inputKey}`}
            id="filter-to"
            type="date"
            defaultValue={query.to ?? ''}
            min={query.from ?? undefined}
            onChange={event => update({ to: event.target.value || null })}
            className="md:w-44"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={activeCount === 0}
          className="md:ml-auto"
        >
          <RotateCcw aria-hidden />
          초기화
        </Button>
      </div>
    </section>
  )
}
