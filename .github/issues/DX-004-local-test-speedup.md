# [DX-004] ローカルテスト高速化

## 概要

テスト実行時間が長く、開発フィードバックループが遅いです。ローカルテストを高速化し、開発効率を向上させます。

## 対応内容

1. **Jest並列実行設定**
   - ワーカープロセス数の最適化
   - テスト分割戦略
   - メモリ使用量の最適化

2. **差分テスト導入**
   - 変更されたファイルのみを対象に
   - 依存関係分析による関連テスト選定
   - キャッシュの活用

3. **ウォッチモード最適化**
   - ファイル監視の最適化
   - インクリメンタルテスト実行
   - フィルタリング機能の強化

## 受け入れ条件（Acceptance Criteria）

- [ ] ローカルテスト実行時間が3分以内に短縮されている
- [ ] Jest並列実行が最適化され、CPUコアを効率的に使用している
- [ ] 差分テストが導入され、変更関連のテストのみが実行される
- [ ] ウォッチモードが最適化され、ファイル変更検出が高速化されている
- [ ] テスト実行時のメモリ使用量が適切に管理されている
- [ ] 開発者満足度スコアが4.0/5.0以上に向上している

## 関連するレビュー発見事項

- テスト実行時間が5-8分かかっている
- 全テストが毎回実行される
- ウォッチモードの応答が遅い

## 想定工数

16時間

## 優先度

Medium

## 担当ロール

Frontend Engineer

## ラベル

`dx`, `priority:medium`, `testing`, `performance`

---

## 補足情報

### Jest設定最適化

```javascript
// jest.config.js
module.exports = {
  // 並列実行設定
  maxWorkers: '50%',
  
  // キャッシュ設定
  cache: true,
  cacheDirectory: '.jest-cache',
  
  // 差分テスト
  changedSince: 'origin/main',
  
  // テスト分割
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/'
  ],
  
  // メモリ最適化
  workerIdleMemoryLimit: '512MB',
  
  // ウォッチモード
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
```

### テスト実行時間目標

| テストタイプ | 現在 | 目標 |
|--------------|------|------|
| 全テスト | 8分 | 5分 |
| 差分テスト | N/A | 1分 |
| 単一ファイル | 30秒 | 10秒 |
| ウォッチモード初回 | 5分 | 2分 |

### 推奨コマンド

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:changed": "jest --changedSince=origin/main",
    "test:related": "jest --findRelatedTests",
    "test:watch": "jest --watch",
    "test:watch:all": "jest --watchAll"
  }
}
```
