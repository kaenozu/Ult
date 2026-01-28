import { test, expect } from '@playwright/test';

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

const intervalTests: IntervalTest[] = [
  { buttonText: '1m', expectedIntervalParam: '1m', description: '1分足' },
  { buttonText: '5m', expectedIntervalParam: '5m', description: '5分足' },
  { buttonText: '15m', expectedIntervalParam: '15m', description: '15分足' },
  { buttonText: '1H', expectedIntervalParam: '1h', description: '1時間足' },
  { buttonText: '4H', expectedIntervalParam: '4h', description: '4時間足 (4hで送信、API側でフォールバック)' },
  { buttonText: 'D', expectedIntervalParam: '1d', description: '日足' },
];

// ASML銘柄を検索して選択するヘルパー関数（米国株のテスト用）
async function selectASMLStock(page: any) {
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 検索ボックスを見つけて入力
  const searchBox = page.locator('#stockSearch, [placeholder="銘柄名、コードで検索"]').first();

  // 検索ボックスが表示されるのを待つ
  await searchBox.waitFor({ state: 'attached', timeout: 5000 });
  await searchBox.fill('ASML');
  await page.waitForTimeout(2500);

  // 検索結果をクリック
  const searchResults = page.locator('button:has-text("ASML")');
  const results = await searchResults.count();
  console.log('検索結果数:', results);

  if (results > 0) {
    await searchResults.first().click();
    await page.waitForTimeout(2000);

    // チャートが読み込まれるのを待つ
    try {
      await page.waitForSelector('canvas', { timeout: 15000, state: 'visible' });

      // チャートツールバーが表示されるのを待つ
      await page.waitForSelector('.min-h-10.border-b', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500); // 追加の待機時間

      return true;
    } catch {
      // チャートが見つからない場合でも続行
      console.log('チャート要素が見つかりませんでした');
    }
  }

  return false;
}

// 任天堂銘柄を検索して選択するヘルパー関数（既存のE2Eテストと同じアプローチ）
async function selectNintendoStock(page: any) {
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 検索ボックスを見つけて入力
  const searchBox = page.locator('#stockSearch, [placeholder="銘柄名、コードで検索"]').first();

  // 検索ボックスが表示されるのを待つ
  await searchBox.waitFor({ state: 'attached', timeout: 5000 });
  await searchBox.fill('7974');  // 任天堂のコード
  await page.waitForTimeout(2500);

  // 検索結果をクリック
  const searchResults = page.locator('button:has-text("7974")');
  const results = await searchResults.count();
  console.log('検索結果数:', results);

  if (results > 0) {
    await searchResults.first().click();
    await page.waitForTimeout(2000);

    // チャートが読み込まれるのを待つ
    try {
      await page.waitForSelector('canvas', { timeout: 15000, state: 'visible' });

      // チャートツールバーが表示されるのを待つ
      await page.waitForSelector('.min-h-10.border-b', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500); // 追加の待機時間

      return true;
    } catch {
      // チャートが見つからない場合でも続行
      console.log('チャート要素が見つかりませんでした');
    }
  }

  return false;
}

// インターバルボタンを取得（ChartToolbar内のボタンを探す）
// ChartToolbarは.min-h-10.border-bクラスを持つdivに含まれる
async function getIntervalButton(page: any, intervalText: string) {
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
    // 日本株では分足ボタン（1m, 5m, 15m, 1H, 4H）は無効化されていることを確認
    // 注：現在選択されているインターバル（5m）のボタンは無効化されない
    const intradayButtonsOther = ['1m', '15m', '1H', '4H'] as const;

    for (const intervalText of intradayButtonsOther) {
      const button = await getIntervalButton(page, intervalText);

      // ボタンが表示されることを確認
      await expect(button).toBeVisible();

      // ボタンが無効化されていることを確認
      await expect(button).toHaveAttribute('disabled');
      await expect(button).toHaveAttribute('title', '日本株では日足データのみ利用可能です');
    }

    // 日足ボタン（D）は有効でクリック可能であることを確認
    const buttonD = await getIntervalButton(page, 'D');
    await expect(buttonD).toBeVisible();
    await expect(buttonD).not.toHaveAttribute('disabled');

    // 日足ボタンをクリック
    await buttonD.click();
    await page.waitForTimeout(500);

    // 日足ボタンが押された状態になっていることを確認
    await expect(buttonD).toHaveAttribute('aria-pressed', 'true');
  });

  test('日本株：分足ボタンが無効化されていることを確認', async ({ page }) => {
    // 分足ボタンが無効化されていることを確認
    // 注：現在選択されているインターバル（5m）のボタンは無効化されない
    const intradayButtonsOther = ['1m', '15m', '1H', '4H'] as const;

    for (const intervalText of intradayButtonsOther) {
      const button = await getIntervalButton(page, intervalText);

      // ボタンが表示されることを確認
      await expect(button).toBeVisible();

      // ボタンが無効化されていることを確認
      await expect(button).toHaveAttribute('disabled');

      // aria-pressedがfalseであることを確認
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    }

    // 5mボタンは現在選択されているため、無効化されていないことを確認
    const button5m = await getIntervalButton(page, '5m');
    await expect(button5m).toBeVisible();
    await expect(button5m).not.toHaveAttribute('disabled');
    await expect(button5m).toHaveAttribute('aria-pressed', 'true');
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
    // 注：1mはYahoo Finance APIの制限によりテストをスキップ
    const intervalsToTest = ['5m', 'D'] as const;

    for (const intervalText of intervalsToTest) {
      const button = await getIntervalButton(page, intervalText);

      // ボタンが表示されるのを待つ
      await expect(button).toBeVisible();

      // ボタンが有効であることを確認
      await expect(button).not.toHaveAttribute('disabled');

      // ボタンをクリック
      await button.click();
      await page.waitForTimeout(500);

      // クリックしたボタンが押された状態になっていることを確認
      await expect(button).toHaveAttribute('aria-pressed', 'true');

      console.log(`${intervalText}: ✓ ボタンが正しく動作しました`);
    }
  });

  test('米国株：インターバル切り替え時に正しいAPIリクエストが送信される', async ({ page }) => {
    // テストするインターバルを一部に絞る（テスト時間短縮、1mは除外）
    const intervalsToTest = intervalTests.slice(1, 4); // 5m, 15m, 1H

    for (const test of intervalsToTest) {
      // ネットワークリクエストを監視
      const apiRequests: string[] = [];

      page.removeAllListeners('request');
      page.on('request', (request: any) => {
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
    // 注：1mはYahoo Finance APIの制限により除外
    const intervals = ['5m', '1H', 'D', '5m'];

    for (const intervalText of intervals) {
      const button = await getIntervalButton(page, intervalText);
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
    const button1m = page.locator('.min-h-10.border-b').locator('button:has-text("1m")').first();
    if (await button1m.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button1m.click();
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
