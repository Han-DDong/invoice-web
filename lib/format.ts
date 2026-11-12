// 화면 표시용 포맷 유틸 (순수 함수)

const currencyFormatter = new Intl.NumberFormat("ko-KR")

/** 금액을 "55,000,000원" 형태로 변환합니다. */
export function formatCurrency(value: number): string {
  return `${currencyFormatter.format(value)}원`
}

/** ISO 날짜 문자열을 "2026년 11월 3일" 형태로 변환합니다. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}
