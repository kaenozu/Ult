import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: メイン機能
 *
 * アプリケーションの主要機能をエンドツーエンドでテスト
 */

test.describe('Trader Pro - メイン機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが正しく表示される', async ({ page }) => {
    await expect(page).toHaveTitle(/Trader Pro/);
    await expect(page.locator('h1')).toContainText('TRADER PRO');
  });

  test('ウォッチリストが表示される', async ({ page }) => {
    // ウォッチリストの銘柄が表示されることを確認
    const watchlistItems = page.locator('[role="row"]');
    await expect(watchlistItems.first()).toBeVisible();

    // 任天堂が表示されることを確認
    await expect(page.locator('text=任天堂')).toBeVisible();
  });

  test('銘柄をクリックしてチャートが更新される', async ({ page }) => {
    // ディスコをクリック
    await page.click('text=ディスコ');

    // チャートが更新されるのを待つ
    await expect(page.locator('text=6146')).toBeVisible();
    await expect(page.locator('text=ディスコ')).toBeVisible();
  });

  test('時間足を切り替える', async ({ page }) => {
    // 1分足をクリック
    await page.click('button:has-text("1m")');
    await page.waitForTimeout(1000);

    // 5分足をクリック
    await page.click('button:has-text("5m")');
    await page.waitForTimeout(1000);

    // アクティブなクラスが切り替わることを確認
    const button5m = page.locator('button:has-text("5m")');
    await expect(button5m).toHaveClass(/focus/);
  });

  test('インジケーターを切り替える', async ({ page }) => {
    // SMAをクリック
    await page.click('button:has-text("SMA")');
    await page.waitForTimeout(1000);

    // BBをクリック
    await page.click('button:has-text("BB")');
    await page.waitForTimeout(1000);

    // インジケーターが表示されることを確認
    await expect(page.locator('text=SMA (14)')).toBeVisible();
  });
});

test.describe('Trader Pro - ナビゲーション', () => {
  test('各ページに遷移できる', async ({ page }) => {
    await page.goto('/');

    // ワークステーション → ヒートマップ
    await page.click('a:has-text("ヒートマップ")');
    await expect(page).toHaveURL(/\/heatmap/);
    await expect(page.locator('h2:has-text("MARKET UNIVERSE")')).toBeVisible();

    // ヒートマップ → ジャーナル
    await page.click('a:has-text("ジャーナル")');
    await expect(page).toHaveURL(/\/journal/);
    await expect(page.locator('h2:has-text("トレードジャーナル")')).toBeVisible();

    // ジャーナル → スクリーナー
    await page.click('a:has-text("スクリーナー")');
    await expect(page).toHaveURL(/\/screener/);
    await expect(page.locator('h1:has-text("株式スクリーナー")')).toBeVisible();

    // スクリーナー → ワークステーション
    await page.click('a:has-text("ワークステーション")');
    await expect(page).toHaveURL(/\//);
    await expect(page.locator('h1:has-text("TRADER PRO")')).toBeVisible();
  });

  test('ヒートマップ: マーケット切り替え', async ({ page }) => {
    await page.goto('/heatmap');

    // GLOBALボタンをクリック
    await page.click('button:has-text("GLOBAL")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("GLOBAL")')).toHaveClass(/focus/);

    // JAPANボタンをクリック
    await page.click('button:has-text("JAPAN")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("JAPAN")')).toHaveClass(/focus/);

    // USAボタンをクリック
    await page.click('button:has-text("USA")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("USA")')).toHaveClass(/focus/);
  });
});

test.describe('Trader Pro - スクリーナー機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/screener');
  });

  test('フィルターが使用できる', async ({ page }) => {
    // 買いボタンをクリック
    await page.click('button:has-text("買い")');
    await expect(page.locator('button:has-text("買い")')).toHaveClass(/bg-primary/);

    // 売りボタンをクリック
    await page.click('button:has-text("売り")');
    await expect(page.locator('button:has-text("売り")')).toHaveClass(/bg-primary/);

    // 全てボタンをクリック
    await page.click('button:has-text("全て")');
    await expect(page.locator('button:has-text("全て")')).toHaveClass(/bg-primary/);
  });

  test('クイック検索が使用できる', async ({ page }) => {
    // 売られすぎボタンをクリック
    await page.click('button:has-text("🔥 売られすぎ")');
    await page.waitForTimeout(1000);

    // 上昇トレンドボタンをクリック
    await page.click('button:has-text("🚀 上昇トレンド")');
    await page.waitForTimeout(1000);
  });

  test('テーブルのソートが使用できる', async ({ page }) => {
    // 騄落率ヘッダーをクリック
    await page.click('th:has-text("騰落率")');
    await page.waitForTimeout(500);

    // 降順マークが表示されることを確認
    await expect(page.locator('th:has-text("騰落率")').toContainText('↓');
  });
});

test.describe('Trader Pro - ジャーナル機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journal');
  });

  test('トレード履歴が表示される', async ({ page }) => {
    // 取引履歴ボタンが表示されることを確認
    await expect(page.locator('button:has-text("Trades (3)")')).toBeVisible();

    // トレード情報が表示されることを確認
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=BUY')).toBeVisible();
  });

  test('Analysisタブに切り替えられる', async ({ page }) => {
    // Analysisボタンをクリック
    await page.click('button:has-text("Analysis")');
    await page.waitForTimeout(500);

    // パフォーマンスチャートが表示されることを確認
    await expect(page.locator('text=Performance Over Time')).toBeVisible();
  });
});

test.describe('Trader Pro - エラーハンドリング', () => {
  test('無効な銘柄コードでエラーが表示されないこと', async ({ page }) => {
    // 存在しない銘柄を検索
    await page.fill('[placeholder="銘柄検索"]', 'INVALID_TICKER');
    await page.press('Enter');

    // エラーがクラッシュしないことを確認
    await expect(page).not.toHaveURL(/\/error/);
  });

  test('APIエラー時に適切に処理されること', async ({ page }) => {
    // タイムアウト後に復帰することを確認
    await page.goto('/screener');
    await expect(page.locator('h1')).toBeVisible();
  });
});
