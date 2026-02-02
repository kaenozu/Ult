# 🟠 HIGH: デバッグログが本番環境で残存

## 問題の説明

プロジェクト全体に無数の `console.log`、`console.error`、`console.warn` が散在しており、本番環境で排出され続けています。

```bash
$ grep -r "console\.log" trading-platform/app | wc -l
# 100+ 件検出
```

主な発生箇所：
- `app/lib/tradingCore/UnifiedTradingPlatform.ts:164, 194, 196`
- `app/lib/websocket-resilient.ts` 全体（50件以上）
- `scripts/benchmark/data-pipeline-benchmark.ts`（ベンチマーク用）
- `app/lib/backtest/WinningBacktestEngine.ts`（ログ过多）

## 影響範囲

- **カテゴリ**: セキュリティ / パフォーマンス
- **パフォーマンス**: 本番環境での不要なI/O、ログ肥大化
- **セキュリティ**: 機密情報（シンボル、価格、エラーメッセージ）がログ出力される可能性
- **可読性**: 実ログから重要情報が埋もれる
- **ディスク使用量**: ログファイル肥大化による diskspace 圧迫

## リスク

1. **情報漏洩**: ログに市場データ、取引シグナル、エラーメッセージ（内部構造含む）が含まれる
2. **パフォーマンス低下**: 高頻度の `console.log` がイベントループをブロック
3. **障害調査困難**: 重要ログがノイズに埋もれる
4. **コンプライアンス違反**: 機密取引データのログ保管要件に抵触する可能性

## 推奨修正

### 1. 構造化ロギング導入

`pino` または `winston` を導入：

```bash
npm install pino pino-pretty
```

`app/lib/logger.ts` 作成：

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : { target: 'pino-pretty' }
});

export const logger = logger;
```

### 2. 既存 `console.*` 置き換え

- 全ファイルで `import { logger } from '@/app/lib/logger'`
- `console.log(...)` → `logger.info(...)`
- `console.error(...)` → `logger.error(...)`
- `console.warn(...)` → `logger.warn(...)`

### 3. 本番ビルドでの自動除去

next.config.js で babel/minify 設定：

```javascript
// next.config.js
const withTM = require('next-transpile-modules')([]);

module.exports = withTM({
  // ... other config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 本番ビルドで console.* を削除
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: process.env.NODE_ENV === 'production'
            }
          }
        })
      );
    }
    return config;
  }
});
```

### 4. ログレベル管理

環境変数でログレベルを制御：

```typescript
// .env.local
LOG_LEVEL=info          # development
LOG_LEVEL=warn         # production
```

### 5. ベンチマークコードの分離

`scripts/benchmark/` は本番コードに含めない：
- `package.json` の `files` フィールドから除外
- または `tools/benchmark/` に移動

### 6. 自動検出と警告

ESLint ルール追加：

```javascript
// .eslintrc.js
rules: [
  'no-console': ['error', {
    allow: ['warn', 'error']  // 本番警告・エラーのみ許可
  }]
]
```

## 受入基準

- [ ] 全 `console.log` が `logger.info` に置き換え
- [ ] 本番ビルドですべての `console.*` が除去
- [ ] ESLintが `no-console` を適用
- [ ] ログレベルが環境別に制御可能
- [ ] 機密情報がログ出力されない
- [ ] パフォーマンス監視はPerformance API使用

## 関連ファイル（主な箇所）

`app/lib/` 全ファイル：
- `tradingCore/UnifiedTradingPlatform.ts:164, 194, 196`
- `websocket-resilient.ts:389-880`
- `backtest/WinningBacktestEngine.ts:208-900`
- `utils/performanceMonitor.ts:39-284`
- その他100箇所以上

## 優先度

**P1 - High**: 本番環境のセキュリティとパフォーマンスに直結

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
