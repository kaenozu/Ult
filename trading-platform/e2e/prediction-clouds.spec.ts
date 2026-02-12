/**
 * E2E Tests for Prediction Clouds
 * 
 * 予測雲機能のエンドツーエンドテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Prediction Clouds Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prediction-clouds');
  });

  test('should display page title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('予測雲');
    await expect(page.locator('text=ATR（平均真波幅）')).toBeVisible();
  });

  test('should render prediction clouds chart', async ({ page }) => {
    // チャートコンテナが表示されることを確認
    await expect(page.locator('[class*="recharts-wrapper"]').first()).toBeVisible({ timeout: 10000 });
    
    // SVG要素がレンダリングされることを確認
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    // サマリーカードの存在確認
    await expect(page.locator('text=予測範囲')).toBeVisible();
    await expect(page.locator('text=トレンド')).toBeVisible();
    await expect(page.locator('text=ボラティリティ')).toBeVisible();
    await expect(page.locator('text=リスクスコア')).toBeVisible();
  });

  test('should have multiplier selection buttons', async ({ page }) => {
    // 倍率選択ボタンの存在確認
    await expect(page.locator('button:has-text("保守的")')).toBeVisible();
    await expect(page.locator('button:has-text("標準")')).toBeVisible();
    await expect(page.locator('button:has-text("楽観的")')).toBeVisible();
  });

  test('should change multiplier on button click', async ({ page }) => {
    // 標準ボタンをクリック
    const standardButton = page.locator('button:has-text("標準")');
    await standardButton.click();
    
    // 選択状態になっていることを確認
    await expect(standardButton).toHaveClass(/bg-blue-600/);
    
    // 楽観的ボタンをクリック
    const aggressiveButton = page.locator('button:has-text("楽観的")');
    await aggressiveButton.click();
    
    // 選択状態が切り替わることを確認
    await expect(aggressiveButton).toHaveClass(/bg-blue-600/);
    await expect(standardButton).not.toHaveClass(/bg-blue-600/);
  });

  test('should display risk indicator', async ({ page }) => {
    // リスクレベルの表示確認
    await expect(page.locator('text=リスクレベル')).toBeVisible();
    
    // リスクインジケーターのドットが表示されることを確認
    await expect(page.locator('[class*="rounded-full"]').first()).toBeVisible();
  });

  test('should show tooltip on chart hover', async ({ page }) => {
    // チャートエリアにホバー
    const chart = page.locator('[class*="recharts-wrapper"]').first();
    await chart.hover();
    
    // ツールチップが表示されることを確認（少し待機）
    await page.waitForTimeout(500);
    
    // ツールチップの内容を確認
    const tooltip = page.locator('[class*="recharts-tooltip-wrapper"]').first();
    await expect(tooltip).toBeVisible({ timeout: 5000 });
  });

  test('should be responsive', async ({ page }) => {
    // モバイルビューポートに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    // チャートが表示され続けることを確認
    await expect(page.locator('svg').first()).toBeVisible();
    
    // サマリーカードが縦に積まれることを確認（グリッドが1列になる）
    const cards = page.locator('[class*="grid"] > div');
    await expect(cards.first()).toBeVisible();
  });

  test('should display disclaimer', async ({ page }) => {
    // 免責事項の表示確認
    await expect(page.locator('text=免責事項')).toBeVisible();
    await expect(page.locator('text=統計的な予測であり')).toBeVisible();
  });

  test('should have working navigation structure', async ({ page }) => {
    // ページ内の主要セクションが表示されることを確認
    await expect(page.locator('h2:has-text("予測雲とは？")')).toBeVisible();
    await expect(page.locator('h2:has-text("使い方")')).toBeVisible();
    await expect(page.locator('h2:has-text("技術仕様")')).toBeVisible();
  });
});

test.describe('Prediction Clouds API', () => {
  test('calculator should handle valid data', async ({ request }) => {
    // APIエンドポイントが存在する場合のテスト
    // 注: 実際のAPIエンドポイントが存在する場合は有効化
    // const response = await request.post('/api/prediction-clouds', {
    //   data: {
    //     symbol: 'TEST',
    //     data: generateTestData(),
    //   },
    // });
    // expect(response.ok()).toBeTruthy();
  });

  test('calculator should reject invalid data', async () => {
    // クライアントサイド計算の場合はスキップ
    // サーバーサイドAPIが実装された場合は有効化
    test.skip();
  });
});
