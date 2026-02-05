/**
 * E2E Test Fixtures
 * 
 * テストデータと環境セットアップを提供
 */

import { test as baseTest } from '@playwright/test';

// ============================================================================
// テストユーザーデータ
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'trader' | 'viewer';
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Test Admin',
    role: 'admin',
  },
  trader: {
    id: 'user-trader-001',
    email: 'trader@test.com',
    password: 'Trader123!',
    name: 'Test Trader',
    role: 'trader',
  },
  viewer: {
    id: 'user-viewer-001',
    email: 'viewer@test.com',
    password: 'Viewer123!',
    name: 'Test Viewer',
    role: 'viewer',
  },
};

// ============================================================================
// テスト銘柄データ
// ============================================================================

export interface TestStock {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  sector: string;
}

export const TEST_STOCKS: TestStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'usa', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'usa', sector: 'Technology' },
  { symbol: '7203.T', name: 'Toyota Motor Corporation', market: 'japan', sector: 'Automotive' },
  { symbol: '6758.T', name: 'Sony Group Corporation', market: 'japan', sector: 'Technology' },
];

// ============================================================================
// テスト注文データ
// ============================================================================

export interface TestOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  price?: number;
}

export const TEST_ORDERS: TestOrder[] = [
  { symbol: 'AAPL', side: 'BUY', quantity: 100, orderType: 'MARKET' },
  { symbol: 'MSFT', side: 'SELL', quantity: 50, orderType: 'LIMIT', price: 400 },
  { symbol: '7203.T', side: 'BUY', quantity: 1000, orderType: 'MARKET' },
];

// ============================================================================
// テスト設定
// ============================================================================

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  viewport: {
    width: number;
    height: number;
  };
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  viewport: { width: 1920, height: 1080 },
};

// ============================================================================
// Playwright Fixtures
// ============================================================================

export type TestFixtures = {
  testUser: TestUser;
  testStock: TestStock;
  testOrder: TestOrder;
  testConfig: TestConfig;
  login: (user?: TestUser) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * カスタムテスト関数を作成
 */
export const test = baseTest.extend<TestFixtures>({
  // デフォルトのテストユーザー
  testUser: TEST_USERS.trader,
  
  // デフォルトのテスト銘柄
  testStock: TEST_STOCKS[0],
  
  // デフォルトのテスト注文
  testOrder: TEST_ORDERS[0],
  
  // テスト設定
  testConfig: DEFAULT_TEST_CONFIG,
  
  // ログインヘルパー
  login: async ({ page }, use) => {
    const login = async (user: TestUser = TEST_USERS.trader) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard');
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(login);
  },
  
  // ログアウトヘルパー
  logout: async ({ page }, use) => {
    const logout = async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('/login');
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(logout);
  },
});

/**
 * テストで使用する共通関数
 */
export { expect } from '@playwright/test';
