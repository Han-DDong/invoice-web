import { splitByQuery } from '@/lib/utils/highlight'

interface HighlightTextProps {
  text: string
  /** 검색어 (비어 있으면 그대로 출력) */
  query: string
}

// 검색어와 일치하는 부분을 <mark>로 강조합니다. (정규식 없이 indexOf 기반 분할, React가 텍스트를 이스케이프)
export function HighlightText({ text, query }: HighlightTextProps) {
  return (
    <>
      {splitByQuery(text, query).map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/20 px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          segment.text
        )
      )}
    </>
  )
}
