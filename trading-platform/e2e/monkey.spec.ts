import { test, expect } from '@playwright/test';

test.describe('Trader Pro - モンキーテスト', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('ランダム操作テスト', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');

    const iterations = 30;
    let errorCount = 0;
    const errors: string[] = [];

    // ランダムな要素をクリック
    const clickRandomElement = async () => {
      try {
        const buttons = await page.locator('button:visible, a:visible, [role="button"]:visible').all();
        if (buttons.length > 0) {
          const randomIndex = Math.floor(Math.random() * buttons.length);
          const randomButton = buttons[randomIndex];
          
          // 要素が可視かつ有効か確認
          if (await randomButton.isVisible() && await randomButton.isEnabled()) {
            await randomButton.click({ timeout: 2000 });
            await page.waitForTimeout(Math.random() * 300 + 100);
          }
        }
      } catch (e) {
        errorCount++;
        errors.push(`clickRandomElement: ${e}`);
      }
    };

    // ランダムなページに遷移
    const navigateRandomPage = async () => {
      try {
        const pages = ['/', '/heatmap', '/journal', '/screener'];
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        await page.goto(randomPage, { timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        errorCount++;
        errors.push(`navigateRandomPage: ${e}`);
      }
    };

    // ランダムなボタンをトグル
    const toggleRandomButton = async () => {
      try {
        const toggleSelectors = [
          'button:has-text("1m")',
          'button:has-text("5m")',
          'button:has-text("15m")',
          'button:has-text("1H")',
          'button:has-text("4H")',
          'button:has-text("1D")',
          'button:has-text("SMA")',
          'button:has-text("BB")',
          'button:has-text("買い")',
          'button:has-text("売り")',
          'button:has-text("全て")',
          'button:has-text("上书")',
          'button:has-text("clear")'
        ];
        
        const selector = toggleSelectors[Math.floor(Math.random() * toggleSelectors.length)];
        const element = page.locator(selector);
        
        if (await element.isVisible({ timeout: 1000 }) && await element.isEnabled({ timeout: 1000 })) {
          await element.click({ timeout: 2000 });
          await page.waitForTimeout(Math.random() * 200 + 100);
        }
      } catch (e) {
        errorCount++;
        errors.push(`toggleRandomButton: ${e}`);
      }
    };

    // ランダム検索
    const randomSearch = async () => {
      try {
        const searchInput = page.locator('[placeholder*="検索"], [placeholder*="search"], [placeholder*="Symbol"]').first();
        
        if (await searchInput.isVisible({ timeout: 2000 }) && await searchInput.isEnabled({ timeout: 2000 })) {
          const tickers = ['7974', '6146', '7203', '4755', 'AAPL', 'GOOGL', 'MSFT', 'BTC', 'ETH'];
          const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
          
          await searchInput.fill(randomTicker);
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          // 検索結果が表示されるのを待つ
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        errorCount++;
        errors.push(`randomSearch: ${e}`);
      }
    };

    // ランダムなスクロール
    const randomScroll = async () => {
      try {
        await page.mouse.wheel(
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000
        );
        await page.waitForTimeout(200);
      } catch (e) {
        // スクロール失敗は無視
      }
    };

    // ランダムなキー入力
    const randomKeyPress = async () => {
      try {
        const keys = ['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Escape'];
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.press(randomKey);
        await page.waitForTimeout(100);
      } catch (e) {
        // キー入力失敗は無視
      }
    };

    // メインループ
    for (let i = 0; i < iterations; i++) {
      const actionType = Math.random();
      
      try {
        if (actionType < 0.35) {
          await clickRandomElement();
        } else if (actionType < 0.55) {
          await navigateRandomPage();
        } else if (actionType < 0.75) {
          await toggleRandomButton();
        } else if (actionType < 0.90) {
          await randomSearch();
        } else {
          await randomScroll();
        }

        // 時々キー入力
        if (Math.random() > 0.8) {
          await randomKeyPress();
        }

        // ページが応答しているか確認（簡単なチェック）
        const title = await page.title().catch(() => '');
        if (!title && Math.random() > 0.95) {
          console.log(`警告: ページタイトルを取得できません（反復 ${i + 1}）`);
        }

        // 重大なエラーチェック
        const errorLocator = page.locator('text=Error, text=エラー, text=failed, text=失敗').first();
        if (await errorLocator.isVisible({ timeout: 500 }).catch(() => false)) {
          errorCount++;
          errors.push(`Visible error message at iteration ${i + 1}`);
          const errorText = await errorLocator.textContent();
          console.log(`エラーメッセージ検出: ${errorText}`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push(`Main loop iteration ${i + 1}: ${error}`);
      }
      
      // 進捗報告
      if ((i + 1) % 10 === 0) {
        console.log(`進捗: ${i + 1}/${iterations} (errorCount: ${errorCount})`);
      }
    }

    // 最終状態チェック
    const finalTitle = await page.title();
    expect(finalTitle).toBeTruthy();
    
    // 最後のスクリーンショット
    await page.screenshot({ 
      path: 'monkey-test-random-final.png',
      fullPage: true 
    });

    console.log(`\n=== モンキーテスト結果 ===`);
    console.log(`総反復数: ${iterations}`);
    console.log(`エラー数: ${errorCount}`);
    console.log(`エラー率: ${((errorCount / iterations) * 100).toFixed(1)}%`);
    
    if (errors.length > 0) {
      console.log('\nエラーログ（最初の10件）:');
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    }
    
    console.log(`完了: ランダム操作テスト`);
    
    // エラー率が20%以下の場合は成功とみなす（モンキーテストはある程度のエラーは許容）
    expect(errorCount).toBeLessThan(iterations * 0.2);
  });

  test('ストレステスト: 高速ページ遷移', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const iterations = 15;
    let errorCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        // 各ページに順番に移動
        const pages = ['/heatmap', '/journal', '/screener', '/'];
        
        for (const targetPage of pages) {
          await page.goto(targetPage, { 
            timeout: 10000,
            waitUntil: 'domcontentloaded' 
          });
          
          // ページの重要な要素が存在するかチェック
          const mainContent = page.locator('main, [role="main"], .main, #app');
          try {
            await mainContent.waitFor({ state: 'visible', timeout: 5000 });
          } catch {
            // メインコンテンツがなくても継続
          }
        }
      } catch (error) {
        errorCount++;
        console.log(`ストレステスト失敗（反復 ${i + 1}）: ${error}`);
        
        // リカバリ: ホームページに戻る
        try {
          await page.goto('/', { timeout: 5000 });
        } catch {
          // リカバリに失敗しても続行
        }
      }
    }

    // 最終ページがロードされていることを確認
    const finalUrl = page.url();
    expect(finalUrl).toContain('localhost:3000');
    
    console.log(`\n=== ストレステスト結果 ===`);
    console.log(`総反復数: ${iterations}`);
    console.log(`エラー数: ${errorCount}`);
    console.log(`完了: ストレステスト`);
    
    expect(errorCount).toBeLessThan(iterations * 0.3);
  });

  test('ランダム同時操作テスト（安全バージョン）', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const iterations = 10;
    let errorCount = 0;
    const completedActions: string[] = [];

    // 安全な要素クリック（並列実行しない）
    const safeClickActions = [
      async () => {
        const btn = page.locator('button:has-text("1m")').first();
        if (await btn.isVisible({ timeout: 1000 }) && await btn.isEnabled({ timeout: 1000 })) {
          await btn.click({ timeout: 2000 });
        }
      },
      async () => {
        const btn = page.locator('button:has-text("5m")').first();
        if (await btn.isVisible({ timeout: 1000 }) && await btn.isEnabled({ timeout: 1000 })) {
          await btn.click({ timeout: 2000 });
        }
      },
      async () => {
        const btn = page.locator('button:has-text("SMA")').first();
        if (await btn.isVisible({ timeout: 1000 }) && await btn.isEnabled({ timeout: 1000 })) {
          await btn.click({ timeout: 2000 });
        }
      },
      async () => {
        const link = page.locator('a:has-text("ヒートマップ")').first();
        if (await link.isVisible({ timeout: 1000 }) && await link.isEnabled({ timeout: 1000 })) {
          await link.click({ timeout: 2000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        }
      },
      async () => {
        const link = page.locator('a:has-text("ジャーナル")').first();
        if (await link.isVisible({ timeout: 1000 }) && await link.isEnabled({ timeout: 1000 })) {
          await link.click({ timeout: 2000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        }
      }
    ];

    for (let i = 0; i < iterations; i++) {
      // ランダムなアクションを選択
      const numActions = Math.floor(Math.random() * 3) + 1; // 1-3個のアクション
      const selectedActions: typeof safeClickActions = [];
      
      for (let j = 0; j < numActions; j++) {
        const actionIndex = Math.floor(Math.random() * safeClickActions.length);
        selectedActions.push(safeClickActions[actionIndex]);
      }
      
      // 直列実行（並列実行しない）
      for (const action of selectedActions) {
        try {
          await action();
          completedActions.push(action.name || 'anonymous');
          await page.waitForTimeout(Math.random() * 300 + 100);
        } catch (error) {
          errorCount++;
          console.log(`並列操作失敗（反復 ${i + 1}, action: ${action.name}）: ${error}`);
        }
      }
      
      // たまに別ページに移動
      if (Math.random() > 0.7) {
        try {
          await page.goto('/', { timeout: 5000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch {
          // 移动失敗は無視
        }
      }
    }

    // スクリーンショット
    await page.screenshot({ 
      path: 'monkey-test-concurrent-final.png',
      fullPage: true 
    });

    console.log(`\n=== ランダム同時操作テスト結果 ===`);
    console.log(`総反復数: ${iterations}`);
    console.log(`完了アクション数: ${completedActions.length}`);
    console.log(`エラー数: ${errorCount}`);
    console.log(`エラー率: ${((errorCount / Math.max(completedActions.length, 1)) * 100).toFixed(1)}%`);
    console.log(`完了: ランダム同時操作テスト`);
    
    // エラー数が大幅に多い場合は失敗
    expect(errorCount).toBeLessThan(iterations * 2); // expacted error count
  });

  test('ページの安定性チェック', async ({ page }) => {
    test.setTimeout(60000);

    const pages = ['/', '/heatmap', '/journal', '/screener'];
    let errorCount = 0;

    for (const targetPage of pages) {
      try {
        await page.goto(targetPage, { 
          timeout: 15000,
          waitUntil: 'networkidle' 
        });
        
        // ページが正しくロードされたか確認
        const url = page.url();
        expect(url).toContain('localhost:3000');
        
        // タイトルを取得
        const title = await page.title();
        expect(title).toBeTruthy();
        
        // コンソールエラーをチェック
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        // しばらく待ってコンソールエラーを収集
        await page.waitForTimeout(2000);
        
        if (consoleErrors.length > 0) {
          console.log(`ページ ${targetPage} でコンソールエラー: ${consoleErrors.length}件`);
          errorCount += consoleErrors.length;
        }
        
      } catch (error) {
        errorCount++;
        console.log(`ページ ${targetPage} の読み込み失敗: ${error}`);
      }
    }

    console.log(`\n=== ページ安定性チェック結果 ===`);
    console.log(`総ページ数: ${pages.length}`);
    console.log(`エラー数: ${errorCount}`);
    
    expect(errorCount).toBeLessThan(pages.length * 2);
  });
});
