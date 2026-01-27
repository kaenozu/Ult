import { test, expect } from '@playwright/test';

test.describe('Trader Pro - モンキーテスト', () => {
  test('ランダム操作テスト', async ({ page }) => {
    await page.goto('/');
    
    // ランダム操作の設定
    const iterations = 50;
    const actions = [
      'clickRandomElement',
      'navigateRandomPage',
      'toggleRandomButton',
      'randomSearch',
    ];

    // ランダムな要素をクリック
    const clickRandomElement = async () => {
      const buttons = await page.locator('button:visible, a:visible, [role="button"]:visible').all();
      if (buttons.length > 0) {
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        await randomButton.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    };

    // ランダムなページに遷移
    const navigateRandomPage = async () => {
      const pages = ['/', '/heatmap', '/journal', '/screener'];
      const randomPage = pages[Math.floor(Math.random() * pages.length)];
      await page.goto(randomPage);
      await page.waitForTimeout(1000);
    };

    // ランダムなボタンをトグル
    const toggleRandomButton = async () => {
      const toggleButtons = await page.locator('button:has-text("1m"), button:has-text("5m"), button:has-text("15m"), button:has-text("1H"), button:has-text("4H"), button:has-text("1D"), button:has-text("SMA"), button:has-text("BB"), button:has-text("買い"), button:has-text("売り"), button:has-text("全て")').all();
      if (toggleButtons.length > 0) {
        const randomButton = toggleButtons[Math.floor(Math.random() * toggleButtons.length)];
        await randomButton.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    };

    // ランダム検索
    const randomSearch = async () => {
      const searchInput = page.locator('[placeholder*="検索"], [placeholder*="search"]').first();
      if (await searchInput.isVisible().catch(() => false)) {
        const tickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
        const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
        await searchInput.fill(randomTicker);
        await page.press('[placeholder*="検索"], [placeholder*="search"]', 'Enter');
        await page.waitForTimeout(1000);
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
          await page.screenshot({ path: `monkey-test-error-${i + 1}.png` });
        }
      } catch (error) {
        console.log(`操作失敗（反復 ${i + 1}/${iterations}）:`, error);
        await page.screenshot({ path: `monkey-test-fail-${i + 1}.png` });
      }
    }

    console.log(`モンキーテスト完了: ${iterations}回のランダム操作を実行しました`);
  });

  test('ストレステスト: 高速操作', async ({ page }) => {
    await page.goto('/');
    
    // 高速で繰り返しクリック
    for (let i = 0; i < 20; i++) {
      try {
        await page.goto('/heatmap');
        await page.goto('/journal');
        await page.goto('/screener');
        await page.goto('/');
        await page.waitForTimeout(100);
      } catch (error) {
        console.log(`ストレステスト失敗（反復 ${i + 1}）:`, error);
      }
    }

    console.log('ストレステスト完了');
  });

  test('同時操作テスト', async ({ page }) => {
    await page.goto('/');
    
    // 複数の要素を高速でクリック
    const elements = [
      () => page.click('button:has-text("1m")'),
      () => page.click('button:has-text("SMA")'),
      () => page.click('button:has-text("BB")'),
      () => page.click('a:has-text("ヒートマップ")'),
      () => page.click('a:has-text("ジャーナル")'),
    ];

    for (let i = 0; i < 10; i++) {
      try {
        await Promise.all([
          elements[i % elements.length](),
          elements[(i + 1) % elements.length](),
          elements[(i + 2) % elements.length](),
        ]);
        await page.waitForTimeout(200);
      } catch (error) {
        console.log(`同時操作テスト失敗（反復 ${i + 1}）:`, error);
      }
    }

    console.log('同時操作テスト完了');
  });
});
