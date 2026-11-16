'use client' // 에러 경계는 반드시 Client Component여야 함

import './globals.css'
import { useEffect, useSyncExternalStore } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  StatusCard,
  StatusCardContactNote,
} from '@/components/layout/status-card'

interface GlobalErrorProps {
  // 서버 컴포넌트에서 던진 값은 Error, 클라이언트에서 던진 값은 임의 타입일 수 있음
  error: unknown
  // 다시 요청하고 렌더링 (Next.js 16)
  retry: () => void
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

// OS 다크 모드 설정 구독 (global-error에는 next-themes가 없으므로 OS 설정을 따름)
function subscribeColorScheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeColorScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  )
}

// 루트 레이아웃까지 대체하는 전역 에러 화면 (Task 011-A)
// 루트 레이아웃이 없으므로 Navbar, Footer, ThemeProvider 없이 자체 html/body를 렌더링합니다.
// 보안: error.message 원문은 화면에 출력하지 않고 고정 문구만 표시
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const prefersDark = usePrefersDark()

  useEffect(() => {
    // 디버깅용으로 브라우저 콘솔에만 기록 (서버 로그와는 error.digest로 대조)
    console.error(error)
  }, [error])

  return (
    <html lang="ko" className={prefersDark ? 'dark' : undefined}>
      <body className="flex min-h-screen flex-col justify-center bg-background text-foreground antialiased">
        {/* metadata export를 쓸 수 없으므로 React title 사용 */}
        <title>페이지를 불러오지 못했습니다</title>
        <StatusCard
          icon={TriangleAlert}
          tone="destructive"
          title="페이지를 불러오지 못했습니다"
          description="일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요."
        >
          <StatusCardContactNote />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => retry()}
            >
              <RotateCw aria-hidden />
              다시 시도
            </Button>
            {/* 루트 레이아웃이 깨진 상태이므로 클라이언트 라우팅 대신 전체 새로고침으로 이동 */}
            <Button asChild variant="outline" className="w-full sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 전체 새로고침이 목적 */}
              <a href="/">홈으로 이동</a>
            </Button>
          </div>
        </StatusCard>
      </body>
    </html>
  )
}
