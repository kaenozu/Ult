# Alternative Data Integration for Sentiment Analysis

## 概要 (Overview)

このモジュールは、複数の代替データソースを統合し、より包括的なセンチメント分析を提供します。

This module integrates multiple alternative data sources to provide comprehensive sentiment analysis.

## 主な機能 (Key Features)

### 1. データ収集エンジン (Data Collection Engine)

`AlternativeDataCollector` は複数のデータソースから代替データを自動的に収集します。

- **サポートされるデータソース**:
  - ニュース記事 (News Articles)
  - ソーシャルメディア (Social Media)
  - 経済指標 (Economic Indicators)
  - アナリストレーティング (Analyst Ratings)
  - インサイダー取引 (Insider Trading)
  - 機関投資家の動き (Institutional Activity)
  - 個人投資家の動き (Retail Activity)

- **データ品質管理**:
  - 完全性 (Completeness)
  - 正確性 (Accuracy)
  - 適時性 (Timeliness)
  - 一貫性 (Consistency)

### 2. 強化されたセンチメント分析 (Enhanced Sentiment Analysis)

`EnhancedSentimentService` は既存の `SentimentAnalysisEngine` と統合し、以下の機能を提供します:

- **投資家タイプ別センチメント**:
  - 機関投資家のセンチメント
  - 個人投資家のセンチメント
  - 両者の乖離度

- **センチメント先行指標**:
  - ボリューム異常検出
  - トレンド加速度
  - クロスアセットセンチメント
  - 早期シグナル強度

- **アクション推奨**:
  - STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
  - 推奨の信頼度

## 使用方法 (Usage)

### 基本的な使い方

```typescript
import { 
  getGlobalEnhancedSentimentService 
} from '@/app/lib/alternativeData';

// サービスを取得
const service = getGlobalEnhancedSentimentService();

// サービスを開始
service.start();

// 特定銘柄のセンチメント分析
const result = await service.analyzeSymbol('AAPL');

console.log('Overall Sentiment:', result.overallSentiment.overallScore);
console.log('Recommended Action:', result.recommendedAction);
console.log('Investor Sentiment:', result.investorSentiment);
console.log('Leading Indicators:', result.leadingIndicators);

// 履歴データを取得
const history = service.getHistoricalSentiment('AAPL');

// サービスを停止
service.stop();
```

### API経由での使用

#### 強化されたセンチメント分析

```bash
GET /api/sentiment/enhanced?symbol=AAPL
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "timestamp": 1234567890,
    "overallSentiment": { ... },
    "investorSentiment": {
      "institutional": 0.7,
      "retail": 0.5,
      "combined": 0.62,
      "divergence": 0.2
    },
    "leadingIndicators": {
      "volumeAnomaly": 0.3,
      "trendAcceleration": 0.15,
      "crossAssetSentiment": 0.4,
      "earlySignalStrength": 0.35
    },
    "recommendedAction": "BUY",
    "actionConfidence": 0.75,
    "marketContext": {
      "volatility": 0.3,
      "momentum": 0.2,
      "regime": "TRENDING"
    }
  }
}
```

#### 履歴センチメントデータ

```bash
GET /api/sentiment/history?symbol=AAPL
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "history": [ ... ],
    "count": 50
  }
}
```

## 設定 (Configuration)

### データコレクターの設定

```typescript
import { AlternativeDataCollector } from '@/app/lib/alternativeData';

const collector = new AlternativeDataCollector({
  sources: [
    {
      type: 'news',
      name: 'Custom News API',
      enabled: true,
      priority: 'high',
      weight: 0.4,
      refreshInterval: 300000, // 5分
      endpoint: 'https://api.example.com/news',
      apiKey: 'your-api-key',
      rateLimit: {
        requests: 100,
        perMilliseconds: 60000
      }
    }
  ],
  cacheEnabled: true,
  cacheTTL: 900000, // 15分
  qualityThreshold: 0.6,
  retryAttempts: 3,
  retryDelay: 2000,
  maxConcurrent: 5
});

collector.start();
```

### センチメントサービスの設定

```typescript
import { EnhancedSentimentService } from '@/app/lib/alternativeData';

const service = new EnhancedSentimentService(
  dataCollector,
  sentimentEngine,
  {
    updateInterval: 60000, // 1分
    dataWeights: {
      news: 0.35,
      social: 0.25,
      analyst: 0.25,
      economic: 0.15
    },
    divergenceThreshold: 0.4,
    leadingIndicatorSensitivity: 0.7
  }
);
```

## イベント (Events)

### DataCollector Events

```typescript
collector.on('started', () => {
  console.log('Data collection started');
});

collector.on('data_collected', (data) => {
  console.log('Data collected:', data.type);
});

collector.on('quality_warning', ({ source, quality }) => {
  console.warn('Low quality data:', source.name, quality.overall);
});

collector.on('collection_error', ({ source, error }) => {
  console.error('Collection error:', source.name, error);
});
```

### EnhancedSentimentService Events

```typescript
service.on('started', () => {
  console.log('Sentiment analysis started');
});

service.on('analysis_completed', (result) => {
  console.log('Analysis completed for:', result.symbol);
});

service.on('divergence_alert', ({ symbol, divergence }) => {
  console.warn('Investor sentiment divergence detected:', symbol, divergence);
});

service.on('processing_error', ({ data, error }) => {
  console.error('Data processing error:', error);
});
```

## データ品質メトリクス (Data Quality Metrics)

データ品質は以下の4つの指標で評価されます:

1. **完全性 (Completeness)**: データがどれだけ完全か (0-1)
2. **正確性 (Accuracy)**: データがどれだけ正確か (0-1)
3. **適時性 (Timeliness)**: データがどれだけ最新か (0-1)
4. **一貫性 (Consistency)**: データが過去と一貫しているか (0-1)

総合評価 = (完全性 × 0.3 + 正確性 × 0.3 + 適時性 × 0.2 + 一貫性 × 0.2) × 優先度重み

## センチメント先行指標 (Leading Indicators)

### 1. ボリューム異常 (Volume Anomaly)

通常のメンション数と比較して異常に高い活動を検出します。

### 2. トレンド加速度 (Trend Acceleration)

センチメントのトレンドが加速しているか減速しているかを測定します。

### 3. クロスアセットセンチメント (Cross-Asset Sentiment)

関連する他の資産のセンチメントを考慮します。

### 4. 早期シグナル強度 (Early Signal Strength)

上記3つの指標を組み合わせて、早期警告シグナルの強度を計算します。

## アーキテクチャ (Architecture)

```
┌─────────────────────────────────────────────────────┐
│           EnhancedSentimentService                  │
│  - Investor Sentiment Analysis                      │
│  - Leading Indicators Calculation                   │
│  - Action Recommendations                           │
└──────────────┬────────────────────┬─────────────────┘
               │                    │
       ┌───────▼──────────┐  ┌─────▼──────────────┐
       │ DataCollector    │  │ SentimentEngine    │
       │ - Multi-source   │  │ - NLP Analysis     │
       │ - Quality Check  │  │ - News/Social      │
       │ - Rate Limiting  │  │ - Aggregation      │
       └──────────────────┘  └────────────────────┘
               │
       ┌───────▼──────────┐
       │  Data Sources    │
       │  - News APIs     │
       │  - Social Media  │
       │  - Economic Data │
       │  - Analyst Data  │
       └──────────────────┘
```

## テスト (Testing)

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test -- app/lib/alternativeData/__tests__/DataCollector.test.ts
npm test -- app/lib/alternativeData/__tests__/EnhancedSentimentService.test.ts
```

## パフォーマンス考慮事項 (Performance Considerations)

1. **キャッシング**: データは設定可能なTTL付きでキャッシュされます
2. **レート制限**: 各データソースに対してレート制限が実装されています
3. **並行収集**: 複数のデータソースから同時にデータを収集できます
4. **履歴制限**: 履歴データは最新100件のみ保持されます

## セキュリティ (Security)

- APIキーは環境変数で管理
- レート制限による過負荷防止
- データ品質チェックによる不正データの排除
- エラーハンドリングによる安定性確保

## 今後の拡張 (Future Enhancements)

1. 外部APIとの実際の統合
2. より高度なNLP技術の導入
3. リアルタイムストリーミングデータのサポート
4. 機械学習モデルによる予測精度の向上
5. カスタムデータソースの追加サポート

## ライセンス (License)

このモジュールはプロジェクトのライセンスに従います。

## サポート (Support)

問題や質問がある場合は、GitHubのIssueで報告してください。
