# TODO/FIXME 整理リスト

**最終更新**: 2026-02-18
**総数**: 27個

---

## 高優先度（機能不全・要即時対応）

### 1. 計算ロジック未実装

| ファイル | 行 | 内容 | 影響 |
|----------|-----|------|------|
| `app/lib/storage/IndexedDBService.ts` | 331-332 | maxDrawdown, sharpeRatio計算 | ポートフォリオ分析が不正確 |
| `app/lib/utils/portfolio-analysis.ts` | 264-265 | beta, alpha計算 | 市場連携なし |
| `app/lib/utils/portfolio-analysis.ts` | 297-299 | 取引データ損益情報 | リターン計算不可 |

### 2. ML機能スタブ

| ファイル | 行 | 内容 | 影響 |
|----------|-----|------|------|
| `app/lib/services/MLIntegrationService.ts` | 82 | モデルロード | ML予測が動作しない |
| `app/lib/services/MLIntegrationService.ts` | 141 | ML予測実装 | 予測結果がダミー |
| `app/lib/services/MLIntegrationService.ts` | 158, 185 | パフォーマンス追跡 | 精度測定不可 |

### 3. パターン認識未実装

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/lib/services/candlestick-pattern-service.ts` | 259 | isPiercingLine |
| `app/lib/services/candlestick-pattern-service.ts` | 260 | isDarkCloudCover |
| `app/lib/services/candlestick-pattern-service.ts` | 261 | isBullishHarami |
| `app/lib/services/candlestick-pattern-service.ts` | 262 | isBearishHarami |

---

## 中優先度（機能改善）

### 4. リスク管理

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/lib/risk/CorrelationManager.ts` | 297 | セクターマッピング実装 |
| `app/lib/risk/PsychologyMonitor.ts` | 306 | stopLoss設定チェック |
| `app/lib/risk/PsychologyMonitor.ts` | 617 | entry/exit時間計算 |
| `app/lib/risk/EnhancedPsychologyMonitor.ts` | 550 | stopLossフィールド連携 |
| `app/lib/risk/EnhancedPsychologyMonitor.ts` | 563 | リベンジ取引検出 |

### 5. アーキテクチャ

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/lib/tradingCore/UnifiedTradingPlatform.ts` | 153 | DIコンテナ移行 |
| `app/lib/AnalysisService.ts` | 540 | モデルトレーニング時のコメント解除 |

---

## 低優先度（将来対応）

### 6. モデル置き換え（現在はモック動作）

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/domains/prediction/models/ml/EnsembleModel.ts` | 400 | sklearn/TensorFlow RF |
| `app/domains/prediction/models/ml/EnsembleModel.ts` | 438 | XGBoost |
| `app/domains/prediction/models/ml/EnsembleModel.ts` | 473 | TensorFlow.js LSTM |

### 7. 新規機能

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/hooks/useSupplyDemandAlerts.ts` | 62, 89 | LEVEL_APPROACHINGタイプ追加 |

---

## 完了・実装済み

| ファイル | 行 | 内容 |
|----------|-----|------|
| `app/lib/ml/EnsembleStrategy.ts` | 292 | ✅ 特徴量重要度計算（IMPLEMENTED） |

---

## 推奨アクション

### 即時対応（高優先度）

1. **IndexedDBService**
   ```typescript
   // maxDrawdown計算 (app/lib/utils/portfolio-analysis.ts の calculateMaxDrawdown を使用)
   const { maxDrawdownPercent } = calculateMaxDrawdown(equityCurve);
   
   // sharpeRatio計算
   const sharpeRatio = (avgReturn - riskFreeRate) / stdDev;
   ```

2. **MLIntegrationService**
   - モデルロード処理を実装
   - 予測関数を実際のモデルに接続

3. **candlestick-pattern-service**
   - 4つのパターン認識を実装

### 段階的対応（中優先度）

1. セクターマッピングDB/API連携
2. 心理検出アルゴリズム改善
3. DIコンテナ完全移行

### 将来対応（低優先度）

1. 実MLモデル統合
2. 新規アラートタイプ追加
