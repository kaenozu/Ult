/**
 * E2E Tests Index
 * 
 * Playwrightによるエンドツーエンドテストスイート
 */

// ワークフローテスト
export * from './specs/trading.spec';
export * from './specs/auth.spec';
export * from './specs/performance.spec';
export * from './specs/api.spec';

// フィクスチャ
export * from './fixtures';

// ヘルパー関数
export * from './helpers';

/**
 * E2Eテスト実行ガイド
 * 
 * 単一のテストファイルを実行:
 *   npm run test:e2e -- trading.spec.ts
 * 
 * UIモードで実行（デバッグ用）:
 *   npm run test:e2e:ui
 * 
 * ヘッドレスモードで実行:
 *   npm run test:e2e
 * 
 * 特定のブラウザで実行:
 *   npm run test:e2e -- --project=chromium
 * 
 * 並列実行（注意: データの独立性が必要）:
 *   PLAYWRIGHT_WORKERS=4 npm run test:e2e
 */
