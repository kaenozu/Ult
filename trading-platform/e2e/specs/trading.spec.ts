/**
 * Trading Workflow Tests
 * 
 * 取引機能のエンドツーエンドテスト
 */

import { test, expect } from '../fixtures';
import { 
  waitForPageLoad, 
  clickWhenVisible, 
  waitForToast,
  mockApiResponse,
} from '../helpers';

test.describe('Trading Workflows', () => {
  test.beforeEach(async ({ page, login }) => {
    await login();
    await waitForPageLoad(page);
  });

  test.describe('Order Creation', () => {
    test('should create a market buy order', async ({ page, testOrder }) => {
      // 注文パネルを開く
      await clickWhenVisible(page, '[data-testid="order-panel-button"]');
      
      // 銘柄を入力
      await page.fill('[data-testid="symbol-input"]', testOrder.symbol);
      await page.keyboard.press('Enter');
      
      // サイドを選択（BUY）
      await page.click('[data-testid="side-buy-button"]');
      
      // 数量を入力
      await page.fill('[data-testid="quantity-input"]', testOrder.quantity.toString());
      
      // 注文タイプを選択（MARKET）
      await page.selectOption('[data-testid="order-type-select"]', 'MARKET');
      
      // APIレスポンスをモック
      await mockApiResponse(page, '**/api/trading', {
        success: true,
        orderId: 'order-123',
        status: 'PENDING',
      });
      
      // 注文を送信
      await clickWhenVisible(page, '[data-testid="submit-order-button"]');
      
      // 成功メッセージを確認
      await waitForToast(page, 'success');
      
      // 注文が注文履歴に表示されることを確認
      await clickWhenVisible(page, '[data-testid="order-history-tab"]');
      const orderRow = page.locator(`[data-testid="order-row"]:has-text("${testOrder.symbol}")`);
      await expect(orderRow).toBeVisible();
    });

    test('should create a limit sell order with price', async ({ page }) => {
      const order = {
        symbol: 'MSFT',
        side: 'SELL',
        quantity: 50,
        orderType: 'LIMIT',
        price: 400,
      };
      
      await clickWhenVisible(page, '[data-testid="order-panel-button"]');
      await page.fill('[data-testid="symbol-input"]', order.symbol);
      await page.click('[data-testid="side-sell-button"]');
      await page.fill('[data-testid="quantity-input"]', order.quantity.toString());
      await page.selectOption('[data-testid="order-type-select"]', 'LIMIT');
      await page.fill('[data-testid="price-input"]', order.price.toString());
      
      await mockApiResponse(page, '**/api/trading', {
        success: true,
        orderId: 'order-456',
        status: 'PENDING',
      });
      
      await clickWhenVisible(page, '[data-testid="submit-order-button"]');
      await waitForToast(page, 'success');
    });

    test('should validate order form before submission', async ({ page }) => {
      await clickWhenVisible(page, '[data-testid="order-panel-button"]');
      
      // 空のフォームで送信を試行
      await clickWhenVisible(page, '[data-testid="submit-order-button"]');
      
      // バリデーションエラーを確認
      await expect(page.locator('[data-testid="symbol-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="quantity-error"]')).toBeVisible();
    });

    test('should handle order submission error', async ({ page, testOrder }) => {
      await clickWhenVisible(page, '[data-testid="order-panel-button"]');
      await page.fill('[data-testid="symbol-input"]', testOrder.symbol);
      await page.click('[data-testid="side-buy-button"]');
      await page.fill('[data-testid="quantity-input"]', testOrder.quantity.toString());
      
      // エラーレスポンスをモック
      await mockApiResponse(page, '**/api/trading', {
        success: false,
        error: 'Insufficient funds',
      }, 400);
      
      await clickWhenVisible(page, '[data-testid="submit-order-button"]');
      
      // エラーメッセージを確認
      await waitForToast(page, 'error');
      await expect(page.locator('[data-testid="toast-error"]')).toContainText('Insufficient funds');
    });
  });

  test.describe('Position Management', () => {
    test('should display current positions', async ({ page }) => {
      // ポジションデータをモック
      await mockApiResponse(page, '**/api/portfolio', {
        positions: [
          { symbol: 'AAPL', quantity: 100, avgPrice: 150, currentPrice: 175 },
          { symbol: 'MSFT', quantity: 50, avgPrice: 300, currentPrice: 400 },
        ],
      });
      
      await clickWhenVisible(page, '[data-testid="portfolio-tab"]');
      
      // ポジションが表示されることを確認
      await expect(page.locator('[data-testid="position-row"]:has-text("AAPL")')).toBeVisible();
      await expect(page.locator('[data-testid="position-row"]:has-text("MSFT")')).toBeVisible();
    });

    test('should close a position', async ({ page }) => {
      await mockApiResponse(page, '**/api/portfolio', {
        positions: [{ symbol: 'AAPL', quantity: 100, avgPrice: 150, currentPrice: 175 }],
      });
      
      await clickWhenVisible(page, '[data-testid="portfolio-tab"]');
      
      // ポジションの閉じるボタンをクリック
      await clickWhenVisible(page, '[data-testid="close-position-button-AAPL"]');
      
      // 確認ダイアログ
      await clickWhenVisible(page, '[data-testid="confirm-close-button"]');
      
      await mockApiResponse(page, '**/api/trading', {
        success: true,
        orderId: 'close-order-123',
      });
      
      await waitForToast(page, 'success');
    });

    test('should calculate unrealized P&L correctly', async ({ page }) => {
      await mockApiResponse(page, '**/api/portfolio', {
        positions: [
          { 
            symbol: 'AAPL', 
            quantity: 100, 
            avgPrice: 150, 
            currentPrice: 175,
            unrealizedPnL: 2500,
            unrealizedPnLPercent: 16.67,
          },
        ],
      });
      
      await clickWhenVisible(page, '[data-testid="portfolio-tab"]');
      
      // P&Lが正しく表示されることを確認
      const pnlCell = page.locator('[data-testid="unrealized-pnl-AAPL"]');
      await expect(pnlCell).toContainText('+2,500');
      await expect(pnlCell).toHaveClass(/text-green-600/);
    });
  });

  test.describe('Order History', () => {
    test('should display order history with filters', async ({ page }) => {
      await mockApiResponse(page, '**/api/orders**', {
        orders: [
          { id: '1', symbol: 'AAPL', side: 'BUY', status: 'FILLED', date: '2026-01-01' },
          { id: '2', symbol: 'MSFT', side: 'SELL', status: 'PENDING', date: '2026-01-02' },
        ],
      });
      
      await clickWhenVisible(page, '[data-testid="order-history-tab"]');
      
      // フィルターを適用
      await page.selectOption('[data-testid="status-filter"]', 'FILLED');
      
      // フィルタリングされた結果を確認
      await expect(page.locator('[data-testid="order-row"]:has-text("AAPL")')).toBeVisible();
      await expect(page.locator('[data-testid="order-row"]:has-text("MSFT")')).not.toBeVisible();
    });

    test('should cancel a pending order', async ({ page }) => {
      await mockApiResponse(page, '**/api/orders**', {
        orders: [
          { id: '1', symbol: 'AAPL', side: 'BUY', status: 'PENDING', date: '2026-01-01' },
        ],
      });
      
      await clickWhenVisible(page, '[data-testid="order-history-tab"]');
      
      // キャンセルボタンをクリック
      await clickWhenVisible(page, '[data-testid="cancel-order-button-1"]');
      
      await mockApiResponse(page, '**/api/orders/1/cancel', {
        success: true,
      });
      
      await clickWhenVisible(page, '[data-testid="confirm-cancel-button"]');
      
      await waitForToast(page, 'success');
    });
  });
});
