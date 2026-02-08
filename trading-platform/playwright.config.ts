import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 *
 * ドキュメント: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 並列実行を無効化して安定性を向上
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // ローカルでも1回リトライ
  workers: 1, // ワーカー数を1に固定
  reporter: 'html',
  timeout: 60 * 1000, // テストのタイムアウトを60秒に設定
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // アクションのタイムアウトを10秒に設定
    navigationTimeout: 30000, // ナビゲーションのタイムアウトを30秒に設定
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // テスト実行前に開発サーバーを起動
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      TURBOPACK_ROOT: '.',
      NODE_OPTIONS: '--max-old-space-size=4096',
      E2E: 'true',
      NEXT_PUBLIC_E2E: 'true'
    }
  },
});
