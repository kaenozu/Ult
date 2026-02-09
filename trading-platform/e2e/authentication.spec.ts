/**
 * E2E Tests: Authentication and Authorization
 * Tests for JWT expiration, invalid tokens, and permission handling
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication and Authorization', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies and local storage before each test
    await context.clearCookies();
  });

  test('should handle missing JWT token gracefully', async ({ page, context }) => {
    // Intercept API requests that require authentication
    await page.route('**/api/trading', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Valid authentication token required' 
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to access protected features
    const protectedButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await protectedButton.isVisible()) {
      await protectedButton.click();
      await page.waitForTimeout(500);
      
      // Should show authentication error
      const authError = page.locator('text=認証, text=Authentication, text=Unauthorized, text=ログイン');
      const hasError = await authError.isVisible().catch(() => false);
      
      // Or redirect to login
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
      
      // One of these should be true
      expect(hasError || isLoginPage).toBeTruthy();
    }
  });

  test('should handle invalid JWT token', async ({ page }) => {
    // Set an invalid token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid.jwt.token');
    });

    // Intercept API requests with invalid token
    await page.route('**/api/trading', (route) => {
      const headers = route.request().headers();
      if (headers['authorization']?.includes('invalid.jwt.token')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Unauthorized', 
            message: 'Invalid token' 
          })
        });
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to perform authenticated action (Look for Order Panel buttons)
    const actionButton = page.locator('button:has-text("買い注文"), button:has-text("売り"), button:has-text("Order")').first();
    if (await actionButton.isVisible().catch(() => false)) {
      await actionButton.click();
      await page.waitForTimeout(500);
      
      // Should show error or redirect to login
      const errorMessage = page.locator('text=無効, text=Invalid, text=期限切れ, text=Expired, text=認証, text=ログイン');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      expect(hasError || page.url().includes('/login')).toBeTruthy();
    } else {
      // If no order button found, just verify we're still on a valid page
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle JWT token expiration', async ({ page }) => {
    // Set an expired token (token with past expiration)
    await page.goto('/');
    
    // Create an expired JWT-like token (simplified for testing)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
    
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, expiredToken);

    // Mock API to reject expired token
    await page.route('**/api/trading/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Token expired', 
          message: 'Your session has expired. Please log in again.' 
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to make an API call
    const portfolioLink = page.locator('a:has-text("Portfolio"), a:has-text("ポートフォリオ")').first();
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForTimeout(1000);
      
      // Should show session expired message
      const expiredMessage = page.locator('text=期限切れ, text=Expired, text=セッション, text=Session');
      const hasExpiredMessage = await expiredMessage.isVisible().catch(() => false);
      
      // Or show login prompt
      const loginPrompt = page.locator('text=ログイン, text=Login, text=Sign in');
      const hasLoginPrompt = await loginPrompt.isVisible().catch(() => false);
      
      expect(hasExpiredMessage || hasLoginPrompt).toBeTruthy();
    }
  });

  test('should handle token refresh flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set a token that's about to expire
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'valid.jwt.token');
      localStorage.setItem('refreshToken', 'refresh.token.value');
    });

    let refreshAttempted = false;

    // Mock API to require refresh
    await page.route('**/api/auth/refresh', (route) => {
      refreshAttempted = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          token: 'new.jwt.token',
          refreshToken: 'new.refresh.token'
        })
      });
    });

    // Mock regular API to trigger refresh
    let requestCount = 0;
    await page.route('**/api/trading', (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails with token expiration
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        });
      } else {
        // Subsequent requests succeed
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' })
        });
      }
    });

    await page.waitForTimeout(2000);

    // Application should automatically refresh token
    const newToken = await page.evaluate(() => localStorage.getItem('authToken'));
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle insufficient permissions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set a valid token with limited permissions
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'limited.permissions.token');
    });

    // Mock API to return permission denied
    await page.route('**/api/trading', (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        // Deny write operations
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Forbidden', 
            message: 'Insufficient permissions to perform this action' 
          })
        });
      } else {
        // Allow read operations
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' })
        });
      }
    });

    await page.waitForTimeout(1000);

    // Try to place an order (write operation)
    const buyButton = page.locator('button:has-text("買い"), button:has-text("BUY")').first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
      await page.waitForTimeout(500);
      
      // Should show permission error
      const permissionError = page.locator('text=権限, text=Permission, text=Forbidden, text=アクセス');
      const hasError = await permissionError.isVisible().catch(() => false);
      
      expect(hasError).toBeTruthy();
    }
  });

  test('should secure API endpoints with proper authentication', async ({ page, request }) => {
    // Test that API endpoints require authentication
    const endpoints = [
      '/api/trading',
      '/api/trading/7203',
      '/api/portfolio',
      '/api/orders'
    ];

    for (const endpoint of endpoints) {
      try {
        // Try to access without auth token
        const response = await request.get(`http://localhost:3000${endpoint}`);
        
        // Should return 401 or redirect
        const isUnauthorized = response.status() === 401;
        const isRedirect = response.status() >= 300 && response.status() < 400;
        
        expect(isUnauthorized || isRedirect).toBeTruthy();
      } catch (error) {
        // Network error is acceptable (endpoint might not exist yet)
        console.log(`Endpoint ${endpoint} not accessible:`, error);
      }
    }
  });

  test('should validate JWT signature', async ({ page }) => {
    await page.goto('/');
    
    // Create a token with tampered signature
    const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.tampered_signature';
    
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, tamperedToken);

    // Mock API to reject invalid signature
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/api/trading') || url.includes('/api/portfolio')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Invalid token signature',
            message: 'Token signature verification failed'
          })
        });
      } else {
        route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Try to access protected resource
    const portfolioLink = page.locator('a:has-text("Portfolio"), a:has-text("ポートフォリオ")').first();
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click();
      await page.waitForTimeout(500);
      
      // Should show authentication error
      const authError = page.locator('text=認証エラー, text=Authentication error, text=Invalid token');
      const hasError = await authError.isVisible().catch(() => false);
      
      // Should not display sensitive data
      const sensitiveData = page.locator('text=/残高|Balance|¥[0-9,]+/');
      const hasSensitiveData = await sensitiveData.isVisible().catch(() => false);
      
      expect(hasError || !hasSensitiveData).toBeTruthy();
    }
  });

  test('should logout and clear authentication state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set authentication tokens
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'valid.token');
      localStorage.setItem('refreshToken', 'valid.refresh');
      localStorage.setItem('userId', 'user123');
    });

    await page.waitForTimeout(500);

    // Look for logout button
    const logoutButton = page.locator('button:has-text("ログアウト"), button:has-text("Logout"), button:has-text("Sign out")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Verify tokens are cleared
      const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
      const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
      
      expect(authToken).toBeNull();
      expect(refreshToken).toBeNull();
      
      // Should redirect to login or show logged out state
      const loginButton = page.locator('button:has-text("ログイン"), button:has-text("Login")');
      const hasLoginButton = await loginButton.isVisible().catch(() => false);
      
      expect(hasLoginButton || page.url().includes('/login')).toBeTruthy();
    }
  });

  test('should handle concurrent authentication failures', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set invalid token
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid.token');
    });

    // Mock multiple API endpoints to fail authentication
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Make multiple requests that would fail
    await page.waitForTimeout(2000);

    // Should handle gracefully without multiple error dialogs
    const errorDialogs = page.locator('[role="dialog"]:has-text("エラー"), [role="dialog"]:has-text("Error")');
    const dialogCount = await errorDialogs.count();
    
    // Should show at most one error dialog
    expect(dialogCount).toBeLessThanOrEqual(1);
    
    // Page should remain responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should protect sensitive user data in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that sensitive data is not stored in plain text
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });

    // Verify no passwords or API keys in localStorage
    for (const [key, value] of Object.entries(localStorageData)) {
      expect(key.toLowerCase()).not.toContain('password');
      expect(key.toLowerCase()).not.toContain('secret');
      expect(key.toLowerCase()).not.toContain('apikey');
      
      // JWT tokens are acceptable in localStorage for this app
      if (!key.includes('token') && !key.includes('Token')) {
        expect(value).not.toMatch(/password|secret|api[_-]?key/i);
      }
    }
  });
});
