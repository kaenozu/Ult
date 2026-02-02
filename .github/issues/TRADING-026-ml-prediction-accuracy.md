---
title: 機械学習モデルの予測精度向上とアンサンブル最適化
labels: enhancement, ml-model, priority:critical, winning-edge
---

## 説明

### 問題
現在のAI予測エンジン（Random Forest + XGBoost + LSTMアンサンブル）の精度が限定的で、実際のトレーディングで一貫して利益を生むレベルに達していません。特に以下の問題があります：

1. 予測信頼度スコアが30-98%と幅広いが、実際のヒット率が安定しない
2. 市場レジーム変化への適応が遅れる
3. 過学習によるバックテスト過剰最適化
4. フィーチャーエンジニアリングが不十分
5. モデルドリフト検出が不十分

### 影響
- シグナルに従っても勝率が50%前後で推移
- 損切りと利食いのバランスが悪い
- 連敗時の心理的ダメージが大きい
- 長期的なプラス期待値が確認できない

### 推奨される解決策

#### 1. 高度なフィーチャーエンジニアリング
```python
# backend/src/ml/features/advanced_features.py
import numpy as np
import pandas as pd
from typing import Dict, List

class AdvancedFeatureEngineering:
    """高度なフィーチャーエンジニアリング"""

    def __init__(self):
        self.feature_cache = {}

    def create_market_regime_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """市場レジーム特徴量の作成"""
        features = pd.DataFrame(index=data.index)

        # ボラティリティレジーム
        features['volatility_regime'] = self._classify_volatility_regime(data)

        # トレンドレジーム
        features['trend_regime'] = self._classify_trend_regime(data)

        # レジーム永続期間
        features['regime_persistence'] = self._calculate_regime_persistence(data)

        # レジーム転換確率
        features['regime_transition_prob'] = self._calculate_transition_probability(data)

        return features

    def create_microstructure_features(self, order_book_data: pd.DataFrame) -> pd.DataFrame:
        """市場マイクロストラクチャー特徴量"""
        features = pd.DataFrame(index=order_book_data.index)

        # オーダーフロー不均衡
        features['order_flow_imbalance'] = self._calculate_ofi(order_book_data)

        # スプレッド変化率
        features['spread_change_rate'] = self._calculate_spread_change(order_book_data)

        # 流動性深度
        features['liquidity_depth'] = self._calculate_liquidity_depth(order_book_data)

        # 価格インパクト
        features['price_impact'] = self._calculate_price_impact(order_book_data)

        return features

    def create_sentiment_features(self, news_data: pd.DataFrame,
                                  social_data: pd.DataFrame) -> pd.DataFrame:
        """センチメント特徴量"""
        features = pd.DataFrame(index=news_data.index)

        # ニュースセンチメントスコア
        features['news_sentiment'] = news_data['sentiment_score']

        # センチメント変化率
        features['sentiment_change'] = news_data['sentiment_score'].pct_change()

        # ソーシャルメディア勢い
        features['social_momentum'] = self._calculate_social_momentum(social_data)

        # センチメント分散
        features['sentiment_dispersion'] = news_data['sentiment_score'].rolling(20).std()

        # 突発的イベント検知
        features['news_spike'] = self._detect_news_spike(news_data)

        return features

    def create_technical_pattern_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """テクニカルパターン特徴量"""
        features = pd.DataFrame(index=data.index)

        # パターン認識
        features['double_top'] = self._detect_double_top(data)
        features['double_bottom'] = self._detect_double_bottom(data)
        features['head_shoulders'] = self._detect_head_shoulders(data)
        features['triangle_pattern'] = self._detect_triangle(data)

        # サポート/レジスタンス距離
        features['distance_to_support'] = self._distance_to_nearest_support(data)
        features['distance_to_resistance'] = self._distance_to_nearest_resistance(data)

        # トレンド強度
        features['trend_strength'] = self._calculate_trend_strength(data)

        return features

    def create_time_decay_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """時間減衰特徴量（市場の記憶を考慮）"""
        features = pd.DataFrame(index=data.index)

        # 指数加重移動平均
        for span in [5, 10, 20, 50]:
            features[f'ewm_return_{span}'] = data['returns'].ewm(span=span).mean()

        # 時間減衰ボラティリティ
        features['decay_volatility'] = self._calculate_decay_volatility(data)

        # 時間減衰相関
        features['decay_correlation'] = self._calculate_decay_correlation(data)

        return features
```

#### 2. 動的アンサンブル重み付け
```python
# backend/src/ml/ensemble/dynamic_ensemble.py
class DynamicWeightedEnsemble:
    """動的重み付けアンサンブル"""

    def __init__(self, models: List):
        self.models = models
        self.weights = np.ones(len(models)) / len(models)
        self.performance_history = {i: [] for i in range(len(models))}
        self.lookback_window = 50

    def predict(self, X: np.ndarray, market_regime: str) -> Dict:
        """市場レジームに応じた動的予測"""
        predictions = []
        for i, model in enumerate(self.models):
            pred = model.predict(X)
            predictions.append(pred)

        # 市場レジームに応じた重み調整
        regime_weights = self._get_regime_weights(market_regime)

        # 最近のパフォーマンスに基づく重み調整
        performance_weights = self._get_performance_weights()

        # 統合重み
        final_weights = regime_weights * performance_weights
        final_weights = final_weights / np.sum(final_weights)

        # 重み付け予測
        weighted_prediction = np.average(predictions, weights=final_weights, axis=0)

        # 信頼度計算
        confidence = self._calculate_confidence(predictions, final_weights)

        return {
            'prediction': weighted_prediction,
            'confidence': confidence,
            'individual_predictions': predictions,
            'weights': final_weights
        }

    def update_weights(self, actual: float, predicted: float):
        """実際の結果に基づいて重みを更新"""
        for i, model in enumerate(self.models):
            error = abs(actual - predicted[i])
            self.performance_history[i].append(error)

            # 履歴を指定ウィンドウに維持
            if len(self.performance_history[i]) > self.lookback_window:
                self.performance_history[i].pop(0)

    def _get_performance_weights(self) -> np.ndarray:
        """パフォーマンスに基づく重みを計算"""
        weights = []
        for i in range(len(self.models)):
            if not self.performance_history[i]:
                weights.append(1.0)
            else:
                # 逆誤差（誤差が小さいほど大きい重み）
                avg_error = np.mean(self.performance_history[i])
                weight = 1.0 / (avg_error + 1e-6)
                weights.append(weight)

        weights = np.array(weights)
        return weights / np.sum(weights)
```

#### 3. モデルドリフト検出と自動再学習
```python
# backend/src/ml/monitoring/drift_detection.py
class ModelDriftDetector:
    """モデルドリフト検出"""

    def __init__(self, threshold: float = 0.05):
        self.threshold = threshold
        self.baseline_performance = None
        self.prediction_history = []
        self.actual_history = []
        self.feature_distributions = {}

    def detect_performance_drift(self, recent_predictions: np.ndarray,
                                 recent_actuals: np.ndarray) -> Dict:
        """パフォーマンスドリフト検出"""
        recent_mse = np.mean((recent_predictions - recent_actuals) ** 2)

        if self.baseline_performance is None:
            self.baseline_performance = recent_mse
            return {'drift_detected': False, 'current_mse': recent_mse}

        # 相対的劣化
        relative_degradation = (recent_mse - self.baseline_performance) / self.baseline_performance

        # 統計的検定
        p_value = self._perform_statistical_test(recent_predictions, recent_actuals)

        drift_detected = relative_degradation > self.threshold or p_value < 0.05

        return {
            'drift_detected': drift_detected,
            'current_mse': recent_mse,
            'baseline_mse': self.baseline_performance,
            'relative_degradation': relative_degradation,
            'p_value': p_value,
            'recommendation': 'retrain' if drift_detected else 'monitor'
        }

    def detect_feature_drift(self, new_features: pd.DataFrame) -> Dict:
        """特徴量ドリフト検出（Population Stability Index）"""
        drift_scores = {}

        for column in new_features.columns:
            if column in self.feature_distributions:
                # PSI計算
                psi = self._calculate_psi(
                    self.feature_distributions[column],
                    new_features[column]
                )
                drift_scores[column] = psi

        max_psi = max(drift_scores.values()) if drift_scores else 0

        return {
            'drift_detected': max_psi > 0.2,  # PSI > 0.2 でドリフトと判定
            'psi_scores': drift_scores,
            'max_psi': max_psi
        }

    def trigger_retraining(self) -> bool:
        """再学習トリガー判定"""
        # 以下の条件で再学習
        # 1. パフォーマンスドリフト検出
        # 2. 特徴量ドリフト検出
        # 3. 定期再学習（例：毎週）
        return True
```

#### 4. 期待値ベースのシグナル生成
```python
# backend/src/signals/expected_value_signal.py
class ExpectedValueSignalGenerator:
    """期待値ベースのシグナル生成器"""

    def __init__(self, ml_predictor, risk_manager):
        self.ml_predictor = ml_predictor
        self.risk_manager = risk_manager

    def generate_signal(self, symbol: str, current_price: float,
                       market_data: pd.DataFrame) -> Dict:
        """期待値に基づくシグナル生成"""
        # ML予測を取得
        prediction = self.ml_predictor.predict(market_data)

        # 期待値を計算
        expected_value = self._calculate_expected_value(
            prediction,
            current_price,
            market_data
        )

        # リスク調整期待値
        risk_adjusted_ev = self._adjust_for_risk(
            expected_value,
            symbol,
            market_data
        )

        # シグナル判定
        signal = 'HOLD'
        confidence = 0

        if risk_adjusted_ev > 0.02:  # 2%以上のプラス期待値
            signal = 'BUY'
            confidence = min(95, int(risk_adjusted_ev * 1000))
        elif risk_adjusted_ev < -0.02:  # -2%以下のマイナス期待値
            signal = 'SELL'
            confidence = min(95, int(abs(risk_adjusted_ev) * 1000))

        # ポジションサイジング（ケリー基準）
        position_size = self.risk_manager.calculate_kelly_position_size(
            risk_adjusted_ev,
            prediction['volatility_forecast']
        )

        return {
            'signal': signal,
            'confidence': confidence,
            'expected_value': risk_adjusted_ev,
            'prediction': prediction,
            'position_size': position_size,
            'stop_loss': self._calculate_stop_loss(current_price, prediction),
            'take_profit': self._calculate_take_profit(current_price, prediction)
        }

    def _calculate_expected_value(self, prediction: Dict,
                                  current_price: float,
                                  market_data: pd.DataFrame) -> float:
        """期待値を計算"""
        # 予測価格
        predicted_price = prediction['price']
        predicted_change_pct = (predicted_price - current_price) / current_price

        # ヒット確率（信頼度）
        win_probability = prediction['confidence'] / 100

        # 報酬/リスク比
        potential_profit = abs(predicted_change_pct) if predicted_change_pct > 0 else 0
        potential_loss = abs(predicted_change_pct) if predicted_change_pct < 0 else 0

        # 期待値 = (勝率 × 利益) - (敗率 × 損失)
        expected_value = (win_probability * potential_profit) - \
                        ((1 - win_probability) * potential_loss)

        return expected_value
```

### 実装タスク
- [ ] 高度なフィーチャーエンジニアリングの実装
- [ ] 動的アンサンブル重み付けの実装
- [ ] モデルドリフト検出システムの実装
- [ ] 自動再学習パイプラインの実装
- [ ] 期待値ベースシグナル生成の実装
- [ ] ケリー基準ポジションサイジングの実装
- [ ] A/Bテストフレームワークの実装
- [ ] モデルパフォーマンスダッシュボードの実装
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/ml/features/advanced_features.py` (新規ファイル)
- `backend/src/ml/ensemble/dynamic_ensemble.py` (新規ファイル)
- `backend/src/ml/monitoring/drift_detection.py` (新規ファイル)
- `backend/src/signals/expected_value_signal.py` (新規ファイル)
- `backend/src/ml/pipeline/auto_retrain.py` (新規ファイル)
- `trading-platform/components/ModelPerformancePanel.tsx` (新規ファイル)

### 優先度
**最重要（Critical）** - これがアプリの勝率を直接決定する

### 複雑度
高

### 見積もり時間
4-6週間

### 成功指標
- 予測ヒット率が60%以上に向上
- シャープレシオが1.5以上に改善
- 最大ドローダウンが15%以下に抑制
- リスク調整後リターンが年率20%以上
