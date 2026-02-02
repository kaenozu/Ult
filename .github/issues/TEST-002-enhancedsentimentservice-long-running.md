# 🟠 HIGH: 長時間テスト - EnhancedSentimentService

## 問題の説明

`EnhancedSentimentService.test.ts` のテストが12秒以上かかり、標準的なJestタイムアウト（5秒）を超過しています。コンソールログから多数の外部API呼び出しが実行されています。

```bash
FAIL app/lib/alternativeData/__tests__/EnhancedSentimentService.test.ts (12.142 s)
Console logs:
[EnhancedSentimentService] Starting...
[AlternativeDataCollector] Collecting data from Financial News API...
[AlternativeDataCollector] Collecting data from Social Media API...
[AlternativeDataCollector] Collecting data from Economic Indicators API...
[AlternativeDataCollector] Collecting data from Analyst Ratings API...
```

## 影響範囲

- **ファイル**: `app/lib/alternativeData/__tests__/EnhancedSentimentService.test.ts`
- **原因**: 実際の外部APIへの呼び出し（モック不足）
- **影響**: テスト全体が遅延、CIパフォーマンス低下

## 根本原因

統合テストが単体テストスイート内に混在。本物のAPIクライアントを使用しており、モック化が不十分。

## 推奨修正

### 1. モックの completely

全外部APIクライアントをモック：

```typescript
import { FinancialNewsAPI } from '@/app/lib/alternativeData/sources/FinancialNewsAPI';

jest.mock('@/app/lib/alternativeData/sources/FinancialNewsAPI');
const mockFinancialNewsAPI = jest.mocked(FinancialNewsAPI);

beforeEach(() => {
  mockFinancialNewsAPI.fetchNews.mockResolvedValue(mockNewsData);
  mockSocialMediaAPI.fetchPosts.mockResolvedValue(mockPostsData);
});
```

### 2. テストの分離

`__tests__/` 内に統合テストと単体テストを分離：

```
app/lib/alternativeData/__tests__/unit/     # 高速な単体テスト
app/lib/alternativeData/__integration__/   # 遅い統合テスト（別スイート）
```

`jest.config.js` にテストパターンを追加：

```javascript
testMatch: [
  '**/__tests__/**/*.test.ts',
  '!**/__tests__/**/*.integration.test.ts'  // 通常のnpm testから除外
],
projects: [
  { displayName: 'unit' },
  { displayName: 'integration', testMatch: ['**/__tests__/**/*.integration.test.ts'] }
]
```

### 3. testEnvironment の設定

長時間テスト用の設定：

```typescript
describe('EnhancedSentimentService (Integration)', () => {
  // 各テストにタイムアウト設定
  it('collects and aggregates sentiment', async () => {
    await expect(someLongRunningTask()).resolves.toMatchObject(...);
  }, 30000); // 30秒タイムアウト
});
```

### 4. 実行コマンドの分離

`package.json` に追加：

```json
{
  "scripts": {
    "test:unit": "jest --testPathIgnorePatterns=__integration__",
    "test:integration": "jest --testPathPattern=__integration__",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}
```

## 受入基準

- [ ] 単体テストは全テスト ≤ 3秒
- [ ] 統合テストは別スイートに分離
- [ ] `npm test` コマンドが高速化
- [ ] CIの合計時間短縮

## 関連ファイル

- `app/lib/alternativeData/__tests__/EnhancedSentimentService.test.ts`
- `app/lib/alternativeData/EnhancedSentimentService.ts`
- `app/lib/alternativeData/DataCollector.ts`

## 優先度

**P1 - High**: CI全体のパフォーマンスに影響

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
