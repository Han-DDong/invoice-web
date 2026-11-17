import { z } from 'zod'

import type { ClientSummary } from '@/lib/client-summary'
import {
  firstParam,
  INVOICE_SEARCH_MAX_LENGTH,
  INVOICE_SORT_ORDERS,
  type InvoiceSortOrder,
  type RawSearchParams,
} from '@/lib/invoice-list-query'

// 관리자 클라이언트 목록의 URL 쿼리 파싱, 검색, 정렬 (순수 함수)
// 페이지 분할은 lib/invoice-list-query.ts의 paginate를 그대로 씁니다.

/** 정렬 가능한 컬럼 */
export const CLIENT_SORT_KEYS = [
  'name',
  'invoiceCount',
  'totalAmount',
  'approvedCount',
  'latestIssuedAt',
] as const
export type ClientSortKey = (typeof CLIENT_SORT_KEYS)[number]

/** 클라이언트 목록 쿼리 */
export interface ClientListQuery {
  page: number
  sort: ClientSortKey
  order: InvoiceSortOrder
  /** 클라이언트명 검색어 (부분 일치). 없으면 빈 문자열 */
  q: string
}

/** 기본값: 최근 발행일 순 */
export const DEFAULT_CLIENT_LIST_QUERY: ClientListQuery = {
  page: 1,
  sort: 'latestIssuedAt',
  order: 'desc',
  q: '',
}

export const CLIENT_LIST_PATH = '/admin/clients'

const pageSchema = z
  .string()
  .regex(/^\d{1,6}$/)
  .transform(Number)
  .pipe(z.number().int().min(1))
  .catch(1)
const sortSchema = z
  .enum(CLIENT_SORT_KEYS)
  .catch(DEFAULT_CLIENT_LIST_QUERY.sort)
const orderSchema = z
  .enum(INVOICE_SORT_ORDERS)
  .catch(DEFAULT_CLIENT_LIST_QUERY.order)
const qSchema = z
  .string()
  .transform(value => value.trim().slice(0, INVOICE_SEARCH_MAX_LENGTH))
  .catch('')

/** searchParams를 클라이언트 목록 쿼리로 변환합니다. 잘못된 값은 기본값입니다. */
export function parseClientListQuery(raw: RawSearchParams): ClientListQuery {
  return {
    page: pageSchema.parse(firstParam(raw.page) ?? ''),
    sort: sortSchema.parse(firstParam(raw.sort)),
    order: orderSchema.parse(firstParam(raw.order)),
    q: qSchema.parse(firstParam(raw.q) ?? ''),
  }
}

/** 클라이언트명 부분 일치 검색 (대소문자, 앞뒤 공백 무시, 특수문자는 문자 그대로) */
export function filterClients(
  clients: readonly ClientSummary[],
  q: string
): ClientSummary[] {
  const needle = q.trim().toLowerCase()
  return needle === ''
    ? [...clients]
    : clients.filter(client => client.name.toLowerCase().includes(needle))
}

function compare(a: ClientSummary, b: ClientSummary, sort: ClientSortKey) {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name, 'ko')
    case 'invoiceCount':
      return a.invoiceCount - b.invoiceCount
    case 'totalAmount':
      return a.totalAmount - b.totalAmount
    case 'approvedCount':
      return a.approvedCount - b.approvedCount
    case 'latestIssuedAt':
      return a.latestIssuedAt < b.latestIssuedAt
        ? -1
        : a.latestIssuedAt > b.latestIssuedAt
          ? 1
          : 0
  }
}

/** 정렬한 새 배열 (값이 같으면 이름순으로 안정 정렬) */
export function sortClients(
  clients: readonly ClientSummary[],
  sort: ClientSortKey,
  order: InvoiceSortOrder
): ClientSummary[] {
  const direction = order === 'asc' ? 1 : -1
  return [...clients].sort(
    (a, b) => compare(a, b, sort) * direction || compare(a, b, 'name')
  )
}

/** 쿼리를 클라이언트 목록 URL로 만듭니다. (기본값은 생략) */
export function buildClientListHref(query: ClientListQuery): string {
  const params = new URLSearchParams()
  if (query.q !== '') params.set('q', query.q)
  if (query.sort !== DEFAULT_CLIENT_LIST_QUERY.sort)
    params.set('sort', query.sort)
  if (query.order !== DEFAULT_CLIENT_LIST_QUERY.order)
    params.set('order', query.order)
  if (query.page > 1) params.set('page', String(query.page))
  const text = params.toString()
  return text ? `${CLIENT_LIST_PATH}?${text}` : CLIENT_LIST_PATH
}

/** 정렬 컬럼 클릭: 같은 컬럼이면 방향 반전, 아니면 오름차순, 항상 1페이지 */
export function toggleClientSort(
  query: ClientListQuery,
  sort: ClientSortKey
): ClientListQuery {
  const order: InvoiceSortOrder =
    query.sort === sort && query.order === 'asc' ? 'desc' : 'asc'
  return { ...query, sort, order, page: 1 }
}

/** 클라이언트의 견적서 목록 링크 (/admin/invoices?q=클라이언트명) */
export function buildClientInvoicesHref(name: string): string {
  return `/admin/invoices?${new URLSearchParams({ q: name }).toString()}`
}
