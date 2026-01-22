---
name: ml-strategy-developer
description: 機械学習（RF/XGB/LSTM）を用いたトレード戦略の開発、特徴量設計、およびバックテストによる検証を支援します。新しい予測ロジックの追加や、ATRベースのリスク管理設定の調整時に使用します。
---

# ML Strategy Developer

このスキルは、Trader ProプラットフォームにおけるAI予測エンジンとバックテストロジックの継続的な改善を支援します。

## Workflows

### 1. 予測モデルの調整
新しい特徴量を追加したり、アンサンブルモデルの重みを変更したりする場合は、以下の手順に従ってください。
- `mlPrediction.ts` 内の `extractFeatures` に特徴量を追加。
- `references/model_spec.md` を参照して、重み付けがプロジェクト標準に従っているか確認。
- `calculateConfidence` 関数を調整して、新しい特徴量が信頼度に与える影響を定義。

### 2. バックテストによる検証
戦略の変更後は必ずバックテストを実行して、有効性を検証してください。
- `scripts/run_backtest.cjs` を実行して、シミュレーション結果のサマリーを取得します。
- 期待される結果が得られない場合は、`backtest.ts` 内の `confidence` 閾値を調整します（デフォルト: 60）。

### 3. テストの自動生成
新しい予測ロジックに対しては、`app/lib/mlPrediction.test.ts` に以下のケースを追加することを推奨します。
- 強気/弱気トレンドでのシグナル正当性。
- ボラティリティ急増時の信頼度の変化。
- ターゲット価格がATRに基づいて正しく設定されているか。

## Reference Material
- モデルの数学的仕様については `references/model_spec.md` を参照してください。