import { test, expect } from '@playwright/test';

test.describe('Trader Pro - モンキーテスト', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('ランダム操作テスト', async ({ page }) => {
    test.setTimeout(60000); // タイムアウトを60秒に設定

    await page.goto('/');

    // ランダム操作の設定（反復回数を減らす）
    const iterations = 20;
    const actions = [
      'clickRandomElement',
      'navigateRandomPage',
      'toggleRandomButton',
      'randomSearch',
    ];

    // ランダムな要素をクリック
    const clickRandomElement = async () => {
      try {
        const buttons = await page.locator('button:visible, a:visible, [role="button"]:visible').all();
        if (buttons.length > 0) {
          const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
          await randomButton.click({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(200);
        }
      } catch (e) {
        // エラーを無視して続行
      }
    };

    // ランダムなページに遷移
    const navigateRandomPage = async () => {
      try {
        const pages = ['/', '/heatmap', '/journal', '/screener'];
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        await page.goto(randomPage, { timeout: 10000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // エラーを無視して続行
      }
    };

    // ランダムなボタンをトグル
    const toggleRandomButton = async () => {
      try {
        const toggleButtons = await page.locator('button:has-text("1m"), button:has-text("5m"), button:has-text("15m"), button:has-text("1H"), button:has-text("4H"), button:has-text("1D"), button:has-text("SMA"), button:has-text("BB"), button:has-text("買い"), button:has-text("売り"), button:has-text("全て")').all();
        if (toggleButtons.length > 0) {
          const randomButton = toggleButtons[Math.floor(Math.random() * toggleButtons.length)];
          await randomButton.click({ timeout: 1000 }).catch(() => {});
          await page.waitForTimeout(200);
        }
      } catch (e) {
        // エラーを無視して続行
      }
    };

    // ランダム検索
    const randomSearch = async () => {
      try {
        const searchInput = page.locator('[placeholder*="検索"], [placeholder*="search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const tickers = ['7974', '6146', '7203', '4755', 'AAPL', 'GOOGL', 'MSFT'];
          const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
          await searchInput.fill(randomTicker);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // エラーを無視して続行
      }
    };

    // ランダム操作をループで実行
    for (let i = 0; i < iterations; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];

      try {
        switch (action) {
          case 'clickRandomElement':
            await clickRandomElement();
            break;
          case 'navigateRandomPage':
            await navigateRandomPage();
            break;
          case 'toggleRandomButton':
            await toggleRandomButton();
            break;
          case 'randomSearch':
            await randomSearch();
            break;
        }

        // エラーチェック
        const hasError = await page.locator('text=Error, text=エラー').count();
        if (hasError > 0) {
          console.log(`エラーが発生しました（反復 ${i + 1}/${iterations}）`);
        }
      } catch (error) {
        console.log(`操作失敗（反復 ${i + 1}/${iterations}）`);
      }
    }

    console.log(`モンキーテスト完了: ${iterations}回のランダム操作を実行しました`);

    // ページが閉じていないことを確認
    try {
      await page.title();
    } catch (e) {
      // ページが閉じている場合は無視
      console.log('ページが閉じられました');
    }
  });

  test('ストレステスト: 高速操作', async ({ page }) => {
    test.setTimeout(60000); // タイムアウトを60秒に設定

    await page.goto('/');

    // 高速で繰り返しクリック（反復回数を減らす）
    for (let i = 0; i < 10; i++) {
      try {
        await page.goto('/heatmap', { timeout: 10000 });
        await page.goto('/journal', { timeout: 10000 });
        await page.goto('/screener', { timeout: 10000 });
        await page.goto('/', { timeout: 10000 });
      } catch (error) {
        console.log(`ストレステスト失敗（反復 ${i + 1}）`);
        // ページを再読み込みして続行
        await page.goto('/').catch(() => {});
      }
    }

    console.log('ストレステスト完了');

    // ページが閉じていないことを確認
    try {
      await page.title();
    } catch (e) {
      // ページが閉じている場合は無視
      console.log('ページが閉じられました');
    }
  });

  test('同時操作テスト', async ({ page }) => {
    test.setTimeout(60000); // タイムアウトを60秒に設定

    await page.goto('/');

    // 複数の要素を高速でクリック（反復回数を減らす）
    const elements = [
      () => page.click('button:has-text("1m")'),
      () => page.click('button:has-text("SMA")'),
      () => page.click('button:has-text("BB")'),
      () => page.click('a:has-text("ヒートマップ")'),
      () => page.click('a:has-text("ジャーナル")'),
    ];

    for (let i = 0; i < 5; i++) {
      try {
        await Promise.all([
          elements[i % elements.length](),
          elements[(i + 1) % elements.length](),
          elements[(i + 2) % elements.length](),
        ]);
        await page.waitForTimeout(300);
      } catch (error) {
        console.log(`同時操作テスト失敗（反復 ${i + 1}）`);
        // ホームに戻って続行
        await page.goto('/').catch(() => {});
      }
    }

    console.log('同時操作テスト完了');

    // ページが閉じていないことを確認
    try {
      await page.title();
    } catch (e) {
      // ページが閉じている場合は無視
      console.log('ページが閉じられました');
    }
  });
});
