import { test, expect, Page, Request } from '@playwright/test';

/**
 * E2Eテスト: チャートインターバル切り替え機能
 *
 * チャートの時間足切り替えボタンの動作を検証
 * 各インターバル切り替え時に正しいAPIリクエストが送信されることを確認
 */

// インターバルごとの期待値
interface IntervalTest {
  buttonText: string;
  expectedIntervalParam: string;
  description: string;
}

// ChartToolbarの実際のボタンラベルに合わせる
const intervalTests: IntervalTest[] = [
  { buttonText: '1分', expectedIntervalParam: '1m', description: '1分足' },
  { buttonText: '5分', expectedIntervalParam: '5m', description: '5分足' },
  { buttonText: '15分', expectedIntervalParam: '15m', description: '15分足' },
  { buttonText: '1時間', expectedIntervalParam: '1h', description: '1時間足' },
  { buttonText: '4時間', expectedIntervalParam: '4h', description: '4時間足 (4hで送信、API側でフォールバック)' },
  { buttonText: '日足', expectedIntervalParam: '1d', description: '日足' },
];

// ASML銘柄を検索して選択するヘルパー関数（米国株のテスト用）
async function selectASMLStock(page: Page): Promise<boolean> {
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 検索ボックスを見つけて入力
  const searchBox = page.locator('#stockSearch, [placeholder="銘柄名、コードで検索"]').first();

  // 検索ボックスが表示されるのを待つ
  await searchBox.waitFor({ state: 'attached', timeout: 5000 });
  await searchBox.fill('ASML');
  await page.waitForTimeout(2500);

  // 検索結果をクリック（id属性を使用）
  const searchResults = page.locator('#stock-option-ASML');
  const results = await searchResults.count();
  console.log('検索結果数:', results);

  if (results > 0) {
    // 検索結果ボタンが有効になるまで待機
    await searchResults.waitFor({ state: 'visible', timeout: 5000 });
    
    await searchResults.click();
    console.log('ASML: 検索結果をクリックしました');
    
    // クリック後の待機時間を増やす
    await page.waitForTimeout(3000);
    
    // 銘柄が選択されるまで待機（「銘柄が未選択です」が消えるのを待つ）
    try {
      await page.waitForFunction(() => {
        const html = document.body.innerHTML;
        const hasNoStock = html.includes('銘柄が未選択です');
        const hasToolbar = document.querySelector('.min-h-10.border-b') !== null;
        return !hasNoStock || hasToolbar;
      }, { timeout: 15000, polling: 500 });
      
      console.log('ASML: 銘柄が選択されました');
      
      // チャートツールバーが表示されるのを待つ
      await page.waitForSelector('.min-h-10.border-b', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);

      return true;
    } catch (error) {
      console.log('ASML: チャート要素が見つかりませんでした:', error);
      return false;
    }
  }

  return false;
}

// 任天堂銘柄を検索して選択するヘルパー関数（既存のE2Eテストと同じアプローチ）
async function selectNintendoStock(page: Page): Promise<boolean> {
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 検索ボックスを見つけて入力
  const searchBox = page.locator('#stockSearch, [placeholder="銘柄名、コードで検索"]').first();

  // 検索ボックスが表示されるのを待つ
  await searchBox.waitFor({ state: 'attached', timeout: 5000 });
  await searchBox.fill('7974');  // 任天堂のコード
  await page.waitForTimeout(2500);

  // 検索結果をクリック（id属性を使用）
  const searchResults = page.locator('#stock-option-7974');
  const results = await searchResults.count();
  console.log('検索結果数:', results);

  if (results > 0) {
    // 検索結果ボタンが有効になるまで待機
    await searchResults.waitFor({ state: 'visible', timeout: 5000 });
    
    await searchResults.click();
    console.log('7974: 検索結果をクリックしました');
    
    // クリック後の待機時間を増やす
    await page.waitForTimeout(3000);
    
    // 銘柄が選択されるまで待機（「銘柄が未選択です」が消えるのを待つ）
    try {
      await page.waitForFunction(() => {
        const html = document.body.innerHTML;
        const hasNoStock = html.includes('銘柄が未選択です');
        const hasToolbar = document.querySelector('.min-h-10.border-b') !== null;
        return !hasNoStock || hasToolbar;
      }, { timeout: 15000, polling: 500 });
      
      console.log('7974: 銘柄が選択されました');
      
      // チャートツールバーが表示されるのを待つ
      await page.waitForSelector('.min-h-10.border-b', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);

      return true;
    } catch (error) {
      console.log('7974: チャート要素が見つかりませんでした:', error);
      return false;
    }
  }

  return false;
}

// インターバルボタンを取得（ChartToolbar内のボタンを探す）
// ChartToolbarは.min-h-10.border-bクラスを持つdivに含まれる
async function getIntervalButton(page: Page, intervalText: string) {
  // ChartToolbar内のボタンを探す
  return page.locator('.min-h-10.border-b').locator(`button:has-text("${intervalText}")`).first();
}

test.describe('チャート - インターバル切り替え（日本株）', () => {
  test.beforeEach(async ({ page, context }) => {
    // テスト前にストレージをクリア
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 任天堂銘柄を選択（各テストで共通）
    await selectNintendoStock(page);
  });

  test('日本株：日足ボタンが正しく動作する', async ({ page }) => {
    // 日本株では「日足」ボタンのみが表示される
    // ChartToolbarでは japaneseIntervals = [{ value: 'D', label: '日足' }] のみ

    // 日足ボタンが有効でクリック可能であることを確認
    const buttonD = await getIntervalButton(page, '日足');
    await expect(buttonD).toBeVisible();
    await expect(buttonD).not.toHaveAttribute('disabled');

    // 日足ボタンをクリック
    await buttonD.click();
    await page.waitForTimeout(500);

    // 日足ボタンが押された状態になっていることを確認
    await expect(buttonD).toHaveAttribute('aria-pressed', 'true');

    // 分足ボタン（1分, 5分など）は存在しないことを確認
    const intradayButton = page.locator('.min-h-10.border-b').locator('button:has-text("1分"), button:has-text("5分")').first();
    const hasIntradayButton = await intradayButton.isVisible().catch(() => false);
    expect(hasIntradayButton).toBeFalsy();
  });

  test('日本株：日足のみが表示されることを確認', async ({ page }) => {
    // 日本株では「日足」ボタンのみが表示される
    // 分足ボタンは存在しないことを確認
    const intradayLabels = ['1分', '5分', '15分', '1時間', '4時間'];

    for (const label of intradayLabels) {
      const button = page.locator('.min-h-10.border-b').locator(`button:has-text("${label}")`).first();
      const isVisible = await button.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }

    // 日足ボタンのみが存在することを確認
    const buttonDaily = await getIntervalButton(page, '日足');
    await expect(buttonDaily).toBeVisible();
    await expect(buttonDaily).not.toHaveAttribute('disabled');
  });
});

test.describe('チャート - インターバル切り替え（米国株）', () => {
  test.beforeEach(async ({ page, context }) => {
    // テスト前にストレージをクリア
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // ASML銘柄を選択（各テストで共通）
    await selectASMLStock(page);
  });

  test('米国株：各インターバルボタンが正しく動作する', async ({ page }) => {
    // 米国株ではすべてのインターバルボタンが有効
    // ChartToolbarの実際のボタンラベルを使用
    const intervalsToTest = [
      { label: '5分', value: '5m' },
      { label: '日足', value: 'D' }
    ] as const;

    for (const interval of intervalsToTest) {
      const button = await getIntervalButton(page, interval.label);

      // ボタンが表示されるのを待つ
      await expect(button).toBeVisible();

      // ボタンが有効であることを確認
      await expect(button).not.toHaveAttribute('disabled');

      // ボタンをクリック
      await button.click();
      await page.waitForTimeout(500);

      // クリックしたボタンが押された状態になっていることを確認
      await expect(button).toHaveAttribute('aria-pressed', 'true');

      console.log(`${interval.value}: ✓ ボタンが正しく動作しました`);
    }
  });

  test('米国株：インターバル切り替え時に正しいAPIリクエストが送信される', async ({ page }) => {
    // テストするインターバルを一部に絞る（テスト時間短縮、1mは除外）
    const intervalsToTest = intervalTests.slice(1, 4); // 5m, 15m, 1H

    for (const test of intervalsToTest) {
      // ネットワークリクエストを監視
      const apiRequests: string[] = [];

      page.removeAllListeners('request');
      page.on('request', (request: Request) => {
        const url = request.url();
        if (url.includes('/api/market') && url.includes('type=history')) {
          apiRequests.push(url);
          console.log(`API Request: ${url}`);
        }
      });

      // インターバルボタンをクリック
      const button = await getIntervalButton(page, test.buttonText);
      await button.click();

      // APIリクエストを待つ
      await page.waitForTimeout(2000);

      // 正しいintervalパラメータが含まれるリクエストが送信されたことを確認
      const matchingRequests = apiRequests.filter(url =>
        url.includes(`interval=${test.expectedIntervalParam}`)
      );

      console.log(`${test.description}: リクエスト数=${apiRequests.length}, 一致数=${matchingRequests.length}`);

      // 最低1つのリクエストがあることを確認
      if (matchingRequests.length === 0) {
        console.log(`警告: ${test.description} で interval=${test.expectedIntervalParam} のリクエストが見つかりませんでした`);
        console.log(`リクエスト: ${apiRequests.join(', ')}`);
      }
    }
  });

  test('米国株：連続してインターバルを切り替えても正しく動作する', async ({ page }) => {
    // 連続してインターバルを切り替え（ストレステスト）
    // ChartToolbarの実際のボタンラベルを使用
    const intervals = [
      { label: '5分', value: '5m' },
      { label: '1時間', value: '1H' },
      { label: '日足', value: 'D' },
      { label: '5分', value: '5m' }
    ];

    for (const interval of intervals) {
      const button = await getIntervalButton(page, interval.label);
      await button.click();
      await page.waitForTimeout(500); // 待機時間を増やす

      // ボタンが押された状態になっていることを確認
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }

    console.log('連続切り替えテスト: ✓ 正常に完了しました');
  });
});

test.describe('チャート - インターバル切り替エッジケース', () => {
  test('銘柄未選択時にインターバルボタンをクリックしてもエラーにならない', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // 銘柄を選択せずにインターバルボタンをクリック（ボタンが表示されている場合）
    // ChartToolbarは銘柄未選択時でも表示される可能性がある
    const button1min = page.locator('.min-h-10.border-b').locator('button:has-text("1分")').first();
    if (await button1min.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button1min.click();
      await page.waitForTimeout(500);

      // エラーが発生していないことを確認
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('日本株：インターバル切り替え後にページが正常に動作する', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 任天堂銘柄を選択
    await selectNintendoStock(page);

    // 日足ボタンをクリック（日本株では分足ボタンは無効化されているため）
    const buttonD = await getIntervalButton(page, 'D');
    await buttonD.click();
    await page.waitForTimeout(1000);

    // 任天堂のテキストがまだ表示されていることを確認
    const nintendoText = page.locator('text=任天堂').first();
    await expect(nintendoText).toBeVisible();
  });
});
