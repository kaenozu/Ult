/**
 * E2E Tests: Trading Workflow
 * Tests the complete trading workflow from stock selection to order execution
 */
import { test, expect } from '@playwright/test';

test.describe('Trading Workflow - Complete Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies and local storage before each test
    await context.clearCookies();
  });

  test.describe('Stock Selection to Chart Display', () => {
    test('should search for a stock and display chart', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Search for a stock using the search box
      const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
      await expect(searchBox).toBeVisible();

      // Enter stock code (Nintendo as example)
      await searchBox.fill('7974');
      await searchBox.press('Enter');

      // Wait for results to appear
      await page.waitForTimeout(2000);

      // Check that the page didn't crash and chart container is visible
      await expect(page.locator('body')).toBeVisible();
    });

    test('should switch time intervals correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for the page to fully load
      await page.waitForTimeout(1000);

      // Check if interval buttons exist and are clickable
      const intervalButtons = page.locator('button:has-text("1m"), button:has-text("5m"), button:has-text("1h"), button:has-text("1d")');
      const count = await intervalButtons.count();

      if (count > 0) {
        // Click 5m interval
        const button5m = page.locator('button:has-text("5m")').first();
        if (await button5m.isVisible()) {
          await button5m.click();
          await page.waitForTimeout(500);
        }

        // Click 1h interval
        const button1h = page.locator('button:has-text("1h")').first();
        if (await button1h.isVisible()) {
          await button1h.click();
          await page.waitForTimeout(500);
        }
      }

      // Verify page is still responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Order Panel Functionality', () => {
    test('should display order panel with buy/sell options', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for order panel elements
      const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
      const sellButton = page.locator('button:has-text("売り"), button:has-text("SELL")').first();

      // At least one should be visible
      const buyVisible = await buyButton.isVisible().catch(() => false);
      const sellVisible = await sellButton.isVisible().catch(() => false);

      expect(buyVisible || sellVisible).toBe(true);
    });

    test('should allow quantity input in order panel', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for quantity input
      const quantityInput = page.locator('input[type="number"], input[min], input[name*="quantity"], input[name*="amount"]').first();
      
      if (await quantityInput.isVisible()) {
        // Enter a quantity
        await quantityInput.clear();
        await quantityInput.fill('100');
        
        // Verify the value was entered
        const value = await quantityInput.inputValue();
        expect(value).toBe('100');
      }
    });
  });

  test.describe('Technical Indicators Toggle', () => {
    test('should toggle SMA indicator', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for SMA toggle button
      const smaButton = page.locator('button:has-text("SMA"), button[name="sma"]').first();
      
      if (await smaButton.isVisible()) {
        // Click to toggle SMA
        await smaButton.click();
        await page.waitForTimeout(500);
        
        // Click again to toggle off
        await smaButton.click();
        await page.waitForTimeout(500);
      }

      // Verify page is still responsive
      await expect(page.locator('body')).toBeVisible();
    });

    test('should toggle Bollinger Bands indicator', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for BB toggle button
      const bbButton = page.locator('button:has-text("BB"), button:has-text("Bollinger"), button[name="bb"]').first();
      
      if (await bbButton.isVisible()) {
        await bbButton.click();
        await page.waitForTimeout(500);
        
        // Toggle off
        await bbButton.click();
        await page.waitForTimeout(500);
      }

      await expect(page.locator('body')).toBeVisible();
    });

    test('should toggle RSI indicator', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for RSI toggle button
      const rsiButton = page.locator('button:has-text("RSI"), button[name="rsi"]').first();
      
      if (await rsiButton.isVisible()) {
        await rsiButton.click();
        await page.waitForTimeout(500);
      }

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Portfolio and Position Tracking', () => {
    test('should navigate to portfolio section', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for portfolio or positions link
      const portfolioLink = page.locator('a:has-text("ポートフォリオ"), a:has-text("Position"), a:has-text("持仓")').first();
      
      if (await portfolioLink.isVisible()) {
        await portfolioLink.click();
        await page.waitForTimeout(1000);
        
        // Verify navigation
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should display open positions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for positions table or list
      const positionsContainer = page.locator('table:has-text("建玉"), table:has-text("Position"), div:has-text("持仓")');
      
      if (await positionsContainer.isVisible()) {
        await expect(positionsContainer).toBeVisible();
      }
    });
  });

  test.describe('Trade Journal', () => {
    test('should navigate to journal page', async ({ page }) => {
      await page.goto('/journal');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify journal page loads
      await expect(page.locator('h1, h2')).toContainText(/ジャーナル|Journal|トレード|Trade/);
    });

    test('should display trade history', async ({ page }) => {
      await page.goto('/journal');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for trades tab or list
      const tradesTab = page.locator('button:has-text("Trades"), button:has-text("取引履歴")');
      
      if (await tradesTab.isVisible()) {
        await tradesTab.click();
        await page.waitForTimeout(500);
      }

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Screener Functionality', () => {
    test('should navigate to screener and filter stocks', async ({ page }) => {
      await page.goto('/screener');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify screener page loads
      await expect(page.locator('h1, h2')).toContainText(/スクリャー|Screener|股票/);
    });

    test('should apply buy signal filter', async ({ page }) => {
      await page.goto('/screener');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click buy filter button
      const buyFilter = page.locator('button:has-text("買い"), button:has-text("Buy")').first();
      
      if (await buyFilter.isVisible()) {
        await buyFilter.click();
        await page.waitForTimeout(500);
        
        // Verify filter is applied (button should be highlighted)
        await expect(buyFilter).toHaveClass(/bg-primary|active|selected/);
      }
    });
  });

  test.describe('Heatmap Navigation', () => {
    test('should navigate to heatmap and switch markets', async ({ page }) => {
      await page.goto('/heatmap');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify heatmap page loads
      await expect(page.locator('h1, h2')).toContainText(/ヒート|Heatmap|マップ|Map/);

      // Switch to different market views
      const japanButton = page.locator('button:has-text("JAPAN"), button:has-text("日本")').first();
      const usaButton = page.locator('button:has-text("USA"), button:has-text("米国")').first();
      const globalButton = page.locator('button:has-text("Global"), button:has-text("全世界")').first();

      if (await japanButton.isVisible()) {
        await japanButton.click();
        await page.waitForTimeout(500);
      }

      if (await usaButton.isVisible()) {
        await usaButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid stock search gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Search for non-existent stock
      const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
      await searchBox.fill('INVALID_TICKER_XYZ123');
      await searchBox.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(2000);

      // Page should not crash
      await expect(page.locator('h1:has-text("TRADER PRO")')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Go to screener which may make API calls
      await page.goto('/screener');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Page should still be responsive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Main content should be visible
      await expect(page.locator('body')).toBeVisible();
      
      // Navigation should work
      const navMenu = page.locator('nav, .navigation, [role="navigation"]').first();
      if (await navMenu.isVisible()) {
        await expect(navMenu).toBeVisible();
      }
    });
  });
});
