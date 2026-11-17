import type { Metadata } from 'next'
import Link from 'next/link'
import { FileX, SearchX, TriangleAlert } from 'lucide-react'

import { FilterPanel } from '@/components/admin/filter-panel'
import { InvoicePagination } from '@/components/admin/invoice-pagination'
import { InvoiceTable } from '@/components/admin/invoice-table'
import { ListState } from '@/components/admin/list-state'
import { SearchBar } from '@/components/admin/search-bar'
import { Button } from '@/components/ui/button'
import { requireAdminSession } from '@/lib/auth/admin-guard'
import { getInvoiceSummaries } from '@/lib/invoice-list-service'
import {
  buildInvoiceListHref,
  filterInvoices,
  hasActiveFilters,
  INVOICE_LIST_PATH,
  paginate,
  parseInvoiceListQuery,
  sortInvoices,
  type InvoiceListQuery,
  type RawSearchParams,
} from '@/lib/invoice-list-query'
import type { InvoiceSummary } from '@/types/invoice-list'

export const metadata: Metadata = { title: '견적서 목록' }

interface AdminInvoicesPageProps {
  searchParams: Promise<RawSearchParams>
}

// 관리자 견적서 목록 (검색, 필터, 정렬, 페이지네이션)
// 모든 상태는 URL 쿼리: ?q=검색어&status=승인&from=2026-11-01&to=2026-11-30&sort=issuedAt&order=desc&page=2
export default async function AdminInvoicesPage({
  searchParams,
}: AdminInvoicesPageProps) {
  // 레이아웃은 이동 시 재실행되지 않으므로 데이터를 읽기 전에 페이지에서도 세션 확인
  await requireAdminSession()

  const query = parseInvoiceListQuery(await searchParams)
  const result = await getInvoiceSummaries()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">견적서 목록</h1>
      {!result.ok ? (
        <ListState
          icon={TriangleAlert}
          tone="destructive"
          title="견적서 목록을 불러오지 못했습니다"
          description="일시적인 오류일 수 있습니다. 잠시 후 페이지를 새로고침해 주세요."
        />
      ) : result.invoices.length === 0 ? (
        <ListState
          icon={FileX}
          title="등록된 견적서가 없습니다"
          description="노션 견적서 데이터베이스에 견적서를 추가하면 여기에 표시됩니다."
        />
      ) : (
        <InvoiceListContent invoices={result.invoices} query={query} />
      )}
    </div>
  )
}

interface InvoiceListContentProps {
  invoices: InvoiceSummary[]
  query: InvoiceListQuery
}

// 필터 → 정렬 → 페이지 분할 후 검색창, 필터, 표, 페이지네이션 렌더링
function InvoiceListContent({ invoices, query }: InvoiceListContentProps) {
  const filtered = filterInvoices(invoices, query)
  const sorted = sortInvoices(filtered, query.sort, query.order)
  const paged = paginate(sorted, query.page)
  // 페이지가 범위를 벗어났다면 보정된 값으로 링크를 만듦
  const currentQuery = { ...query, page: paged.page }

  return (
    <>
      <div className="space-y-3">
        <SearchBar
          initialQuery={query.q}
          basePath={INVOICE_LIST_PATH}
          placeholder="클라이언트명, 견적서 번호 검색"
          label="견적서 검색"
        />
        <FilterPanel query={query} />
      </div>
      {filtered.length === 0 ? (
        <ListState
          icon={SearchX}
          title="검색 결과 없음"
          description={
            hasActiveFilters(query)
              ? '조건에 맞는 견적서가 없습니다. 검색어나 필터를 바꿔 보세요.'
              : '표시할 견적서가 없습니다.'
          }
        >
          <Button asChild variant="outline" size="sm">
            <Link href={INVOICE_LIST_PATH}>필터 초기화</Link>
          </Button>
        </ListState>
      ) : (
        <>
          <InvoiceTable invoices={paged.items} query={currentQuery} />
          <InvoicePagination
            page={paged.page}
            getHref={page => buildInvoiceListHref({ ...currentQuery, page })}
            totalPages={paged.totalPages}
            totalCount={paged.totalCount}
          />
        </>
      )}
    </>
  )
}
