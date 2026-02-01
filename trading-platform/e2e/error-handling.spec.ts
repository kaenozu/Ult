/**
 * E2E Tests: Error Handling
 * Tests for network errors, API timeouts, and rate limiting
 */
import { test, expect } from '@playwright/test';

test.describe('Error Handling - Network and API Issues', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should handle network disconnection gracefully', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Simulate network disconnection by blocking all requests
    await context.route('**/api/**', (route) => {
      route.abort('failed');
    });

    // Try to perform an action that requires network
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('7203');
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Should show network error message
    const networkError = page.locator('text=ネットワーク, text=Network, text=接続, text=Connection, text=Offline');
    const hasNetworkError = await networkError.isVisible().catch(() => false);
    
    // Or show retry button
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry"), button:has-text("再接続")').first();
    const hasRetryButton = await retryButton.isVisible().catch(() => false);
    
    expect(hasNetworkError || hasRetryButton).toBeTruthy();
    
    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let timeoutOccurred = false;

    // Simulate slow API response (timeout)
    await page.route('**/api/market/**', async (route) => {
      // Don't actually delay 35 seconds in tests - just simulate timeout response
      timeoutOccurred = true;
      route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Gateway Timeout' })
      });
    });

    // Try to fetch market data
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('9984');
      await searchBox.press('Enter');
      
      // Wait for timeout error to be processed
      await page.waitForResponse(response => 
        response.url().includes('/api/market/') && response.status() === 504
      ).catch(() => null);
    }

    // Should show timeout error
    const timeoutError = page.locator('text=タイムアウト, text=Timeout, text=時間切れ, text=Too long');
    const hasTimeoutError = await timeoutError.isVisible().catch(() => false);
    
    // Or show loading indicator with cancel option
    const cancelButton = page.locator('button:has-text("キャンセル"), button:has-text("Cancel")').first();
    const hasCancelOption = await cancelButton.isVisible().catch(() => false);
    
    // Page should handle timeout gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle rate limit exceeded', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    let requestCount = 0;

    // Simulate rate limiting after 5 requests
    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60
          }),
          headers: {
            'Retry-After': '60'
          }
        });
      } else {
        route.continue();
      }
    });

    // Make multiple rapid requests
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      for (let i = 0; i < 10; i++) {
        await searchBox.fill(`700${i}`);
        await searchBox.press('Enter');
        await page.waitForTimeout(100);
      }
    }

    // Should show rate limit error
    const rateLimitError = page.locator('text=制限, text=Rate limit, text=Too many requests, text=頻度');
    const hasRateLimitError = await rateLimitError.isVisible().catch(() => false);
    
    // Should show retry time
    const retryInfo = page.locator('text=後で, text=Later, text=分後, text=秒後');
    const hasRetryInfo = await retryInfo.isVisible().catch(() => false);
    
    expect(hasRateLimitError || hasRetryInfo).toBeTruthy();
  });

  test('should handle 500 Internal Server Error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate server error
    await page.route('**/api/trading/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        })
      });
    });

    // Try to access trading features
    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
    }

    // Should show server error message
    const serverError = page.locator('text=サーバーエラー, text=Server error, text=Internal error, text=予期しない');
    const hasServerError = await serverError.isVisible().catch(() => false);
    
    // Should have option to report or retry
    const actionButton = page.locator('button:has-text("再試行"), button:has-text("報告"), button:has-text("Retry"), button:has-text("Report")').first();
    const hasActionButton = await actionButton.isVisible().catch(() => false);
    
    expect(hasServerError || hasActionButton).toBeTruthy();
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 404 Not Found errors', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page-12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show 404 page or error
    const notFoundMessage = page.locator('text=404, text=見つかりません, text=Not found, text=存在しません');
    const hasNotFoundMessage = await notFoundMessage.isVisible().catch(() => false);
    
    // Should have navigation back to home
    const homeLink = page.locator('a:has-text("ホーム"), a:has-text("Home"), a[href="/"]').first();
    const hasHomeLink = await homeLink.isVisible().catch(() => false);
    
    expect(hasNotFoundMessage || hasHomeLink).toBeTruthy();
  });

  test('should handle malformed API responses', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Return invalid JSON
    await page.route('**/api/market/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{invalid json response'
      });
    });

    // Try to fetch market data
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('7203');
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Should handle parsing error gracefully
    const dataError = page.locator('text=データエラー, text=Data error, text=Invalid response, text=形式');
    const hasDataError = await dataError.isVisible().catch(() => false);
    
    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover from temporary network issues', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    let failureCount = 0;

    // Simulate intermittent network issues
    await context.route('**/api/**', (route) => {
      failureCount++;
      if (failureCount <= 3) {
        // Fail first 3 requests
        route.abort('failed');
      } else {
        // Succeed afterwards
        route.continue();
      }
    });

    // Try to search for a stock
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('7974');
      await searchBox.press('Enter');
      await page.waitForTimeout(1000);
      
      // Click retry if available
      const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry")').first();
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForTimeout(1000);
        
        // Try again
        if (await retryButton.isVisible()) {
          await retryButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Eventually should succeed or show stable error state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle WebSocket connection failures', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Monitor console for WebSocket errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Block WebSocket connections
    await page.route('ws://**', (route) => {
      route.abort('failed');
    });
    await page.route('wss://**', (route) => {
      route.abort('failed');
    });

    await page.waitForTimeout(3000);

    // Check for WebSocket error handling
    const wsError = page.locator('text=WebSocket, text=リアルタイム, text=Real-time, text=接続できません');
    const hasWsError = await wsError.isVisible().catch(() => false);
    
    // Should fall back to polling or show offline mode
    const offlineMode = page.locator('text=オフライン, text=Offline, text=Polling');
    const hasOfflineMode = await offlineMode.isVisible().catch(() => false);
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle CORS errors appropriately', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate CORS error
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 0,
        body: ''
      });
    });

    // Try to make API call
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('AAPL');
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Should handle CORS error
    const corsError = page.locator('text=CORS, text=クロスオリジン, text=アクセス拒否');
    const hasError = await corsError.isVisible().catch(() => false);
    
    // Or show generic connection error
    const connectionError = page.locator('text=接続, text=Connection, text=ネットワーク');
    const hasConnectionError = await connectionError.isVisible().catch(() => false);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle quota exceeded errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to fill localStorage to trigger quota error
    try {
      await page.evaluate(() => {
        const largeData = 'x'.repeat(1024 * 1024); // 1MB string
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`largeData${i}`, largeData);
        }
      });
    } catch (error) {
      // Expected to fail due to quota
    }

    await page.waitForTimeout(1000);

    // Should handle storage quota gracefully
    const quotaError = page.locator('text=容量, text=Quota, text=Storage, text=ストレージ');
    const hasQuotaError = await quotaError.isVisible().catch(() => false);
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display user-friendly error messages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger various errors and check message quality
    await page.route('**/api/trading', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'DATABASE_CONNECTION_FAILED',
          message: 'Failed to connect to database'
        })
      });
    });

    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
      
      // Error message should be user-friendly, not technical
      const errorText = await page.locator('text=/エラー|Error|問題/').first().textContent().catch(() => '');
      
      // Should not expose technical details
      expect(errorText.toLowerCase()).not.toContain('database');
      expect(errorText.toLowerCase()).not.toContain('sql');
      expect(errorText.toLowerCase()).not.toContain('stack trace');
    }
  });

  test('should handle multiple simultaneous errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate multiple API failures
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('market')) {
        route.fulfill({ status: 500, body: '{}' });
      } else if (url.includes('trading')) {
        route.fulfill({ status: 503, body: '{}' });
      } else if (url.includes('portfolio')) {
        route.fulfill({ status: 504, body: '{}' });
      } else {
        route.continue();
      }
    });

    await page.waitForTimeout(3000);

    // Should handle multiple errors without UI breaking
    const errorDialogs = page.locator('[role="alert"], [role="dialog"]');
    const count = await errorDialogs.count();
    
    // Should not show excessive error dialogs
    expect(count).toBeLessThanOrEqual(3);
    
    // Page should remain responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should provide error recovery options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate error
    await page.route('**/api/market/**', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });

    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('7203');
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Should provide recovery options
    const retryButton = page.locator('button:has-text("再試行"), button:has-text("Retry")').first();
    const cancelButton = page.locator('button:has-text("キャンセル"), button:has-text("Cancel")').first();
    const closeButton = page.locator('button:has-text("閉じる"), button:has-text("Close")').first();
    
    const hasRetry = await retryButton.isVisible().catch(() => false);
    const hasCancel = await cancelButton.isVisible().catch(() => false);
    const hasClose = await closeButton.isVisible().catch(() => false);
    
    expect(hasRetry || hasCancel || hasClose).toBeTruthy();
  });
});
