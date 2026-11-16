import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// 단위 테스트 설정 (Task 012-A)
// 순수 함수, 서비스, Route Handler만 node 환경에서 테스트합니다.
// async Server Component는 Vitest가 지원하지 않으므로 화면은 Playwright로 확인합니다.
export default defineConfig({
  resolve: {
    // tsconfig.json의 paths(@/*)를 그대로 사용 (Vite 8 내장 기능, 별도 플러그인 불필요)
    tsconfigPaths: true,
    alias: {
      // 서버 전용 모듈 가드를 테스트에서는 빈 모듈로 대체
      'server-only': fileURLToPath(
        new URL('./tests/stubs/server-only.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 테스트마다 모킹 구현과 호출 기록 초기화
    mockReset: true,
    restoreMocks: true,
  },
})
