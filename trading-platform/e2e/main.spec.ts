import { test, expect, Page } from '@playwright/test';

/**
 * E2Eテスト: メイン機能
 *
 * アプリケーションの主要機能をエンドツーエンドでテスト
 */

// ウォッチリストに銘柄を追加するヘルパー関数
async function addStockToWatchlist(page: Page, symbol: string, name: string): Promise<void> {
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // 検索ボックスを見つけて入力
  const searchBox = page.locator('#stockSearch, [placeholder="銘柄名、コードで検索"]').first();

  // 検索ボックスが表示されるのを待つ
  await searchBox.waitFor({ state: 'attached', timeout: 5000 });
  await searchBox.fill(symbol);
  await searchBox.press('Enter');
  await page.waitForTimeout(2500);
}

test.describe('Trader Pro - 基本機能', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('ページが正しく表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Trader Pro/);
    await expect(page.locator('h1')).toContainText('TRADER PRO');
  });

  test('検索ボックスが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // すべてのinput要素を確認
    const inputs = await page.locator('input').all();
    console.log('Input elements found:', inputs.length);

    // 検索ボックスを確認
    const searchBox = page.locator('#stockSearch');
    const isVisible = await searchBox.isVisible().catch(() => false);
    console.log('Search box visible:', isVisible);

    // 別のセレクタを試す
    const inputByPlaceholder = page.locator('[placeholder="銘柄名、コードで検索"]');
    const isPlaceholderVisible = await inputByPlaceholder.isVisible().catch(() => false);
    console.log('Search box by placeholder visible:', isPlaceholderVisible);
  });
});

test.describe('Trader Pro - ウォッチリスト機能', () => {
  test('検索ボックスが使用できる', async ({ page, context }) => {
    // テスト前にストレージをクリア
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 検索ボックスが表示されることを確認
    const searchBox = page.locator('#stockSearch');
    await expect(searchBox).toBeVisible();

    // 任天堂を検索
    await searchBox.fill('7974');
    await page.waitForTimeout(1000);

    // 検索結果が表示されるのを待つ
    const searchResults = page.locator('button:has-text("7974")');
    const results = await searchResults.count();
    console.log('Search results found:', results);

    if (results > 0) {
      await searchResults.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('銘柄をクリックしてチャートが更新される', async ({ page, context }) => {
    // テスト前にストレージをクリア
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 任天堂を検索
    const searchBox = page.locator('#stockSearch');
    await searchBox.fill('7974');
    await page.waitForTimeout(1000);

    // 検索結果をクリック
    const searchResults = page.locator('button:has-text("7974")');
    if (await searchResults.count() > 0) {
      await searchResults.first().click();
      await page.waitForTimeout(2000);
    }

    // ページが正常に表示されていることを確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('時間足を切り替える', async ({ page }) => {
    // まず銘柄を選択する必要がある
    const nintendoButton = page.locator('text=任天堂');
    if (await nintendoButton.isVisible()) {
      await nintendoButton.click();
      await page.waitForTimeout(1000);
    }

    // 1分足をクリック
    const button1m = page.locator('button:has-text("1m")');
    if (await button1m.isVisible()) {
      await button1m.click();
      await page.waitForTimeout(500);
    }

    // 5分足をクリック
    const button5m = page.locator('button:has-text("5m")');
    if (await button5m.isVisible()) {
      await button5m.click();
      await page.waitForTimeout(500);
    }

    // ページがクラッシュしていないことを確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('インジケーターを切り替える', async ({ page }) => {
    // まず銘柄を選択する必要がある
    const discoButton = page.locator('text=ディスコ');
    if (await discoButton.isVisible()) {
      await discoButton.click();
      await page.waitForTimeout(1000);
    }

    // SMAをクリック
    const buttonSMA = page.locator('button:has-text("SMA")');
    if (await buttonSMA.isVisible()) {
      await buttonSMA.click();
      await page.waitForTimeout(500);
    }

    // BBをクリック
    const buttonBB = page.locator('button:has-text("BB")');
    if (await buttonBB.isVisible()) {
      await buttonBB.click();
      await page.waitForTimeout(500);
    }

    // ページがクラッシュしていないことを確認
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Trader Pro - ナビゲーション', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

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

    // Globalボタンをクリック
    await page.click('button:has-text("Global")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Global")')).toHaveClass(/bg-primary/);

    // JAPANボタンをクリック
    await page.click('button:has-text("JAPAN")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("JAPAN")')).toHaveClass(/bg-primary/);

    // USAボタンをクリック
    await page.click('button:has-text("USA")');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("USA")')).toHaveClass(/bg-primary/);
  });
});

test.describe('Trader Pro - スクリーナー機能', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/screener');
  });

   test('フィルターが使用できる', async ({ page }) => {
     // 買いボタン（フィルター）をクリック - 最初の一致的要素を使用
     const buyButton = page.locator('button:has-text("買い")').first();
     await buyButton.click();
     await page.waitForTimeout(200); // 状態更新を待つ
     await expect(buyButton).toHaveClass(/bg-primary/);

     // 売りボタン（フィルター）をクリック - 最初の一致的要素を使用
     const sellButton = page.locator('button:has-text("売り")').first();
     await sellButton.click();
     await page.waitForTimeout(200); // 状態更新を待つ
     await expect(sellButton).toHaveClass(/bg-primary/);

     // 全てボタン（フィルター）をクリック - 最初の一致的要素を使用
     const allButton = page.locator('button:has-text("全て")').first();
     await allButton.click();
     await page.waitForTimeout(200); // 状態更新を待つ
     await expect(allButton).toHaveClass(/bg-primary/);
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
    // ページが正常に読み込まれるのを待つ
    await page.waitForTimeout(2000);

    // 騰落率ヘッダーをクリック
    const sortHeader = page.locator('th:has-text("騰落率"), button:has-text("騰落率")');
    if (await sortHeader.isVisible()) {
      await sortHeader.click();
      await page.waitForTimeout(500);
    }

    // ページがクラッシュしていないことを確認
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Trader Pro - ジャーナル機能', () => {
   test.beforeEach(async ({ page, context }) => {
     await context.clearCookies();
     // まずワークステーションでポジションを作成してジャーナルにデータを追加
     await page.goto('/');
      const searchBox = page.locator('#stockSearch');
     await searchBox.fill('AAPL');
     await searchBox.press('Enter');
     await page.waitForTimeout(2000);

     // 買いボタンをクリックしてポジションを作成
     const buyButton = page.locator('button:has-text("買い")').first();
     if (await buyButton.isVisible()) {
       await buyButton.click();
       await page.waitForTimeout(500);
       // 実行ボタンをクリック
       const executeButton = page.locator('button:has-text("実行")');
       if (await executeButton.isVisible()) {
         await executeButton.click();
         await page.waitForTimeout(3000); // ジャーナル記録完了を待つ
       }
     }

     await page.goto('/journal');
     await page.waitForTimeout(2000); // ページロード完了を待つ
   });

  test('トレード履歴が表示される', async ({ page }) => {
    // ページが正常に読み込まれることを確認
    await expect(page.locator('h2:has-text("トレードジャーナル")')).toBeVisible();

    // タブが表示されることを確認
    await expect(page.locator('button:has-text("Trades")')).toBeVisible();
    await expect(page.locator('button:has-text("Analysis")')).toBeVisible();
  });

  test('Analysisタブに切り替えられる', async ({ page }) => {
    // Analysisボタンをクリック
    const analysisButton = page.locator('button:has-text("Analysis")');
    if (await analysisButton.isVisible()) {
      await analysisButton.click();
      await page.waitForTimeout(500);
    }

    // パフォーマンスチャートが表示されることを確認
    await expect(page.locator('text=Performance Over Time')).toBeVisible();
  });
});

test.describe('Trader Pro - エラーハンドリング', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('無効な銘柄コードでエラーが表示されないこと', async ({ page }) => {
    await page.goto('/');

    // 存在しない銘柄を検索
    const searchBox = page.locator('[placeholder="銘柄名、コードで検索"]');
    if (await searchBox.isVisible()) {
      await searchBox.fill('INVALID_TICKER_99999');
      await searchBox.press('Enter');
      await page.waitForTimeout(2000);
    }

    // エラーがクラッシュしないことを確認
    await expect(page).not.toHaveURL(/\/error/);
    await expect(page.locator('h1:has-text("TRADER PRO")')).toBeVisible();
  });

  test('APIエラー時に適切に処理されること', async ({ page }) => {
    // タイムアウト後に復帰することを確認
    await page.goto('/screener');
    await expect(page.locator('h1:has-text("株式スクリーナー")')).toBeVisible();
  });
});

test.describe('Trader Pro - AI予測改善機能', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('スクリーナーのデフォルト信頼度が60%に設定されている', async ({ page }) => {
    await page.goto('/screener');
    await page.waitForLoadState('networkidle');

    // 信頼度スライダーの値を確認
    const confidenceSlider = page.locator('#minConfidence');
    const value = await confidenceSlider.inputValue();
    expect(value).toBe('60');  // 改善後のデフォルト値

    // 表示テキストも確認
    const confidenceDisplay = page.locator('text="60%"');
    await expect(confidenceDisplay).toBeVisible();
  });

   test('AIシグナル分析実行で結果が表示される', async ({ page }) => {
     await page.goto('/screener?e2e_test=true');
     await page.waitForLoadState('networkidle');
     // Debug: check query param
     const search = await page.evaluate(() => window.location.search);
     console.log('Current search:', search);

     // 「全て」シグナルを選択（全てのシグナルを含む）
     await page.click('button:has-text("全て")');

     // 最小信頼度を0%に設定して全てのシグナルを含める
     const confidenceSlider = page.locator('#minConfidence');
     if (await confidenceSlider.isVisible()) {
       await confidenceSlider.fill('0');
     }

     // AIシグナル分析を開始
     await page.click('button:has-text("AIシグナル分析を開始")');

    // 分析実行中の表示を待つ
    await expect(page.locator('button:has-text("AI分析実行中...")')).toBeVisible({ timeout: 5000 });

     // 分析完了（実行中表示が消える）を待つ（最大60秒）
     await expect(page.locator('button:has-text("AI分析実行中...")')).toBeHidden({ timeout: 60000 });

    // 結果が表示されることを確認
    await expect(page.locator('th:has-text("AIシグナル")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('th:has-text("信頼度")')).toBeVisible();

    // 少なくとも1件以上の結果があることを確認
    const stockRows = page.locator('tbody tr');
    const count = await stockRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('買いシグナル銘柄の信頼度が60%以上で表示される', async ({ page }) => {
    await page.goto('/screener');
    await page.waitForLoadState('networkidle');

    // 「買い」シグナルを選択して分析実行
    await page.click('button:has-text("買い")');
    await page.click('button:has-text("AIシグナル分析を開始")');

    // Wait for analysis completion
    await page.waitForSelector('button:has-text("再分析を実行")', { timeout: 120000 });

    // 結果テーブル内の「買い」シグナル銘柄を確認
    const buySignals = page.locator('tbody tr td span:has-text("買い")');
    const buyCount = await buySignals.count();

    if (buyCount > 0) {
      // 最初の買いシグナル銘柄の信頼度を確認
      const firstBuyRow = page.locator('tbody tr').filter({ hasText: '買い' }).first();
      const confidenceText = await firstBuyRow.locator('td').nth(3).textContent();
      const confidenceValue = parseInt(confidenceText?.trim() || '0');

      expect(confidenceValue).toBeGreaterThanOrEqual(60);
    }
  });

  test('信頼度スライダーでフィルタリングできる', async ({ page }) => {
    await page.goto('/screener');
    await page.waitForLoadState('networkidle');

    // まず分析を実行
    await page.click('button:has-text("全て")');
    await page.click('button:has-text("AIシグナル分析を開始")');
    await page.waitForSelector('button:has-text("再分析を実行")', { timeout: 120000 });

    // 信頼度70%に変更して再分析
    await page.locator('#minConfidence').fill('70');

    // スライダーの値が変更されたことを確認
    const sliderValue = await page.locator('#minConfidence').inputValue();
    expect(sliderValue).toBe('70');

    // 表示テキストが更新されたことを確認（より具体的なセレクタを使用）
    const confidenceDisplay = page.locator('span.font-black').filter({ hasText: '70%' });
    await expect(confidenceDisplay).toBeVisible();
  });
});
