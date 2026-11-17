import 'server-only'

import { createHash } from 'node:crypto'

import { unstable_cache } from 'next/cache'

import { getServerEnv } from '@/lib/env'
import {
  INVOICE_CACHE_TTL_SECONDS,
  isRecord,
  isTrashed,
  normalizeNotionId,
  resolveDataSourceId,
} from '@/lib/invoice-service'
import { logServerError } from '@/lib/logger'
import { getNotionClient } from '@/lib/notion'
import {
  extractItemInvoiceIds,
  parseNotionInvoiceSummary,
  parseNotionItemAmount,
} from '@/lib/notion-parser'
import type { InvoiceSummary } from '@/types/invoice-list'

// 관리자 견적서 목록 조회 서비스 (서버 전용, Phase 5, Task 014-A)
// 견적서 DB 전체와 항목 DB 전체를 각각 한 번의 cursor 순회로 읽어 합계를 계산합니다. (견적서마다 항목을 조회하는 N+1 금지)
// 합계는 노션 '총 금액' 필드가 아니라 항목의 수량 x 단가 합계입니다. (부가세 없음)

/** 목록 조회 결과 (실패 원인 원문은 서버 로그에만 남깁니다.) */
export type InvoiceListResult =
  { ok: true; invoices: InvoiceSummary[] } | { ok: false }

/** 1회 조회당 최대 개수 (노션 최대값) */
const PAGE_SIZE = 100

/** 데이터 소스의 모든 페이지를 cursor로 끝까지 조회합니다. (휴지통 페이지 제외) */
async function fetchAllPages(databaseId: string): Promise<unknown[]> {
  const notion = getNotionClient()
  const dataSourceId = await resolveDataSourceId(databaseId)
  const pages: unknown[] = []
  let cursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: PAGE_SIZE,
    })

    // 데이터 소스 객체가 섞여 있을 수 있으므로 페이지만 수집하고 휴지통은 제외
    pages.push(
      ...response.results.filter(
        result => result.object === 'page' && !isTrashed(result)
      )
    )
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages
}

/** 페이지 응답에서 ID를 꺼냅니다. (로그용, 없으면 undefined) */
function readPageId(page: unknown): string | undefined {
  return isRecord(page) && typeof page.id === 'string' ? page.id : undefined
}

/**
 * 항목 페이지들에서 견적서별 합계를 계산합니다.
 * 검증에 실패한 항목은 합계를 신뢰할 수 없으므로, 그 항목이 연결된 견적서를 failedInvoiceIds에 모읍니다.
 */
function sumItemsByInvoice(itemPages: unknown[]): {
  totals: Map<string, number>
  failedInvoiceIds: Set<string>
} {
  const totals = new Map<string, number>()
  const failedInvoiceIds = new Set<string>()

  for (const page of itemPages) {
    const parsed = parseNotionItemAmount(page)
    if (parsed.ok) {
      for (const invoiceId of parsed.data.invoiceIds) {
        const key = normalizeNotionId(invoiceId)
        totals.set(key, (totals.get(key) ?? 0) + parsed.data.amount)
      }
      continue
    }

    logServerError({
      scope: 'invoice-list',
      stage: 'validation',
      event: '항목 검증 실패',
      token: readPageId(page),
      issues: parsed.issues,
    })
    for (const invoiceId of extractItemInvoiceIds(page)) {
      failedInvoiceIds.add(normalizeNotionId(invoiceId))
    }
  }

  return { totals, failedInvoiceIds }
}

/** 노션에서 견적서 요약 목록을 직접 조회합니다. (캐시 없음, 실패 시 예외) */
async function fetchInvoiceSummaries(): Promise<InvoiceSummary[]> {
  const env = getServerEnv()
  const [invoicePages, itemPages] = await Promise.all([
    fetchAllPages(env.NOTION_INVOICE_DATABASE_ID),
    fetchAllPages(env.NOTION_ITEM_DATABASE_ID),
  ])

  const { totals, failedInvoiceIds } = sumItemsByInvoice(itemPages)
  const summaries: InvoiceSummary[] = []

  for (const page of invoicePages) {
    const parsed = parseNotionInvoiceSummary(page)
    if (!parsed.ok) {
      // 한 건의 검증 실패는 목록에서만 제외하고 원인은 로그에 남김
      logServerError({
        scope: 'invoice-list',
        stage: 'validation',
        event: '견적서 검증 실패',
        token: readPageId(page),
        issues: parsed.issues,
      })
      continue
    }

    const key = normalizeNotionId(parsed.data.id)
    if (failedInvoiceIds.has(key)) {
      // 항목 중 일부를 읽지 못해 합계가 틀릴 수 있는 견적서도 제외
      continue
    }

    // 항목이 없는 견적서는 합계 0원
    summaries.push({ ...parsed.data, totalAmount: totals.get(key) ?? 0 })
  }

  return summaries
}

/** 캐시에 저장하는 값 (조회 성공 결과만 저장) */
interface CachedList {
  invoices: InvoiceSummary[]
  /** 노션에서 조회한 시각 (밀리초) */
  fetchedAt: number
}

/** 목록 캐시 키 (환경변수의 DB ID를 키에 그대로 쓰지 않도록 해시) */
function toCacheKey(): string {
  const env = getServerEnv()
  return createHash('sha256')
    .update(`${env.NOTION_INVOICE_DATABASE_ID}:${env.NOTION_ITEM_DATABASE_ID}`)
    .digest('hex')
}

/** 조회 실패를 알리는 예외 (unstable_cache가 예외를 저장하지 않으므로 실패는 캐시되지 않음) */
class UncachedListFailure extends Error {
  constructor() {
    super('견적서 목록 조회 실패')
    this.name = 'UncachedListFailure'
  }
}

async function fetchListForCache(): Promise<CachedList> {
  try {
    return { invoices: await fetchInvoiceSummaries(), fetchedAt: Date.now() }
  } catch (error) {
    logServerError({
      scope: 'invoice-list',
      stage: 'items',
      event: '노션 목록 조회 실패',
      error,
    })
    // 원인은 로그에만 남기고, 캐시 계층에는 원문 없는 예외만 전달
    throw new UncachedListFailure()
  }
}

/**
 * 관리자 견적서 목록을 조회합니다. 성공 결과만 INVOICE_CACHE_TTL_SECONDS(30초) 동안 캐시합니다.
 * 반드시 관리자 세션을 확인한 뒤 호출하세요. (이 함수는 인증을 확인하지 않습니다.)
 */
export async function getInvoiceSummaries(): Promise<InvoiceListResult> {
  try {
    const cached = await unstable_cache(
      fetchListForCache,
      ['invoice-list', toCacheKey()],
      { revalidate: INVOICE_CACHE_TTL_SECONDS }
    )()

    // TTL을 넘긴 지난 값은 쓰지 않고 직접 다시 조회 (invoice-service와 같은 정책)
    if (Date.now() - cached.fetchedAt <= INVOICE_CACHE_TTL_SECONDS * 1000) {
      return { ok: true, invoices: cached.invoices }
    }
    return { ok: true, invoices: await fetchInvoiceSummaries() }
  } catch (error) {
    if (!(error instanceof UncachedListFailure)) {
      logServerError({
        scope: 'invoice-list',
        stage: 'cache',
        event: '목록 조회 실패',
        error,
      })
    }
    return { ok: false }
  }
}
