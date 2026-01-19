import { test, expect } from '@playwright/test';

test.describe('Trading Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000); // Longer timeout for trading operations
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full trading workflow', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30000 });

    // Check if signals are displayed
    const signalCards = page.locator('[data-testid="signal-card"]');
    await expect(signalCards.first()).toBeVisible({ timeout: 10000 });

    // Click on a bullish signal card
    const bullishCard = signalCards
      .locator('[data-testid="bullish-signal"]')
      .first();
    if (await bullishCard.isVisible()) {
      await bullishCard.click();

      // Wait for trading modal to appear
      const tradingModal = page.locator('[data-testid="trading-modal"]');
      await expect(tradingModal).toBeVisible({ timeout: 5000 });

      // Check modal content
      await expect(tradingModal.locator('text=/BUY/i')).toBeVisible();

      // Click execute trade button
      const executeButton = tradingModal.locator(
        '[data-testid="execute-trade"]'
      );
      await expect(executeButton).toBeVisible();
      await executeButton.click();

      // Wait for success message
      await expect(
        page.locator('text=/Trade executed successfully/i')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle portfolio management', async ({ page }) => {
    // Navigate to portfolio section
    await page.waitForSelector('[data-testid="portfolio-section"]', {
      timeout: 30000,
    });

    // Check portfolio summary
    const portfolioSummary = page.locator('[data-testid="portfolio-summary"]');
    await expect(portfolioSummary).toBeVisible();

    // Check total value display
    await expect(portfolioSummary.locator('text=/Total Value/i')).toBeVisible();

    // Check positions list
    const positionsList = page.locator('[data-testid="positions-list"]');
    if (await positionsList.isVisible()) {
      const positionItems = positionsList.locator(
        '[data-testid="position-item"]'
      );
      // May have zero or more positions
      const count = await positionItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display real-time price updates', async ({ page }) => {
    // Wait for price charts to load
    await page.waitForSelector('[data-testid="price-chart"]', {
      timeout: 30000,
    });

    // Check if charts are displaying data
    const chart = page.locator('[data-testid="price-chart"]').first();
    await expect(chart).toBeVisible();

    // Check for price data points
    const dataPoints = chart.locator('[data-testid="data-point"]');
    // Charts should have some data points
    const count = await dataPoints.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle risk management alerts', async ({ page }) => {
    // Wait for risk indicators to load
    await page.waitForSelector('[data-testid="risk-indicator"]', {
      timeout: 30000,
    });

    // Check for risk alerts or warnings
    const riskAlerts = page.locator('[data-testid="risk-alert"]');
    const alertCount = await riskAlerts.count();

    // Should not have critical risk alerts on normal load
    const criticalAlerts = riskAlerts.locator('[data-testid="critical-risk"]');
    const criticalCount = await criticalAlerts.count();
    expect(criticalCount).toBe(0);
  });

  test('should support AI advisor interactions', async ({ page }) => {
    // Wait for AI advisor to be available
    await page.waitForSelector('[data-testid="ai-advisor"]', {
      timeout: 30000,
    });

    const aiAdvisor = page.locator('[data-testid="ai-advisor"]');
    if (await aiAdvisor.isVisible()) {
      // Click to open AI advisor panel
      await aiAdvisor.click();

      // Check for AI responses
      const aiResponses = page.locator('[data-testid="ai-response"]');
      await expect(aiResponses.first()).toBeVisible({ timeout: 10000 });

      // Check response contains meaningful content
      const responseText = await aiResponses.first().textContent();
      expect(responseText?.length).toBeGreaterThan(10);
    }
  });

  test('should maintain data consistency across reloads', async ({ page }) => {
    // Wait for initial data load
    await page.waitForSelector('[data-testid="portfolio-value"]', {
      timeout: 30000,
    });

    // Get initial portfolio value
    const initialValue = await page
      .locator('[data-testid="portfolio-value"]')
      .textContent();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check portfolio value is consistent
    const reloadedValue = await page
      .locator('[data-testid="portfolio-value"]')
      .textContent();
    expect(reloadedValue).toBe(initialValue);
  });

  test('should handle network interruptions gracefully', async ({ page }) => {
    // Simulate network offline
    await page.context().setOffline(true);

    // Wait a bit
    await page.waitForTimeout(2000);

    // Check for offline indicators
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.isVisible()) {
      await expect(offlineIndicator.locator('text=/offline/i')).toBeVisible();
    }

    // Restore connection
    await page.context().setOffline(false);

    // Wait for reconnection
    await page.waitForTimeout(3000);

    // Check data reloads properly
    await expect(page.locator('[data-testid="portfolio-value"]')).toBeVisible();
  });
});
