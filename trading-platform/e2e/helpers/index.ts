/**
 * E2E Test Helpers
 * 
 * テストで使用するユーティリティ関数
 */

import { Page, expect, Locator } from '@playwright/test';

// ============================================================================
// ページ操作用ヘルパー
// ============================================================================

/**
 * ページが読み込まれるまで待機
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 要素が表示されるまで待機してクリック
 */
export async function clickWhenVisible(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await element.click();
}

/**
 * 入力フィールドをクリアしてテキストを入力
 */
export async function clearAndType(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  const field = page.locator(selector);
  await field.clear();
  await field.fill(text);
}

/**
 * セレクトボックスから値を選択
 */
export async function selectOption(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.locator(selector).selectOption(value);
}

/**
 * モーダルが表示されるまで待機
 */
export async function waitForModal(
  page: Page,
  modalSelector = '[data-testid="modal"]'
): Promise<Locator> {
  const modal = page.locator(modalSelector);
  await modal.waitFor({ state: 'visible' });
  return modal;
}

/**
 * トースト通知が表示されるまで待機
 */
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' | 'warning' | 'info' = 'success',
  timeout = 10000
): Promise<void> {
  const toast = page.locator(`[data-testid="toast-${type}"]`);
  await toast.waitFor({ state: 'visible', timeout });
}

/**
 * テーブルの行数を取得
 */
export async function getTableRowCount(
  page: Page,
  tableSelector: string
): Promise<number> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  return await rows.count();
}

/**
 * テーブル内の特定のテキストを含む行を検索
 */
export async function findTableRow(
  page: Page,
  tableSelector: string,
  text: string
): Promise<Locator | null> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  const count = await rows.count();
  
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const rowText = await row.textContent();
    if (rowText?.includes(text)) {
      return row;
    }
  }
  
  return null;
}

// ============================================================================
// APIモック用ヘルパー
// ============================================================================

/**
 * APIレスポンスをモック
 */
export async function mockApiResponse<T>(
  page: Page,
  url: string,
  response: T,
  status = 200
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * APIエラーをモック
 */
export async function mockApiError(
  page: Page,
  url: string,
  status = 500,
  message = 'Internal Server Error'
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    });
  });
}

/**
 * ネットワーク遅延をシミュレート
 */
export async function mockNetworkDelay(
  page: Page,
  url: string,
  delay: number
): Promise<void> {
  await page.route(url, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await route.continue();
  });
}

// ============================================================================
// データ検証用ヘルパー
// ============================================================================

/**
 * 数値が範囲内にあることを検証
 */
export async function expectNumberInRange(
  locator: Locator,
  min: number,
  max: number
): Promise<void> {
  const text = await locator.textContent();
  const value = parseFloat(text?.replace(/[^0-9.-]/g, '') || '0');
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * 日付が特定の形式であることを検証
 */
export async function expectDateFormat(
  locator: Locator,
  format: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'ISO'
): Promise<void> {
  const text = await locator.textContent();
  let pattern: RegExp;
  
  switch (format) {
    case 'YYYY-MM-DD':
      pattern = /^\d{4}-\d{2}-\d{2}$/;
      break;
    case 'YYYY/MM/DD':
      pattern = /^\d{4}\/\d{2}\/\d{2}$/;
      break;
    case 'ISO':
      pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      break;
  }
  
  expect(text).toMatch(pattern);
}

/**
 * 金額形式であることを検証
 */
export async function expectCurrencyFormat(
  locator: Locator,
  currency: 'USD' | 'JPY' = 'USD'
): Promise<void> {
  const text = await locator.textContent();
  const symbol = currency === 'USD' ? '$' : '¥';
  const pattern = new RegExp(`^${symbol}[\\d,]+(\\.\\d{2})?$`);
  expect(text).toMatch(pattern);
}

// ============================================================================
// アクセシビリティ用ヘルパー
// ============================================================================

/**
 * 要素がアクセシブルであることを検証
 */
export async function verifyAccessibility(
  page: Page,
  selector: string
): Promise<void> {
  const element = page.locator(selector);
  
  // キーボードでフォーカス可能かチェック
  await element.focus();
  const isFocused = await element.evaluate((el) => el === document.activeElement);
  expect(isFocused).toBe(true);
  
  // ARIA属性のチェック
  const ariaLabel = await element.getAttribute('aria-label');
  const ariaDescribedBy = await element.getAttribute('aria-describedby');
  
  expect(ariaLabel || ariaDescribedBy).toBeTruthy();
}

/**
 * スクリーンリーダー用テキストを検証
 */
export async function expectScreenReaderText(
  locator: Locator,
  expectedText: string
): Promise<void> {
  const ariaLabel = await locator.getAttribute('aria-label');
  const title = await locator.getAttribute('title');
  
  expect(ariaLabel === expectedText || title === expectedText).toBe(true);
}

// ============================================================================
// パフォーマンス測定用ヘルパー
// ============================================================================

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  largestContentfulPaint: number;
}

/**
 * パフォーマンスメトリクスを取得
 */
export async function getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint')[0] as PerformanceEntry;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.startTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
      largestContentfulPaint: lcp?.startTime || 0,
    };
  });
  
  return metrics;
}

/**
 * パフォーマンスが閾値を満たすことを検証
 */
export async function expectPerformanceThreshold(
  page: Page,
  thresholds: {
    maxLoadTime?: number;
    maxDomContentLoaded?: number;
    maxFirstPaint?: number;
    maxLcp?: number;
  }
): Promise<void> {
  const metrics = await getPerformanceMetrics(page);
  
  if (thresholds.maxLoadTime) {
    expect(metrics.loadTime).toBeLessThan(thresholds.maxLoadTime);
  }
  if (thresholds.maxDomContentLoaded) {
    expect(metrics.domContentLoaded).toBeLessThan(thresholds.maxDomContentLoaded);
  }
  if (thresholds.maxFirstPaint) {
    expect(metrics.firstPaint).toBeLessThan(thresholds.maxFirstPaint);
  }
  if (thresholds.maxLcp) {
    expect(metrics.largestContentfulPaint).toBeLessThan(thresholds.maxLcp);
  }
}

// ============================================================================
// セキュリティ検証用ヘルパー
// ============================================================================

/**
 * XSS対策が機能していることを検証
 */
export async function verifyXssProtection(page: Page): Promise<void> {
  // Content-Security-Policyヘッダーのチェック
  const response = await page.goto('/');
  const csp = await response?.headerValue('content-security-policy');
  expect(csp).toBeTruthy();
  expect(csp).toContain("default-src 'self'");
}

/**
 * 機密情報がコンソールに出力されていないことを検証
 */
export async function verifyNoSecretsInConsole(page: Page): Promise<void> {
  const logs: string[] = [];
  
  page.on('console', (msg) => {
    logs.push(msg.text());
  });
  
  // ページ操作後にチェック
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
  ];
  
  for (const log of logs) {
    for (const pattern of sensitivePatterns) {
      expect(log).not.toMatch(pattern);
    }
  }
}
