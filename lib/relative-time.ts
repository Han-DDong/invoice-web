// 시간 표시 유틸 (순수 함수, KST 기준)

const kstDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO 시각을 KST 기준 "YYYY-MM-DD HH:mm"으로 변환합니다. 해석할 수 없으면 빈 문자열입니다. */
export function formatKstDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const parts = Object.fromEntries(
    kstDateTimeFormatter.formatToParts(date).map(p => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 기준 시각(now)으로부터 얼마나 지났는지 "방금 전", "N분 전", "N시간 전", "N일 전", "N개월 전"으로 표현합니다.
 * 미래 시각(시계 오차)은 "방금 전"으로 처리하고, 해석할 수 없으면 빈 문자열입니다.
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date()
): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) {
    return ''
  }
  const seconds = Math.floor((now.getTime() - time) / 1000)
  if (seconds < MINUTE) {
    return '방금 전'
  }
  if (seconds < HOUR) {
    return `${Math.floor(seconds / MINUTE)}분 전`
  }
  if (seconds < DAY) {
    return `${Math.floor(seconds / HOUR)}시간 전`
  }
  if (seconds < 30 * DAY) {
    return `${Math.floor(seconds / DAY)}일 전`
  }
  return `${Math.floor(seconds / (30 * DAY))}개월 전`
}
