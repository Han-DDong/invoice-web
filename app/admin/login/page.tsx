import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'

import { IconBadge } from '@/components/layout/icon-badge'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasAdminSession } from '@/lib/auth/admin-guard'

export const metadata: Metadata = { title: '로그인' }

/** 오류 코드별 안내 문구 (원인 상세는 노출하지 않음) */
const ERROR_MESSAGES: Record<string, string> = {
  invalid: '비밀번호가 올바르지 않습니다.',
  rate_limited: '시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.',
  config: '관리자 설정이 완료되지 않았습니다. 서버 환경변수를 확인해 주세요.',
}

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>
}

// 관리자 로그인: 일반 form POST (/admin/session)
export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  // 이미 로그인했다면 목록으로
  if (await hasAdminSession()) {
    redirect('/admin')
  }

  const { error } = await searchParams
  const errorKey = typeof error === 'string' ? error : undefined
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : undefined

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm rounded-2xl shadow-sm">
          <CardHeader className="items-center text-center">
            <IconBadge icon={Lock} />
            <CardTitle className="text-xl">관리자 로그인</CardTitle>
            <CardDescription>관리자 비밀번호를 입력해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/admin/session" method="post" className="space-y-4">
              <input type="hidden" name="intent" value="login" />
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                />
              </div>
              {errorMessage ? (
                <p
                  id="login-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errorMessage}
                </p>
              ) : null}
              <Button type="submit" className="w-full">
                로그인
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
