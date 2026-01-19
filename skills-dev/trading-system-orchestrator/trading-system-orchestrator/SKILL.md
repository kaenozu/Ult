---
name: trading-system-orchestrator
description: 自動トレードシステムの開発を加速させるスキル。新しい取引戦略の構築、ML予測モデルの実装、バックテストの実行、およびフロントエンドへの統合を、プロジェクトの既存パターン（BaseStrategy, BasePredictor）に沿って一貫してサポートします。
---

# Trading System Orchestrator

このスキルは、AGStockシステムのバックエンドおよびフロントエンドの機能を拡張・最適化する際に使用します。

## Workflows

### 1. 新しい取引戦略の実装
既存の `BaseStrategy` に準拠した戦略を素早く作成します。
- **Template**: `references/templates.py` の `TemplateStrategy` を参考にしてください。
- **手順**:
    1. `backend/src/strategies/` (または `backend/src/`) に新ファイルを作成。
    2. `generate_signals` メソッドに売買ロジックを実装。
    3. 必要に応じてテクニカル指標計算を追加。

### 2. 予測モデル (Predictor) の追加
ML/DLモデルを予測エンジンに組み込みます。
- **Template**: `references/templates.py` の `TemplatePredictor` を使用。
- **手順**:
    1. `BasePredictor` を継承し、`fit` と `predict` を実装。
    2. 既存の `src/ensemble.py` への組み込み方法を確認。

### 3. バックテストの実行と評価
実装した戦略を過去データで検証します。
- **手順**:
    1. `src/backtester.py` を使用してテストスクリプトを作成。
    2. シャープ比、最大ドローダウン、勝率を確認。
    3. `advanced_risk.py` を用いてリスク許容度を調整。

### 4. フロントエンド dashboard への統合
新しい戦略や分析結果を Next.js の UI に反映させます。
- **手順**:
    1. FastAPI (`src/api_server.py` 等) に新しいエンドポイントを追加。
    2. `src/app/` 以下のコンポーネントでデータをフェッチし、チャート（Recharts 等）で可視化。

## Reference Material
- **システム構成**: [architecture.md](references/architecture.md) を参照。
- **コード雛形**: [templates.py](references/templates.py) を参照。