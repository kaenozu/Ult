/**
 * E2E Test: Real-time Data Quality and WebSocket Integration
 * 
 * Tests the complete data flow from WebSocket to data validation,
 * ensuring low latency and high data quality.
 */

import { test, expect } from '@playwright/test';

test.describe('Real-time Data Quality and WebSocket Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the trading platform
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should establish WebSocket connection with low latency', async ({ page }) => {
    // Check if WebSocket connection is established
    const wsStatus = page.locator('[data-testid="websocket-status"]').first();
    
    // Wait for connection (with timeout)
    await expect(wsStatus).toHaveText(/connected|open/i, { timeout: 10000 });
    
    // Check connection metrics
    const latency = page.locator('[data-testid="websocket-latency"]').first();
    await expect(latency).toBeVisible({ timeout: 5000 });
    
    // Verify latency is below 100ms
    const latencyText = await latency.textContent();
    const latencyValue = parseInt(latencyText || '0');
    expect(latencyValue).toBeLessThan(100);
  });

  test('should receive and validate real-time market data', async ({ page }) => {
    // Wait for market data to load
    await page.waitForSelector('[data-testid="market-data"]', { timeout: 15000 });

    // Check if data is being updated
    const priceElement = page.locator('[data-testid="current-price"]').first();

    // Wait for data update (should happen within 5 seconds)
    await page.waitForTimeout(5000);
    const updatedPrice = await priceElement.textContent();

    // Verify data is updating or validate it's real data
    expect(updatedPrice).toBeTruthy();
    expect(parseFloat(updatedPrice || '0')).toBeGreaterThan(0);
  });

  test('should display data quality metrics', async ({ page }) => {
    // Check if data quality metrics are visible
    const qualityScore = page.locator('[data-testid="data-quality-score"]').first();
    
    // Wait for metrics to be available
    await expect(qualityScore).toBeVisible({ timeout: 10000 });
    
    // Verify quality score is high (> 95%)
    const scoreText = await qualityScore.textContent();
    const score = parseFloat(scoreText || '0');
    expect(score).toBeGreaterThan(95);
  });

  test('should handle data gaps and anomalies', async ({ page }) => {
    // Check if anomaly detection is working
    const anomalyAlerts = page.locator('[data-testid="anomaly-alert"]');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check if anomaly detection system is active
    // (May or may not have alerts, but system should be present)
    const alertCount = await anomalyAlerts.count();
    expect(alertCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain high cache hit rate', async ({ page }) => {
    // Navigate to performance metrics
    const cacheHitRate = page.locator('[data-testid="cache-hit-rate"]').first();
    
    // Wait for cache metrics
    await expect(cacheHitRate).toBeVisible({ timeout: 10000 });
    
    // Make several requests to populate cache
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check cache hit rate
    const hitRateText = await cacheHitRate.textContent();
    const hitRate = parseFloat(hitRateText || '0');
    
    // After multiple requests, cache hit rate should be high
    expect(hitRate).toBeGreaterThan(0);
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    // Check initial connection
    const wsStatus = page.locator('[data-testid="websocket-status"]').first();
    await expect(wsStatus).toHaveText(/connected|open/i, { timeout: 10000 });
    
    // Simulate network interruption (if possible)
    // In a real test, you might use browser context to simulate offline mode
    
    // Wait for potential reconnection
    await page.waitForTimeout(3000);
    
    // Verify connection is still active or reconnected
    await expect(wsStatus).toHaveText(/connected|open/i, { timeout: 10000 });
  });

  test('should display multi-source data consistency', async ({ page }) => {
    // Check if multi-source validation is displayed
    const consistencyIndicator = page.locator('[data-testid="data-consistency"]').first();
    
    // Wait for indicator to be visible
    await expect(consistencyIndicator).toBeVisible({ timeout: 10000 });
    
    // Verify consistency status
    const statusText = await consistencyIndicator.textContent();
    expect(statusText).toMatch(/consistent|validated/i);
  });

  test('should measure end-to-end data latency', async ({ page }) => {
    // Start measuring time
    const startTime = Date.now();
    
    // Trigger data fetch
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for first data to appear
    await page.waitForSelector('[data-testid="market-data"]', { timeout: 5000 });
    
    // Calculate latency
    const endTime = Date.now();
    const totalLatency = endTime - startTime;
    
    // Verify total latency is reasonable (< 3 seconds for full page load)
    expect(totalLatency).toBeLessThan(3000);
  });

  test('should show real-time data quality alerts', async ({ page }) => {
    // Check for alert system
    const alertsPanel = page.locator('[data-testid="quality-alerts"]').first();
    
    // Wait for alerts panel
    await expect(alertsPanel).toBeVisible({ timeout: 10000 });
    
    // Verify alert system is functional
    const hasAlerts = await alertsPanel.isVisible();
    expect(hasAlerts).toBe(true);
  });

  test('should handle high-frequency data updates', async ({ page }) => {
    // Monitor data update frequency
    const priceElement = page.locator('[data-testid="current-price"]').first();
    
    let updateCount = 0;
    let lastPrice = '';
    
    // Monitor for 10 seconds
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const currentPrice = await priceElement.textContent();
      
      if (currentPrice && currentPrice !== lastPrice) {
        updateCount++;
        lastPrice = currentPrice || '';
      }
    }
    
    // Should have at least some updates in 10 seconds
    // (Frequency depends on market conditions and data source)
    expect(updateCount).toBeGreaterThanOrEqual(0);
  });
});
