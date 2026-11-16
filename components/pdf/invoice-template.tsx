import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { formatCurrency, formatDate } from '@/lib/format'
import { PDF_FONT_FAMILY } from '@/lib/pdf/fonts'
import type { InvoicePdfProps } from '@/types/pdf'

// 견적서 PDF 템플릿 (F003)
// 화면과 같은 Invoice / InvoiceTotals를 사용해 금액 불일치를 막습니다.
// PDF는 테마(다크 모드)와 무관하므로 StyleSheet에 고정 색상을 사용합니다.

const COLORS = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  headerBg: '#f3f4f6',
} as const

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { marginTop: 4, fontSize: 11, color: COLORS.muted },
  metaRow: { flexDirection: 'row', marginTop: 20 },
  metaCol: { flex: 1 },
  label: { fontSize: 9, color: COLORS.muted, marginBottom: 3 },
  value: { fontSize: 11 },
  tableTitle: { marginTop: 28, marginBottom: 8, fontSize: 12, fontWeight: 700 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  headRow: { backgroundColor: COLORS.headerBg, fontWeight: 700 },
  colName: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 2, textAlign: 'right' },
  colAmount: { flex: 2, textAlign: 'right' },
  totalBox: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: 220,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 11 },
  totalValue: { fontSize: 13, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.muted,
  },
})

/** 견적서 PDF 문서 (부가세 없음, 합계 = 항목 금액 합계) */
export function InvoicePdfDocument({ invoice, totals }: InvoicePdfProps) {
  return (
    <Document title={`견적서 ${invoice.invoiceNumber}`} language="ko">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>견적서</Text>
        <Text style={styles.subtitle}>{invoice.invoiceNumber}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>클라이언트</Text>
            <Text style={styles.value}>{invoice.clientName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>발행일</Text>
            <Text style={styles.value}>{formatDate(invoice.issuedAt)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>유효기간</Text>
            <Text style={styles.value}>
              {formatDate(invoice.validUntil)}까지
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>상태</Text>
            <Text style={styles.value}>{invoice.status}</Text>
          </View>
        </View>

        <Text style={styles.tableTitle}>견적 항목</Text>
        {/* 헤더 행은 페이지가 넘어가도 반복 */}
        <View style={[styles.row, styles.headRow]} fixed>
          <Text style={styles.colName}>항목명</Text>
          <Text style={styles.colQty}>수량</Text>
          <Text style={styles.colPrice}>단가</Text>
          <Text style={styles.colAmount}>금액</Text>
        </View>
        {invoice.items.map(item => (
          <View key={item.id} style={styles.row} wrap={false}>
            <Text style={styles.colName}>{item.name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalBox} wrap={false}>
          <Text style={styles.totalLabel}>총 견적 금액</Text>
          <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
