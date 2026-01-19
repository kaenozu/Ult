# Trading System Architecture

本プロジェクトの自動トレードシステムは、以下の4つの主要レイヤーで構成されています。

## 1. Data Layer
市場データ（株価、財務データ、感情分析など）の取得と整形を担当します。
- `src/data_loader.py`: ローカルおよびリモートからのデータ読み込み。
- `src/japan_stock_data.py`: 日本市場特有のデータ処理。

## 2. Intelligence Layer
将来の価格やトレンドを予測するモデル群です。
- `BasePredictor`: 予測モデルの標準インターフェース。
- `src/lgbm_predictor.py`, `src/lstm_predictor.py`: 具体的なモデル実装。
- `src/ensemble.py`: 複数のモデルを組み合わせたアンサンブル。

## 3. Strategy Layer
予測やテクニカル指標を元に、具体的な売買アクションを決定します。
- `BaseStrategy`: 戦略の標準インターフェース。
- `src/backtester.py`: 過去データを用いた戦略の検証。

## 4. Execution & Risk Layer
リスクを管理し、実際の注文（またはシミュレーション）を実行します。
- `BaseRiskManager`: ポジションサイジングとリスク制限。
- `src/kelly_criterion.py`: ケリー基準による最適資金配分。
- `src/broker.py`: 証券会社APIとのインターフェース。

---
### 拡張のヒント
- **新しい予測モデルを作りたい**: `BasePredictor` を継承して `predict()` を実装し、`src/models/` に保存します。
- **新しい売買ルールを作りたい**: `BaseStrategy` を継承して `generate_signals()` を実装します。
- **バックテストをしたい**: `src/backtester.py` を呼び出し、作成した戦略を注入します。
