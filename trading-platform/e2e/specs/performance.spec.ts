/**
 * Performance Tests
 * 
 * パフォーマンスと負荷テスト
 */

import { test, expect } from '../fixtures';
import { 
  waitForPageLoad, 
  getPerformanceMetrics, 
  expectPerformanceThreshold,
} from '../helpers';

test.describe('Performance', () => {
  test.describe('Page Load Performance', () => {
    test('dashboard should load within 3 seconds', async ({ page, login }) => {
      await login();
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      await waitForPageLoad(page);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('should meet Core Web Vitals thresholds', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      await waitForPageLoad(page);
      
      await expectPerformanceThreshold(page, {
        maxDomContentLoaded: 2000,
        maxFirstPaint: 1500,
        maxLcp: 2500,
      });
    });

    test('trading panel should load within 2 seconds', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      
      const startTime = Date.now();
      await page.click('[data-testid="order-panel-button"]');
      await page.waitForSelector('[data-testid="order-form"]', { timeout: 2000 });
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });
  });

  test.describe('Chart Performance', () => {
    test('chart should render within 2 seconds', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="stock-chart"]', { timeout: 2000 });
      await page.waitForSelector('[data-testid="chart-canvas"]', { timeout: 2000 });
      const renderTime = Date.now() - startTime;
      
      expect(renderTime).toBeLessThan(2000);
    });

    test('chart interactions should be smooth', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="stock-chart"]');
      
      // ズーム操作のパフォーマンスを測定
      const startTime = Date.now();
      await page.click('[data-testid="chart-zoom-in"]');
      await page.waitForTimeout(100); // アニメーション待機
      const zoomTime = Date.now() - startTime;
      
      expect(zoomTime).toBeLessThan(500);
    });

    test('should handle large datasets efficiently', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      
      // 長期間のデータをロード
      await page.selectOption('[data-testid="chart-period-select"]', '1Y');
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="chart-loaded"]', { timeout: 5000 });
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('API Performance', () => {
    test('market data API should respond within 500ms', async ({ page, login }) => {
      await login();
      
      const response = await page.evaluate(async () => {
        const start = performance.now();
        const res = await fetch('/api/market?symbol=AAPL');
        const end = performance.now();
        return { status: res.status, duration: end - start };
      });
      
      expect(response.status).toBe(200);
      expect(response.duration).toBeLessThan(500);
    });

    test('order submission API should respond within 1 second', async ({ page, login }) => {
      await login();
      
      const response = await page.evaluate(async () => {
        const start = performance.now();
        const res = await fetch('/api/trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'place_order',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 100,
          }),
        });
        const end = performance.now();
        return { status: res.status, duration: end - start };
      });
      
      expect(response.status).toBe(200);
      expect(response.duration).toBeLessThan(1000);
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have memory leaks', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      
      // 初期メモリ使用量を記録
      const initialMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // 複数回ページ遷移
      for (let i = 0; i < 10; i++) {
        await page.goto('/dashboard');
        await page.goto('/portfolio');
        await page.goto('/orders');
      }
      
      // GCを実行（Chromeの場合）
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      // メモリ使用量を再測定
      const finalMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // メモリ増加が50MB以内であることを確認
      if (initialMetrics && finalMetrics) {
        const increase = (finalMetrics - initialMetrics) / (1024 * 1024);
        expect(increase).toBeLessThan(50);
      }
    });
  });

  test.describe('Concurrent Users Simulation', () => {
    test('should handle rapid user interactions', async ({ page, login }) => {
      await login();
      await page.goto('/dashboard');
      
      const startTime = Date.now();
      
      // 高速に複数の操作を実行
      await page.click('[data-testid="order-panel-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="side-buy-button"]');
      await page.fill('[data-testid="quantity-input"]', '100');
      await page.click('[data-testid="close-order-panel"]');
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(2000);
    });
  });
});
