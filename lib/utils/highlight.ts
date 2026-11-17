// 검색어 하이라이팅용 텍스트 분할 (순수 함수)
// 사용자 입력을 정규식에 넣지 않고 indexOf로만 찾습니다. (정규식 주입, ReDoS 방지)

/** 분할된 조각: match가 true인 조각이 검색어와 일치하는 부분 */
export interface HighlightSegment {
  text: string
  match: boolean
}

/**
 * 텍스트를 검색어와 일치하는 부분과 아닌 부분으로 나눕니다. (대소문자 무시, 모든 일치 구간)
 * 검색어가 비어 있거나 공백뿐이면 전체를 한 조각으로 반환합니다. 조각을 이어 붙이면 원문과 같습니다.
 */
export function splitByQuery(text: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase()
  const haystack = text.toLowerCase()

  // 소문자 변환으로 길이가 달라지는 문자가 있으면 위치를 맞출 수 없어 하이라이팅하지 않음
  if (needle === '' || haystack.length !== text.length) {
    return text === '' ? [] : [{ text, match: false }]
  }

  const segments: HighlightSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const found = haystack.indexOf(needle, cursor)
    if (found === -1) {
      break
    }
    if (found > cursor) {
      segments.push({ text: text.slice(cursor, found), match: false })
    }
    segments.push({
      text: text.slice(found, found + needle.length),
      match: true,
    })
    cursor = found + needle.length
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false })
  }
  return segments
}
