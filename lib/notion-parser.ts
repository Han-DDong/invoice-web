import type { z } from 'zod'

import { calculateItemAmount } from '@/lib/invoice-calculations'
import type { Invoice, InvoiceItem } from '@/types/invoice'
import {
  NOTION_INVOICE_PROPERTIES,
  NOTION_ITEM_PROPERTIES,
  notionInvoicePageSchema,
  notionItemPageSchema,
  type notionDateSchema,
  type notionNumberLikeSchema,
  type notionTextLikeSchema,
  type notionTitleSchema,
} from '@/types/notion'

// 노션 응답(unknown) → 도메인 타입(Invoice / InvoiceItem) 변환 (F001)
// env, 노션 클라이언트에 의존하지 않는 순수 함수만 둡니다.

/** 변환 결과 (실패 시 필드 경로 문자열 목록만 담습니다) */
export type ParseResult<T> =
  { ok: true; data: T } | { ok: false; issues: string[] }

type NotionTitle = z.infer<typeof notionTitleSchema>
type NotionTextLike = z.infer<typeof notionTextLikeSchema>
type NotionNumberLike = z.infer<typeof notionNumberLikeSchema>
type NotionDate = z.infer<typeof notionDateSchema>

/** 날짜만 있는 값 (YYYY-MM-DD) */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** KST 기준 YYYY-MM-DD 포맷터 (en-CA 로케일은 YYYY-MM-DD 형식으로 출력) */
const kstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date를 KST 기준 YYYY-MM-DD 문자열로 변환합니다. */
export function formatKstDate(date: Date): string {
  return kstDateFormatter.format(date)
}

/** Zod 이슈를 필드 경로 문자열로 변환합니다. (값, 메시지 원문은 포함하지 않음) */
function toIssuePaths(error: z.ZodError, prefix?: string): string[] {
  const paths = error.issues.map(issue => {
    const path = issue.path.map(String).join('.')
    return path.length > 0 ? path : '(root)'
  })
  const unique = Array.from(new Set(paths))
  return prefix ? unique.map(path => `${prefix}.${path}`) : unique
}

/** 제목 / 텍스트 / 선택 속성을 문자열로 변환합니다. (plain_text 이어붙임) */
function toPlainText(property: NotionTitle | NotionTextLike): string {
  switch (property.type) {
    case 'title':
      return property.title
        .map(part => part.plain_text)
        .join('')
        .trim()
    case 'rich_text':
      return property.rich_text
        .map(part => part.plain_text)
        .join('')
        .trim()
    case 'select':
      return property.select?.name ?? ''
  }
}

/** 숫자 / 숫자 Formula 속성 값을 꺼냅니다. */
function toNumber(property: NotionNumberLike): number | null {
  return property.type === 'number' ? property.number : property.formula.number
}

/**
 * 날짜 속성을 YYYY-MM-DD로 정규화합니다.
 * 날짜만 있으면 그대로, 시각이 포함되면 KST 기준 날짜로 변환합니다.
 * 값이 없거나 해석할 수 없으면 null을 반환합니다.
 */
export function normalizeNotionDate(property: NotionDate): string | null {
  const start = property.date?.start
  if (!start) {
    return null
  }

  if (DATE_ONLY_PATTERN.test(start)) {
    return start
  }

  const date = new Date(start)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return formatKstDate(date)
}

/**
 * 견적 항목 페이지(unknown)를 InvoiceItem으로 변환합니다.
 * 금액은 노션 값을 쓰지 않고 수량 x 단가로 재계산합니다.
 */
export function parseNotionItem(page: unknown): ParseResult<InvoiceItem> {
  const result = notionItemPageSchema.safeParse(page)
  if (!result.success) {
    return { ok: false, issues: toIssuePaths(result.error, 'item') }
  }

  const { id, properties } = result.data
  const quantity = toNumber(properties[NOTION_ITEM_PROPERTIES.quantity])
  const unitPrice = toNumber(properties[NOTION_ITEM_PROPERTIES.unitPrice])

  // 수량 / 단가가 비어 있으면 금액을 계산할 수 없으므로 검증 실패로 처리
  const issues: string[] = []
  if (quantity === null) {
    issues.push(`item.properties.${NOTION_ITEM_PROPERTIES.quantity}`)
  }
  if (unitPrice === null) {
    issues.push(`item.properties.${NOTION_ITEM_PROPERTIES.unitPrice}`)
  }
  if (quantity === null || unitPrice === null) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    data: {
      id,
      name: toPlainText(properties[NOTION_ITEM_PROPERTIES.name]),
      quantity,
      unitPrice,
      amount: calculateItemAmount({ quantity, unitPrice }),
    },
  }
}

/** 견적 항목 페이지 목록을 변환합니다. 하나라도 실패하면 전체를 실패로 처리합니다. */
export function parseNotionItems(pages: unknown[]): ParseResult<InvoiceItem[]> {
  const items: InvoiceItem[] = []
  const issues: string[] = []

  pages.forEach((page, index) => {
    const parsed = parseNotionItem(page)
    if (parsed.ok) {
      items.push(parsed.data)
    } else {
      issues.push(...parsed.issues.map(issue => `items[${index}].${issue}`))
    }
  })

  return issues.length > 0 ? { ok: false, issues } : { ok: true, data: items }
}

/**
 * 견적서 페이지(unknown)와 변환된 항목으로 Invoice를 만듭니다.
 * 발행일 또는 유효기간이 비어 있으면 검증 실패입니다. (부가세 없음)
 */
export function parseNotionInvoice(
  page: unknown,
  items: InvoiceItem[]
): ParseResult<Invoice> {
  const result = notionInvoicePageSchema.safeParse(page)
  if (!result.success) {
    return { ok: false, issues: toIssuePaths(result.error, 'invoice') }
  }

  const { id, properties } = result.data
  const issuedAt = normalizeNotionDate(
    properties[NOTION_INVOICE_PROPERTIES.issuedAt]
  )
  const validUntil = normalizeNotionDate(
    properties[NOTION_INVOICE_PROPERTIES.validUntil]
  )
  const status = properties[NOTION_INVOICE_PROPERTIES.status]
  const statusName =
    status.type === 'select' ? status.select?.name : status.status?.name

  const issues: string[] = []
  if (issuedAt === null) {
    issues.push(`invoice.properties.${NOTION_INVOICE_PROPERTIES.issuedAt}`)
  }
  if (validUntil === null) {
    issues.push(`invoice.properties.${NOTION_INVOICE_PROPERTIES.validUntil}`)
  }
  if (statusName === undefined) {
    issues.push(`invoice.properties.${NOTION_INVOICE_PROPERTIES.status}`)
  }
  if (issuedAt === null || validUntil === null || statusName === undefined) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    data: {
      id,
      invoiceNumber: toPlainText(
        properties[NOTION_INVOICE_PROPERTIES.invoiceNumber]
      ),
      status: statusName,
      clientName: toPlainText(properties[NOTION_INVOICE_PROPERTIES.clientName]),
      issuedAt,
      validUntil,
      items,
    },
  }
}
