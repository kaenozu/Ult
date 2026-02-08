# DI Container Migration Guide

## 概要

このドキュメントは、UnifiedTradingPlatformの依存関係注入（DI）への移行を段階的に進めるためのガイドラインです。

## 現状

### 問題点
- **高結合度**: 7つのコンポーネントがコンストラクタで直接インスタンス化されている
- **テスト困難**: 各コンポーネントを個別にモックする必要がある
- **初期化順序**: 依存関係が明確でない
- **リファクタリング困難**: サービスを入れ替えるのが困難

### 解決策
DIコンテナ（`app/lib/di/`）を使用して、コンポーネント間の疎結合を実現します。

## ステップ

### Phase 1: 基盤整備（完了）

- [x] DIコンテナの作成とトークンの定義
- [x] テストヘルパーの作成
- [x] READMEへのドキュメント追加

### Phase 2: サービス登録

**タスク**:
1. 各サービスのファクトリ関数を作成
2. DIコンテナにサービスを登録
3. UnifiedTradingPlatformを修正してDIを使用

**対象サービス**:
- MultiExchangeDataFeed
- PredictiveAnalyticsEngine
- SentimentAnalysisEngine
- AdvancedRiskManager
- AlgorithmicExecutionEngine
- AdvancedBacktestEngine
- AlertSystem
- PaperTradingEnvironment

**例**:
```typescript
// app/lib/services/data-feed-service.ts
export function createDataFeed(config?: DataFeedConfig): MultiExchangeDataFeed {
  return new MultiExchangeDataFeed(config);
}

// app/lib/di/registry.ts
import { TOKENS } from './tokens';
import { createDataFeed } from '../services/data-feed-service';

export function registerServices() {
  container.register(TOKENS.MultiExchangeDataFeed, createDataFeed);
  container.register(TOKENS.PredictiveAnalyticsEngine, createPredictiveAnalyticsEngine);
  // ...
}
```

### Phase 3: UnifiedTradingPlatformの修正

**タスク**:
1. コンストラクタをDI注入に変更
2. `initializeComponents` メソッドを修正
3. テストヘルパーの更新

**変更後**:
```typescript
constructor(config: Partial<PlatformConfig> = {}) {
  super();

  this.config = { /* ... */ };
  this.status = { /* ... */ };

  // Initialize components from DI container
  this.initializeComponents();
  this.setupEventHandlers();
}

protected initializeComponents(): void {
  // Get services from DI container
  this.dataFeed = inject<DataFeed>(TOKENS.MultiExchangeDataFeed);
  this.aiEngine = inject<PredictiveAnalyticsEngine>(TOKENS.PredictiveAnalyticsEngine);
  // ...
}
```

### Phase 4: テストの更新

**タスク**:
1. 既存のテストをDI使用するように更新
2. モック用ファクトリ関数を作成
3. 統合テストを追加

**例**:
```typescript
// tests/trading-platform.test.ts
import { registerMockService, resetAllMocks, TOKENS } from '@/app/lib/tradingCore/test-di-helpers';

beforeEach(() => {
  registerMockService(TOKENS.MarketDataService, {
    fetchMarketData: jest.fn().mockResolvedValue(mockData),
  });
});
```

### Phase 5: リファクタリング

**タスク**:
1. コードの重複を削除
2. サービスのインターフェースを定義
3. ファクトリパターンを適用

## ベネフィット

1. **テスト容易性**: サービスを簡単にモック可能
2. **疎結合**: コンポーネント間の依存が緩やか
3. **リファクタリング**: サービスの交換が簡単
4. **初期化制御**: ライフサイクルが明確に

## 注意事項

- **段階的に進める**: 一度に全てを変更せず、段階的に進める
- **テストを維持**: 各フェーズでテストが通ることを確認
- **互換性を維持**: 既存のAPIを壊さない
- **ドキュメントを更新**: 変更点を随時記録

## 参考資料

- `app/lib/di/container.ts` - DIコンテナの実装
- `app/lib/di/tokens.ts` - トークン定義
- `app/lib/tradingCore/test-di-helpers.ts` - テストヘルパー
