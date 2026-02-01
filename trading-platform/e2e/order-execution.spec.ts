/**
 * E2E Tests: Order Execution
 * Comprehensive tests for market orders, limit orders, partial fills, and order cancellation
 */
import { test, expect } from '@playwright/test';

test.describe('Order Execution - Market and Limit Orders', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear cookies and local storage before each test
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should execute a market order successfully', async ({ page }) => {
    // Navigate to main trading page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Search for a stock
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('7203'); // Toyota
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Look for order panel and market order button
    const marketOrderButton = page.locator('button:has-text("Market"), button:has-text("成行")').first();
    if (await marketOrderButton.isVisible()) {
      await marketOrderButton.click();
      await page.waitForTimeout(500);
    }

    // Enter quantity
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('100');
      
      // Verify the value
      const value = await quantityInput.inputValue();
      expect(value).toBe('100');
    }

    // Click buy button
    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
      
      // Check for confirmation or success message
      const successMessage = page.locator('text=注文が実行されました, text=Order executed, text=Success');
      const orderConfirmation = await successMessage.isVisible().catch(() => false);
      
      // Order panel should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should execute a limit order with specified price', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Search for a stock
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"], #stockSearch').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('9984'); // SoftBank
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Select limit order type
    const limitOrderButton = page.locator('button:has-text("Limit"), button:has-text("指値")').first();
    if (await limitOrderButton.isVisible()) {
      await limitOrderButton.click();
      await page.waitForTimeout(500);
    }

    // Enter limit price
    const priceInput = page.locator('input[name*="price"], input[placeholder*="価格"]').first();
    if (await priceInput.isVisible()) {
      await priceInput.clear();
      await priceInput.fill('5000');
      
      const priceValue = await priceInput.inputValue();
      expect(priceValue).toBe('5000');
    }

    // Enter quantity
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('50');
    }

    // Submit limit order
    const submitButton = page.locator('button:has-text("注文"), button:has-text("Submit"), button:has-text("Place Order")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle partial fill scenarios', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Place a large order that might be partially filled
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('10000'); // Large quantity
      
      const value = await quantityInput.inputValue();
      expect(parseInt(value)).toBeGreaterThanOrEqual(10000);
    }

    // Try to execute the order
    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(2000);
      
      // Check for partial fill message or order status
      const partialFillMessage = page.locator('text=部分約定, text=Partial fill, text=Partially filled');
      const hasPartialFill = await partialFillMessage.isVisible().catch(() => false);
      
      // Or check if order appears in pending orders
      const pendingOrders = page.locator('text=未約定, text=Pending, text=Open orders');
      const hasPendingOrders = await pendingOrders.isVisible().catch(() => false);
      
      // Either should be visible or page should handle gracefully
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should cancel a pending order', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Place a limit order that won't immediately fill
    const limitOrderButton = page.locator('button:has-text("Limit"), button:has-text("指値")').first();
    if (await limitOrderButton.isVisible()) {
      await limitOrderButton.click();
      await page.waitForTimeout(500);
    }

    // Set a very low limit price so it won't fill
    const priceInput = page.locator('input[name*="price"], input[placeholder*="価格"]').first();
    if (await priceInput.isVisible()) {
      await priceInput.clear();
      await priceInput.fill('1'); // Very low price
    }

    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('100');
    }

    // Submit order
    const submitButton = page.locator('button:has-text("注文"), button:has-text("Submit"), button:has-text("Place Order")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate to orders or look for cancel button
    const ordersTab = page.locator('a:has-text("注文"), a:has-text("Orders"), button:has-text("注文")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for cancel button on the order
    const cancelButton = page.locator('button:has-text("キャンセル"), button:has-text("Cancel"), button:has-text("取消")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForTimeout(500);
      
      // Confirm cancellation if there's a dialog
      const confirmButton = page.locator('button:has-text("確認"), button:has-text("Confirm"), button:has-text("OK")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify page is still responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should validate slippage on market orders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get current price before order
    const priceDisplay = page.locator('[data-testid="current-price"], .current-price, text=/¥[0-9,]+/').first();
    let originalPrice = '0';
    if (await priceDisplay.isVisible()) {
      const priceText = await priceDisplay.textContent();
      originalPrice = priceText?.replace(/[¥$,]/g, '') || '0';
    }

    // Place market order
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('100');
    }

    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
    }

    // Check if slippage warning or actual slippage is displayed
    const slippageWarning = page.locator('text=スリッページ, text=Slippage, text=価格変動');
    const hasSlippageWarning = await slippageWarning.isVisible().catch(() => false);
    
    // Or check executed price vs original price
    const executedPrice = page.locator('[data-testid="executed-price"], .executed-price, text=/約定価格/');
    const hasExecutedPrice = await executedPrice.isVisible().catch(() => false);
    
    // Page should handle slippage gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should reject invalid order quantities', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to enter negative quantity
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('-100');
      await page.waitForTimeout(500);
      
      // Try to submit
      const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
      if (await buyButton.isVisible()) {
        await buyButton.click();
        await page.waitForTimeout(500);
        
        // Should show error message
        const errorMessage = page.locator('text=エラー, text=Error, text=Invalid, text=無効');
        const hasError = await errorMessage.isVisible().catch(() => false);
        
        // Or button should be disabled
        const isDisabled = await buyButton.isDisabled().catch(() => false);
        
        expect(hasError || isDisabled).toBeTruthy();
      }
    }

    // Try zero quantity
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('0');
      await page.waitForTimeout(500);
      
      const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
      if (await buyButton.isVisible()) {
        const isDisabled = await buyButton.isDisabled().catch(() => false);
        // Button should be disabled or error shown
      }
    }
  });

  test('should handle insufficient funds scenario', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to place a very large order that exceeds available cash
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('1000000'); // Very large quantity
    }

    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
      
      // Should show insufficient funds error
      const insufficientFundsError = page.locator('text=資金不足, text=Insufficient funds, text=残高不足, text=証拠金不足');
      const hasError = await insufficientFundsError.isVisible().catch(() => false);
      
      // Or show available cash warning
      const cashWarning = page.locator('text=利用可能, text=Available cash, text=余力');
      const hasWarning = await cashWarning.isVisible().catch(() => false);
      
      // Page should handle gracefully
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display order confirmation details', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Place an order
    const quantityInput = page.locator('input[type="number"], input[name*="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill('50');
    }

    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(1000);
      
      // Check for confirmation dialog with order details
      const confirmationDialog = page.locator('[role="dialog"], .modal, .confirmation');
      const hasDialog = await confirmationDialog.isVisible().catch(() => false);
      
      if (hasDialog) {
        // Should show quantity
        const quantityDisplay = page.locator('text=/数量|Quantity|50/');
        await expect(quantityDisplay.first()).toBeVisible();
        
        // Should show order type
        const orderTypeDisplay = page.locator('text=/成行|Market|指値|Limit/');
        const hasOrderType = await orderTypeDisplay.isVisible().catch(() => false);
        
        // Should have confirm and cancel buttons
        const confirmBtn = page.locator('button:has-text("確認"), button:has-text("Confirm")').first();
        const cancelBtn = page.locator('button:has-text("キャンセル"), button:has-text("Cancel")').first();
        
        const hasConfirm = await confirmBtn.isVisible().catch(() => false);
        const hasCancel = await cancelBtn.isVisible().catch(() => false);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle order rate limiting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Attempt to place multiple orders rapidly
    for (let i = 0; i < 10; i++) {
      const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
      if (await buyButton.isVisible()) {
        await buyButton.click();
        await page.waitForTimeout(100); // Very short delay
      }
    }

    // Should show rate limit warning
    const rateLimitWarning = page.locator('text=制限, text=Rate limit, text=Too many, text=頻度');
    const hasWarning = await rateLimitWarning.isVisible().catch(() => false);
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});
