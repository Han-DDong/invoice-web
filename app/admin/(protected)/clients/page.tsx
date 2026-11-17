import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX, TriangleAlert, Users } from 'lucide-react'

import { ClientTable } from '@/components/admin/client-table'
import { InvoicePagination } from '@/components/admin/invoice-pagination'
import { ListState } from '@/components/admin/list-state'
import { SearchBar } from '@/components/admin/search-bar'
import { Button } from '@/components/ui/button'
import { requireAdminSession } from '@/lib/auth/admin-guard'
import {
  buildClientListHref,
  CLIENT_LIST_PATH,
  filterClients,
  parseClientListQuery,
  sortClients,
  type ClientListQuery,
} from '@/lib/client-list-query'
import { groupClients } from '@/lib/client-summary'
import { getInvoiceSummaries } from '@/lib/invoice-list-service'
import { paginate, type RawSearchParams } from '@/lib/invoice-list-query'
import type { InvoiceSummary } from '@/types/invoice-list'

export const metadata: Metadata = { title: '클라이언트 관리' }

interface AdminClientsPageProps {
  searchParams: Promise<RawSearchParams>
}

interface ClientListContentProps {
  invoices: InvoiceSummary[]
  query: ClientListQuery
}

// 검색 → 정렬 → 페이지 분할 후 검색창, 표, 페이지네이션 렌더링
function ClientListContent({ invoices, query }: ClientListContentProps) {
  const clients = groupClients(invoices)
  const filtered = filterClients(clients, query.q)
  const paged = paginate(
    sortClients(filtered, query.sort, query.order),
    query.page
  )
  const currentQuery = { ...query, page: paged.page }

  return (
    <>
      <SearchBar
        initialQuery={query.q}
        basePath={CLIENT_LIST_PATH}
        placeholder="클라이언트명 검색"
        label="클라이언트 검색"
      />
      {filtered.length === 0 ? (
        <ListState
          icon={SearchX}
          title="검색 결과 없음"
          description="조건에 맞는 클라이언트가 없습니다. 검색어를 바꿔 보세요."
        >
          <Button asChild variant="outline" size="sm">
            <Link href={CLIENT_LIST_PATH}>검색 초기화</Link>
          </Button>
        </ListState>
      ) : (
        <>
          <ClientTable clients={paged.items} query={currentQuery} />
          <InvoicePagination
            page={paged.page}
            totalPages={paged.totalPages}
            totalCount={paged.totalCount}
            getHref={page => buildClientListHref({ ...currentQuery, page })}
          />
        </>
      )}
    </>
  )
}

// 클라이언트 관리: 별도 노션 DB 없이 견적서의 클라이언트명으로 집계 (URL 쿼리 q, sort, order, page)
export default async function AdminClientsPage({
  searchParams,
}: AdminClientsPageProps) {
  await requireAdminSession()

  const query = parseClientListQuery(await searchParams)
  const result = await getInvoiceSummaries()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">클라이언트 관리</h1>
      {!result.ok ? (
        <ListState
          icon={TriangleAlert}
          tone="destructive"
          title="클라이언트 목록을 불러오지 못했습니다"
          description="일시적인 오류일 수 있습니다. 잠시 후 페이지를 새로고침해 주세요."
        />
      ) : result.invoices.length === 0 ? (
        <ListState
          icon={Users}
          title="등록된 클라이언트가 없습니다"
          description="견적서가 등록되면 클라이언트명으로 자동 집계됩니다."
        />
      ) : (
        <ClientListContent invoices={result.invoices} query={query} />
      )}
    </div>
  )
}
