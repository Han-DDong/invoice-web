import { z } from 'zod'

import { INVOICE_STATUSES, type InvoiceStatus } from '@/types/invoice'
import type { InvoiceSummary } from '@/types/invoice-list'

// 관리자 견적서 목록의 URL 쿼리 파싱, 필터, 정렬, 페이지 분할 (Phase 5, Task 014-B, 015-A)
// 적용 순서는 필터 → 정렬 → 페이지 분할입니다.
// 노션, 환경변수에 의존하지 않는 순수 함수만 둡니다. 모든 목록 상태는 URL 쿼리로만 관리합니다.

/** 한 페이지에 보여줄 개수 */
export const INVOICE_LIST_PAGE_SIZE = 10

/** 정렬 가능한 컬럼 */
export const INVOICE_SORT_KEYS = [
  'invoiceNumber',
  'clientName',
  'issuedAt',
  'status',
  'totalAmount',
] as const
export type InvoiceSortKey = (typeof INVOICE_SORT_KEYS)[number]

/** 정렬 방향 */
export const INVOICE_SORT_ORDERS = ['asc', 'desc'] as const
export type InvoiceSortOrder = (typeof INVOICE_SORT_ORDERS)[number]

/** 검색어 최대 길이 (URL로 들어온 값이 지나치게 길어지는 것을 방지) */
export const INVOICE_SEARCH_MAX_LENGTH = 100

/** 목록 쿼리 (파싱이 끝난 안전한 값) */
export interface InvoiceListQuery {
  /** 1부터 시작하는 페이지 번호 */
  page: number
  sort: InvoiceSortKey
  order: InvoiceSortOrder
  /** 검색어 (클라이언트명, 견적서 번호 부분 일치). 없으면 빈 문자열 */
  q: string
  /** 상태 필터. 없으면 null */
  status: InvoiceStatus | null
  /** 발행일 시작 (KST YYYY-MM-DD, 포함). 없으면 null */
  from: string | null
  /** 발행일 끝 (KST YYYY-MM-DD, 포함). 없으면 null */
  to: string | null
}

/** 쿼리 기본값: 발행일 최신순, 필터 없음 */
export const DEFAULT_INVOICE_LIST_QUERY: InvoiceListQuery = {
  page: 1,
  sort: 'issuedAt',
  order: 'desc',
  q: '',
  status: null,
  from: null,
  to: null,
}

/** Next.js searchParams 원본 형태 */
export type RawSearchParams = Record<string, string | string[] | undefined>

/** 같은 키가 여러 번 오면 첫 값만 사용합니다. */
export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

// 잘못된 값은 오류 대신 기본값으로 대체합니다. (URL은 사용자가 직접 고칠 수 있음)
const pageSchema = z
  .string()
  .regex(/^\d{1,6}$/)
  .transform(Number)
  .pipe(z.number().int().min(1))
  .catch(DEFAULT_INVOICE_LIST_QUERY.page)
const sortSchema = z
  .enum(INVOICE_SORT_KEYS)
  .catch(DEFAULT_INVOICE_LIST_QUERY.sort)
const orderSchema = z
  .enum(INVOICE_SORT_ORDERS)
  .catch(DEFAULT_INVOICE_LIST_QUERY.order)

const qSchema = z
  .string()
  .transform(value => value.trim().slice(0, INVOICE_SEARCH_MAX_LENGTH))
  .catch('')
const statusSchema = z.enum(INVOICE_STATUSES).nullable().catch(null)

/** YYYY-MM-DD 형식이면서 실제로 존재하는 날짜인지 확인합니다. (2026-02-30 같은 값 거부) */
function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

const dateSchema = z.string().refine(isValidDateOnly).nullable().catch(null)

/** searchParams를 목록 쿼리로 변환합니다. 잘못되거나 없는 값은 기본값입니다. */
export function parseInvoiceListQuery(raw: RawSearchParams): InvoiceListQuery {
  const from = dateSchema.parse(firstParam(raw.from) ?? null)
  const to = dateSchema.parse(firstParam(raw.to) ?? null)
  // 시작일이 끝일보다 늦으면 범위가 성립하지 않으므로 두 값 모두 무시
  const rangeValid = from === null || to === null || from <= to

  return {
    page: pageSchema.parse(firstParam(raw.page) ?? ''),
    sort: sortSchema.parse(firstParam(raw.sort)),
    order: orderSchema.parse(firstParam(raw.order)),
    q: qSchema.parse(firstParam(raw.q) ?? ''),
    status: statusSchema.parse(firstParam(raw.status) ?? null),
    from: rangeValid ? from : null,
    to: rangeValid ? to : null,
  }
}

/** 검색어, 상태, 날짜 필터 중 하나라도 적용 중인지 */
export function hasActiveFilters(query: InvoiceListQuery): boolean {
  return (
    query.q !== '' ||
    query.status !== null ||
    query.from !== null ||
    query.to !== null
  )
}

/**
 * 필터를 적용한 새 배열을 반환합니다. (원본 유지)
 * - q: 클라이언트명 또는 견적서 번호에 부분 일치 (대소문자 무시, 앞뒤 공백 무시, 특수문자는 문자 그대로)
 * - status: 정확히 일치
 * - from/to: 발행일이 범위 안 (양 끝 날짜 포함)
 */
export function filterInvoices(
  invoices: readonly InvoiceSummary[],
  query: Pick<InvoiceListQuery, 'q' | 'status' | 'from' | 'to'>
): InvoiceSummary[] {
  const needle = query.q.trim().toLowerCase()
  const { status, from, to } = query

  return invoices.filter(invoice => {
    if (status !== null && invoice.status !== status) {
      return false
    }
    // YYYY-MM-DD 문자열은 사전순이 날짜순
    if (from !== null && invoice.issuedAt < from) {
      return false
    }
    if (to !== null && invoice.issuedAt > to) {
      return false
    }
    if (needle === '') {
      return true
    }
    return (
      invoice.invoiceNumber.toLowerCase().includes(needle) ||
      invoice.clientName.toLowerCase().includes(needle)
    )
  })
}

/** 필터를 바꾼 새 쿼리: 결과 범위가 달라지므로 항상 1페이지로 돌립니다. */
export function withFilterChange(
  query: InvoiceListQuery,
  patch: Partial<Pick<InvoiceListQuery, 'q' | 'status' | 'from' | 'to'>>
): InvoiceListQuery {
  return { ...query, ...patch, page: 1 }
}

/** 상태 정렬 순서 (대기 → 승인 → 거절) */
const STATUS_RANK = new Map<string, number>(
  INVOICE_STATUSES.map((status, index) => [status, index])
)

/** 정렬 키별 오름차순 비교 */
function compareByKey(
  a: InvoiceSummary,
  b: InvoiceSummary,
  sort: InvoiceSortKey
): number {
  switch (sort) {
    case 'invoiceNumber':
      return a.invoiceNumber.localeCompare(b.invoiceNumber, 'ko', {
        numeric: true,
      })
    case 'clientName':
      return a.clientName.localeCompare(b.clientName, 'ko')
    case 'issuedAt':
      // YYYY-MM-DD 문자열은 사전순이 날짜순
      return a.issuedAt < b.issuedAt ? -1 : a.issuedAt > b.issuedAt ? 1 : 0
    case 'status':
      return (STATUS_RANK.get(a.status) ?? 0) - (STATUS_RANK.get(b.status) ?? 0)
    case 'totalAmount':
      return a.totalAmount - b.totalAmount
  }
}

/**
 * 목록을 정렬한 새 배열을 반환합니다. (원본 유지)
 * 값이 같으면 견적서 번호, ID 순으로 정해 페이지가 바뀌어도 순서가 흔들리지 않게 합니다.
 */
export function sortInvoices(
  invoices: readonly InvoiceSummary[],
  sort: InvoiceSortKey,
  order: InvoiceSortOrder
): InvoiceSummary[] {
  const direction = order === 'asc' ? 1 : -1
  return [...invoices].sort((a, b) => {
    const primary = compareByKey(a, b, sort) * direction
    if (primary !== 0) {
      return primary
    }
    return (
      compareByKey(a, b, 'invoiceNumber') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
  })
}

/** 페이지 분할 결과 */
export interface Paginated<T> {
  items: T[]
  /** 범위를 보정한 현재 페이지 (1 이상, totalPages 이하) */
  page: number
  totalPages: number
  totalCount: number
}

/** 배열을 pageSize 단위로 나눠 해당 페이지를 반환합니다. 범위를 벗어난 페이지는 가까운 끝 페이지로 보정합니다. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number = INVOICE_LIST_PAGE_SIZE
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (current - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    totalCount: items.length,
  }
}

/** 목록 페이지 경로 */
export const INVOICE_LIST_PATH = '/admin/invoices'

/** 쿼리를 목록 URL로 만듭니다. 기본값과 같은 항목은 생략해 URL을 짧게 유지합니다. */
export function buildInvoiceListHref(query: InvoiceListQuery): string {
  const params = new URLSearchParams()
  if (query.sort !== DEFAULT_INVOICE_LIST_QUERY.sort) {
    params.set('sort', query.sort)
  }
  if (query.order !== DEFAULT_INVOICE_LIST_QUERY.order) {
    params.set('order', query.order)
  }
  if (query.q !== '') {
    params.set('q', query.q)
  }
  if (query.status !== null) {
    params.set('status', query.status)
  }
  if (query.from !== null) {
    params.set('from', query.from)
  }
  if (query.to !== null) {
    params.set('to', query.to)
  }
  if (query.page > 1) {
    params.set('page', String(query.page))
  }
  const text = params.toString()
  return text ? `${INVOICE_LIST_PATH}?${text}` : INVOICE_LIST_PATH
}

/** 정렬 컬럼을 눌렀을 때의 다음 쿼리: 같은 컬럼이면 방향 반전, 다른 컬럼이면 오름차순, 항상 1페이지로 */
export function toggleSort(
  query: InvoiceListQuery,
  sort: InvoiceSortKey
): InvoiceListQuery {
  const order: InvoiceSortOrder =
    query.sort === sort && query.order === 'asc' ? 'desc' : 'asc'
  return { ...query, sort, order, page: 1 }
}

/**
 * 견적서 상세 URL을 만듭니다. 목록 쿼리(검색, 정렬, 페이지 등)를 같은 쿼리 문자열로 붙여,
 * 상세의 "목록으로" 링크가 보던 목록 상태로 돌아가게 합니다. (값은 상세에서 다시 파싱해 검증)
 */
export function buildInvoiceDetailHref(
  id: string,
  listQuery?: InvoiceListQuery
): string {
  const path = `${INVOICE_LIST_PATH}/${encodeURIComponent(id)}`
  if (!listQuery) {
    return path
  }
  const search = buildInvoiceListHref(listQuery).split('?')[1]
  return search ? `${path}?${search}` : path
}
