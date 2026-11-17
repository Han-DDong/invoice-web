'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { INVOICE_SEARCH_MAX_LENGTH } from '@/lib/invoice-list-query'

/** 입력이 멈춘 뒤 URL을 갱신하기까지의 지연 (밀리초) */
const DEBOUNCE_MS = 300

interface SearchBarProps {
  /** 현재 URL의 검색어 (서버에서 파싱한 값) */
  initialQuery: string
  /** 검색어를 반영할 목록 경로 (예: /admin/invoices) */
  basePath: string
  placeholder: string
  /** 접근성 이름 */
  label: string
}

// 검색어 입력: 300ms 디바운스로 URL의 q를 갱신 (router.replace, 검색 중에는 히스토리를 쌓지 않음)
// 다른 쿼리(정렬, 필터)는 현재 URL에서 그대로 유지하고, 검색어가 바뀌면 page를 지워 1페이지로 돌립니다.
// 견적서 목록과 클라이언트 목록이 함께 씁니다.
export function SearchBar({
  initialQuery,
  basePath,
  placeholder,
  label,
}: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialQuery)
  // 마지막으로 URL에 반영했거나 URL에서 받은 검색어 (입력 도중 덮어쓰기 방지)
  const syncedQuery = useRef(initialQuery)

  // URL이 바깥에서 바뀌면(필터 초기화, 뒤로 가기) 입력값을 맞춤
  useEffect(() => {
    if (initialQuery !== syncedQuery.current) {
      syncedQuery.current = initialQuery
      setValue(initialQuery)
    }
  }, [initialQuery])

  function pushQuery(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === '') {
      params.delete('q')
    } else {
      params.set('q', next)
    }
    params.delete('page')
    syncedQuery.current = next
    const text = params.toString()
    router.replace(text ? `${basePath}?${text}` : basePath)
  }

  // 디바운스: 입력이 멈추고 300ms 뒤에 반영
  useEffect(() => {
    const next = value.trim()
    if (next === syncedQuery.current) {
      return
    }
    const timer = setTimeout(() => pushQuery(next), DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value가 바뀔 때만 타이머를 다시 설정
  }, [value])

  return (
    <form
      role="search"
      className="relative w-full sm:max-w-sm"
      onSubmit={event => {
        // Enter는 디바운스를 기다리지 않고 바로 반영
        event.preventDefault()
        pushQuery(value.trim())
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={event => setValue(event.target.value)}
        maxLength={INVOICE_SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="pl-9"
      />
    </form>
  )
}
