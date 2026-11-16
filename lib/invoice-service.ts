import 'server-only'

import { createHash } from 'node:crypto'

import {
  APIErrorCode,
  ClientErrorCode,
  isNotionClientError,
} from '@notionhq/client'
import { unstable_cache } from 'next/cache'

import { getServerEnv } from '@/lib/env'
import { logServerError } from '@/lib/logger'
import { getNotionClient } from '@/lib/notion'
import { parseNotionInvoice, parseNotionItems } from '@/lib/notion-parser'
import type { Invoice } from '@/types/invoice'
import type { InvoiceFetchError } from '@/types/invoice-error'
import { NOTION_ITEM_PROPERTIES } from '@/types/notion'

// 노션 견적서 단건 조회 서비스 (서버 전용, F001)
// 실패 원인은 InvoiceFetchError로 구분해 반환하고, 원문은 서버 로그에만 남깁니다.
// 조회 성공 결과만 unstable_cache로 짧게 캐시합니다. (Task 010-A)

/** 견적서 조회 결과 */
export type InvoiceResult =
  { ok: true; invoice: Invoice } | { ok: false; error: InvoiceFetchError }

/**
 * 견적서 캐시 TTL (초)
 * 노션에서 고친 내용(금액, 유효기간, 휴지통 이동)은 최대 이 시간만큼 늦게 반영됩니다.
 */
export const INVOICE_CACHE_TTL_SECONDS = 30

/** 항목 조회 1회당 최대 개수 (노션 최대값) */
const ITEM_PAGE_SIZE = 100

/** 조회 단계 (로그와 오류 매핑에 사용) */
type FetchStage = 'page' | 'items' | 'cache'

/** 노션 ID 비교용 정규화 (대시 제거, 소문자) */
function normalizeNotionId(id: string): string {
  return id.replace(/-/g, '').toLowerCase()
}

/** 노션 페이지 ID 형식 (대시 제거 후 32자리 16진수) */
function isNotionId(id: string): boolean {
  return /^[0-9a-f]{32}$/.test(normalizeNotionId(id))
}

/** unknown 값이 객체인지 확인합니다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * 페이지가 견적서 데이터베이스에 속하는지 확인합니다.
 * 환경변수에는 database ID를 넣으므로 parent.database_id와 비교합니다.
 * 통합에 연결된 다른 DB의 페이지 ID로 조회하는 것을 막습니다.
 */
function belongsToDatabase(page: unknown, databaseId: string): boolean {
  if (!isRecord(page) || !isRecord(page.parent)) {
    return false
  }

  const { parent } = page
  return (
    typeof parent.database_id === 'string' &&
    normalizeNotionId(parent.database_id) === normalizeNotionId(databaseId)
  )
}

/** 항목 DB의 data source ID 캐시 (database ID로 1회만 조회) */
let itemDataSourceIdPromise: Promise<string> | null = null

/**
 * 항목 database ID로 data source ID를 찾아 반환합니다.
 * dataSources.query는 data source ID가 필요하기 때문입니다.
 */
function resolveItemDataSourceId(databaseId: string): Promise<string> {
  if (!itemDataSourceIdPromise) {
    itemDataSourceIdPromise = getNotionClient()
      .databases.retrieve({ database_id: databaseId })
      .then(database => {
        // 부분 응답(PartialDatabaseObjectResponse)에는 data_sources가 없으므로 타입을 좁혀 확인
        const dataSource =
          'data_sources' in database ? database.data_sources[0] : undefined
        if (!dataSource) {
          throw new Error(
            '항목 데이터베이스에서 data source를 찾지 못했습니다.'
          )
        }
        return dataSource.id
      })
      .catch((error: unknown) => {
        // 실패한 결과는 캐시하지 않고 다음 요청에서 다시 시도
        itemDataSourceIdPromise = null
        throw error
      })
  }
  return itemDataSourceIdPromise
}

/** 휴지통 / 보관된 페이지인지 확인합니다. (공유 링크에서는 존재하지 않는 것으로 처리) */
function isTrashed(page: unknown): boolean {
  if (!isRecord(page)) {
    return false
  }
  return (
    page.in_trash === true ||
    page.archived === true ||
    page.is_archived === true
  )
}

/**
 * 노션 SDK 오류를 InvoiceFetchError로 변환합니다.
 * 페이지 조회 단계의 object_not_found / 잘못된 ID는 not_found, 그 외는 query_failed입니다.
 */
function toFetchError(error: unknown, stage: FetchStage): InvoiceFetchError {
  if (stage === 'page' && isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.ObjectNotFound:
      case APIErrorCode.ValidationError:
      case ClientErrorCode.InvalidPathParameter:
        return { kind: 'not_found' }
      default:
        break
    }
  }

  return { kind: 'query_failed', cause: error }
}

/**
 * 서버 로그에 실패 원인을 남깁니다. (화면 / 반환값에는 원문을 넣지 않음)
 * code, status, 단계, 토큰 앞 6자만 기록합니다. (lib/logger.ts)
 */
function logFetchError(
  stage: FetchStage,
  error: unknown,
  pageId: string
): void {
  logServerError({
    scope: 'invoice-service',
    stage,
    event: '노션 조회 실패',
    token: pageId,
    error,
  })
}

/** 견적서 페이지에 연결된 항목을 created_time 오름차순으로 모두 조회합니다. */
async function fetchItemPages(invoicePageId: string): Promise<unknown[]> {
  const notion = getNotionClient()
  // 환경변수 값은 항목 database ID이며, 조회에는 data source ID를 사용
  const itemDataSourceId = await resolveItemDataSourceId(
    getServerEnv().NOTION_ITEM_DATABASE_ID
  )
  const pages: unknown[] = []
  let cursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: itemDataSourceId,
      filter: {
        property: NOTION_ITEM_PROPERTIES.invoice,
        relation: { contains: invoicePageId },
      },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
      start_cursor: cursor,
      page_size: ITEM_PAGE_SIZE,
    })

    // 데이터 소스 객체가 섞여 있을 수 있으므로 페이지만 수집
    pages.push(...response.results.filter(result => result.object === 'page'))
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages
}

/**
 * 노션에서 견적서와 항목을 직접 조회해 Invoice로 변환합니다. (캐시 없음)
 * 반환값에는 노션 응답 원문, API 키, DB ID를 포함하지 않습니다.
 */
async function fetchInvoiceFromNotion(pageId: string): Promise<InvoiceResult> {
  let page: unknown
  try {
    const { NOTION_INVOICE_DATABASE_ID } = getServerEnv()
    page = await getNotionClient().pages.retrieve({ page_id: pageId })

    if (
      !belongsToDatabase(page, NOTION_INVOICE_DATABASE_ID) ||
      isTrashed(page)
    ) {
      return { ok: false, error: { kind: 'not_found' } }
    }
  } catch (error) {
    logFetchError('page', error, pageId)
    return { ok: false, error: toFetchError(error, 'page') }
  }

  let itemPages: unknown[]
  try {
    itemPages = await fetchItemPages(pageId)
  } catch (error) {
    logFetchError('items', error, pageId)
    return { ok: false, error: toFetchError(error, 'items') }
  }

  const items = parseNotionItems(itemPages)
  if (!items.ok) {
    logServerError({
      scope: 'invoice-service',
      stage: 'validation',
      event: '항목 검증 실패',
      token: pageId,
      issues: items.issues,
    })
    return {
      ok: false,
      error: { kind: 'validation_failed', issues: items.issues },
    }
  }

  const invoice = parseNotionInvoice(page, items.data)
  if (!invoice.ok) {
    logServerError({
      scope: 'invoice-service',
      stage: 'validation',
      event: '견적서 검증 실패',
      token: pageId,
      issues: invoice.issues,
    })
    return {
      ok: false,
      error: { kind: 'validation_failed', issues: invoice.issues },
    }
  }

  return { ok: true, invoice: invoice.data }
}

/** 캐시에 저장하는 값 (조회 성공 결과만 저장) */
interface CachedInvoice {
  invoice: Invoice
  /** 노션에서 조회한 시각 (밀리초) */
  fetchedAt: number
}

/**
 * 캐시 함수 안에서 실패를 캐시하지 않도록 던지는 예외입니다.
 * unstable_cache는 예외를 저장하지 않으므로 실패는 다음 요청에서 다시 조회됩니다.
 * 원인은 private 필드에 둬서 Next.js가 이 예외를 로그로 출력해도 노션 오류 원문이 나오지 않게 합니다.
 */
class UncachedFetchFailure extends Error {
  readonly #fetchError: InvoiceFetchError

  constructor(fetchError: InvoiceFetchError) {
    super(`견적서 조회 실패 (${fetchError.kind})`)
    this.name = 'UncachedFetchFailure'
    this.#fetchError = fetchError
  }

  get fetchError(): InvoiceFetchError {
    return this.#fetchError
  }
}

/** 노션에서 조회하고, 실패하면 예외를 던져 캐시에 남지 않게 합니다. */
async function fetchInvoiceForCache(pageId: string): Promise<CachedInvoice> {
  const result = await fetchInvoiceFromNotion(pageId)
  if (!result.ok) {
    throw new UncachedFetchFailure(result.error)
  }
  return { invoice: result.invoice, fetchedAt: Date.now() }
}

/**
 * 캐시 키용 페이지 ID 해시입니다.
 * Next.js는 백그라운드 갱신 실패 시 캐시 키를 로그에 출력하므로 전체 토큰 대신 해시를 씁니다.
 */
function toCacheKey(pageId: string): string {
  return createHash('sha256').update(pageId).digest('hex')
}

/**
 * 노션 페이지 ID로 견적서를 조회합니다. 성공 결과는 INVOICE_CACHE_TTL_SECONDS 동안 캐시합니다.
 * not_found / query_failed / validation_failed는 캐시하지 않습니다.
 * 토큰 형식 검증과 만료 판정은 호출하는 쪽(getAccessibleInvoice)에서 매 요청 수행합니다.
 */
export async function getInvoiceByPageId(
  pageId: string
): Promise<InvoiceResult> {
  // 노션 ID 형식이 아니면 캐시와 API를 거치지 않고 바로 not_found
  if (!isNotionId(pageId)) {
    return { ok: false, error: { kind: 'not_found' } }
  }

  const normalizedId = normalizeNotionId(pageId)

  try {
    const cached = await unstable_cache(
      () => fetchInvoiceForCache(normalizedId),
      ['invoice', toCacheKey(normalizedId)],
      { revalidate: INVOICE_CACHE_TTL_SECONDS }
    )()

    // unstable_cache는 TTL이 지난 값을 먼저 돌려주고 백그라운드에서 갱신하며,
    // 갱신이 실패하면(휴지통 이동 등) 지난 값을 계속 돌려줍니다.
    // TTL을 넘긴 값은 쓰지 않고 직접 다시 조회해 삭제와 수정이 TTL 안에 반영되게 합니다.
    if (Date.now() - cached.fetchedAt <= INVOICE_CACHE_TTL_SECONDS * 1000) {
      return { ok: true, invoice: cached.invoice }
    }
    return await fetchInvoiceFromNotion(normalizedId)
  } catch (error) {
    if (error instanceof UncachedFetchFailure) {
      return { ok: false, error: error.fetchError }
    }
    // 캐시 계층 자체의 예상하지 못한 오류도 조회 실패로 처리 (원문은 응답에 넣지 않음)
    logFetchError('cache', error, normalizedId)
    return { ok: false, error: { kind: 'query_failed', cause: error } }
  }
}
