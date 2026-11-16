import 'server-only'

import {
  APIErrorCode,
  ClientErrorCode,
  isNotionClientError,
} from '@notionhq/client'

import { getServerEnv } from '@/lib/env'
import { getNotionClient } from '@/lib/notion'
import { parseNotionInvoice, parseNotionItems } from '@/lib/notion-parser'
import type { Invoice } from '@/types/invoice'
import type { InvoiceFetchError } from '@/types/invoice-error'
import { NOTION_ITEM_PROPERTIES } from '@/types/notion'

// 노션 견적서 단건 조회 서비스 (서버 전용, F001)
// 실패 원인은 InvoiceFetchError로 구분해 반환하고, 원문은 서버 로그에만 남깁니다.

/** 견적서 조회 결과 */
export type InvoiceResult =
  { ok: true; invoice: Invoice } | { ok: false; error: InvoiceFetchError }

/** 항목 조회 1회당 최대 개수 (노션 최대값) */
const ITEM_PAGE_SIZE = 100

/** 조회 단계 (로그와 오류 매핑에 사용) */
type FetchStage = 'page' | 'items'

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

/** 서버 로그에 실패 원인을 남깁니다. (화면 / 반환값에는 원문을 넣지 않음) */
function logFetchError(stage: FetchStage, error: unknown): void {
  if (isNotionClientError(error)) {
    console.error(
      `[invoice-service] 노션 조회 실패 (${stage}): ${error.code}`,
      error
    )
    return
  }
  console.error(`[invoice-service] 노션 조회 실패 (${stage})`, error)
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
 * 노션 페이지 ID로 견적서와 항목을 조회해 Invoice로 변환합니다.
 * 반환값에는 노션 응답 원문, API 키, DB ID를 포함하지 않습니다.
 */
export async function getInvoiceByPageId(
  pageId: string
): Promise<InvoiceResult> {
  // 노션 ID 형식이 아니면 API를 호출하지 않고 바로 not_found
  if (!isNotionId(pageId)) {
    return { ok: false, error: { kind: 'not_found' } }
  }

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
    logFetchError('page', error)
    return { ok: false, error: toFetchError(error, 'page') }
  }

  let itemPages: unknown[]
  try {
    itemPages = await fetchItemPages(pageId)
  } catch (error) {
    logFetchError('items', error)
    return { ok: false, error: toFetchError(error, 'items') }
  }

  const items = parseNotionItems(itemPages)
  if (!items.ok) {
    console.error('[invoice-service] 항목 검증 실패', items.issues)
    return {
      ok: false,
      error: { kind: 'validation_failed', issues: items.issues },
    }
  }

  const invoice = parseNotionInvoice(page, items.data)
  if (!invoice.ok) {
    console.error('[invoice-service] 견적서 검증 실패', invoice.issues)
    return {
      ok: false,
      error: { kind: 'validation_failed', issues: invoice.issues },
    }
  }

  return { ok: true, invoice: invoice.data }
}
