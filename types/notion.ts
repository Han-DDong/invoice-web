import { z } from "zod";

import { INVOICE_STATUSES } from "@/types/invoice";

// 노션 API 원본 응답 스키마 (F001)
// 응답은 unknown 상태에서 Zod로 파싱하고, 컴포넌트에는 도메인 타입(types/invoice.ts)만 전달합니다.
// 속성 이름은 실제 노션 DB 컬럼명과 동일해야 합니다.

/** 노션 DB 속성 이름 */
export const NOTION_INVOICE_PROPERTIES = {
  invoiceNumber: "견적서 번호",
  issuedAt: "발행일",
  status: "상태",
  validUntil: "유효기간",
  totalAmount: "총 금액",
  clientName: "클라이언트명",
  items: "항목",
} as const;

export const NOTION_ITEM_PROPERTIES = {
  name: "항목명",
  invoice: "Invoice",
  amount: "금액",
  unitPrice: "단가",
  quantity: "수량",
} as const;

/** 리치 텍스트 조각 (plain_text만 사용) */
const richTextItemSchema = z.object({
  plain_text: z.string(),
});

/** 제목 속성 */
export const notionTitleSchema = z.object({
  type: z.literal("title"),
  title: z.array(richTextItemSchema),
});

/** 텍스트 속성 */
export const notionRichTextSchema = z.object({
  type: z.literal("rich_text"),
  rich_text: z.array(richTextItemSchema),
});

/** 문자열로 읽을 수 있는 속성 (제목 / 텍스트 / 선택) */
export const notionTextLikeSchema = z.union([
  notionTitleSchema,
  notionRichTextSchema,
  z.object({
    type: z.literal("select"),
    select: z.object({ name: z.string() }).nullable(),
  }),
]);

/** 숫자 속성 */
export const notionNumberSchema = z.object({
  type: z.literal("number"),
  number: z.number().nullable(),
});

/** 숫자 또는 숫자 Formula 속성 */
export const notionNumberLikeSchema = z.union([
  notionNumberSchema,
  z.object({
    type: z.literal("formula"),
    formula: z.object({
      type: z.literal("number"),
      number: z.number().nullable(),
    }),
  }),
]);

/** 선택 / 상태 속성 */
export const notionStatusSchema = z.union([
  z.object({
    type: z.literal("select"),
    select: z.object({ name: z.enum(INVOICE_STATUSES) }).nullable(),
  }),
  z.object({
    type: z.literal("status"),
    status: z.object({ name: z.enum(INVOICE_STATUSES) }).nullable(),
  }),
]);

/** 날짜 속성 (API는 ISO 문자열로 응답) */
export const notionDateSchema = z.object({
  type: z.literal("date"),
  date: z.object({ start: z.string() }).nullable(),
});

/** 관계(relation) 속성 */
export const notionRelationSchema = z.object({
  type: z.literal("relation"),
  relation: z.array(z.object({ id: z.string() })),
});

/** 견적서 DB 페이지 */
export const notionInvoicePageSchema = z.object({
  id: z.string(),
  properties: z.object({
    [NOTION_INVOICE_PROPERTIES.invoiceNumber]: notionTitleSchema,
    [NOTION_INVOICE_PROPERTIES.issuedAt]: notionDateSchema,
    [NOTION_INVOICE_PROPERTIES.status]: notionStatusSchema,
    [NOTION_INVOICE_PROPERTIES.validUntil]: notionDateSchema,
    // 총 금액은 참고용입니다. 화면 합계는 항목에서 재계산합니다.
    [NOTION_INVOICE_PROPERTIES.totalAmount]: notionNumberLikeSchema.optional(),
    [NOTION_INVOICE_PROPERTIES.clientName]: notionTextLikeSchema,
    [NOTION_INVOICE_PROPERTIES.items]: notionRelationSchema,
  }),
});

/** 견적 항목 DB 페이지 */
export const notionItemPageSchema = z.object({
  id: z.string(),
  properties: z.object({
    [NOTION_ITEM_PROPERTIES.name]: notionTitleSchema,
    [NOTION_ITEM_PROPERTIES.invoice]: notionRelationSchema,
    // 금액은 참고용입니다. 수량 x 단가로 재계산합니다.
    [NOTION_ITEM_PROPERTIES.amount]: notionNumberLikeSchema.optional(),
    [NOTION_ITEM_PROPERTIES.unitPrice]: notionNumberLikeSchema,
    [NOTION_ITEM_PROPERTIES.quantity]: notionNumberLikeSchema,
  }),
});

export type NotionInvoicePage = z.infer<typeof notionInvoicePageSchema>;
export type NotionItemPage = z.infer<typeof notionItemPageSchema>;
