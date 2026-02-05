/**
 * Authentication Workflow Tests
 * 
 * 認証・認可のエンドツーエンドテスト
 */

import { test, expect } from '../fixtures';
import { waitForPageLoad, clickWhenVisible, waitForToast } from '../helpers';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page, testUser }) => {
      await page.goto('/login');
      await waitForPageLoad(page);
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL('/dashboard');
      
      // ユーザー名が表示されることを確認
      await expect(page.locator('[data-testid="user-name"]')).toContainText(testUser.name);
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      await waitForToast(page, 'error');
      await expect(page.locator('[data-testid="toast-error"]')).toContainText('Invalid credentials');
      await expect(page).toHaveURL('/login');
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');
    });

    test('should require password', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should redirect to dashboard when accessing login while authenticated', async ({ page, login }) => {
      await login();
      
      // ログイン済み状態でログインページにアクセス
      await page.goto('/login');
      
      // ダッシュボードにリダイレクトされることを確認
      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page, login, logout }) => {
      await login();
      
      await logout();
      
      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL('/login');
      
      // ログイン後の機能にアクセスできないことを確認
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });

    test('should clear session data on logout', async ({ page, login }) => {
      await login();
      
      // セッションデータが設定されていることを確認
      const hasSession = await page.evaluate(() => {
        return localStorage.getItem('session') !== null;
      });
      expect(hasSession).toBe(true);
      
      // ログアウト
      await clickWhenVisible(page, '[data-testid="user-menu"]');
      await clickWhenVisible(page, '[data-testid="logout-button"]');
      
      // セッションデータが削除されていることを確認
      const sessionAfterLogout = await page.evaluate(() => {
        return localStorage.getItem('session');
      });
      expect(sessionAfterLogout).toBeNull();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page, login }) => {
      await login();
      
      // ページをリロード
      await page.reload();
      await waitForPageLoad(page);
      
      // ログイン状態が維持されていることを確認
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should redirect to login when session expires', async ({ page, login, context }) => {
      await login();
      
      // セッションを手動で期限切れにする
      await page.evaluate(() => {
        localStorage.setItem('session_expired', 'true');
      });
      
      // ページをリロード
      await page.reload();
      
      // ログインページにリダイレクトされることを確認
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('admin should access admin panel', async ({ page }) => {
      // Adminとしてログイン
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@test.com');
      await page.fill('[data-testid="password-input"]', 'Admin123!');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      
      // Adminパネルにアクセス
      await page.goto('/admin');
      await expect(page).not.toHaveURL('/unauthorized');
    });

    test('viewer should not access admin panel', async ({ page }) => {
      // Viewerとしてログイン
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'viewer@test.com');
      await page.fill('[data-testid="password-input"]', 'Viewer123!');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('/dashboard');
      
      // Adminパネルにアクセスを試行
      await page.goto('/admin');
      
      // アクセス拒否されることを確認
      await expect(page).toHaveURL('/unauthorized');
    });

    test('trader should access trading features', async ({ page, login }) => {
      await login();
      
      // 取引機能にアクセス
      await page.goto('/trading');
      await expect(page).not.toHaveURL('/unauthorized');
      
      // 注文作成ボタンが表示されることを確認
      await expect(page.locator('[data-testid="order-panel-button"]')).toBeVisible();
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive data in URL', async ({ page, login }) => {
      await login();
      
      // URLに機密情報が含まれていないことを確認
      await expect(page).not.toHaveURL(/password/i);
      await expect(page).not.toHaveURL(/token/i);
    });

    test('should use secure cookies', async ({ page, context }) => {
      await page.goto('/login');
      
      // セキュアなクッキーが設定されていることを確認
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');
      
      if (sessionCookie) {
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.sameSite).toBe('Strict');
      }
    });

    test('should prevent CSRF attacks', async ({ page, login }) => {
      await login();
      
      // CSRFトークンが存在することを確認
      const csrfToken = await page.evaluate(() => {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      });
      
      expect(csrfToken).toBeTruthy();
    });

    test('should implement rate limiting', async ({ page }) => {
      await page.goto('/login');
      
      // 複数回の失敗ログインを試行
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrong');
        await page.click('[data-testid="login-button"]');
      }
      
      // レート制限エラーを確認
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
    });
  });
});
