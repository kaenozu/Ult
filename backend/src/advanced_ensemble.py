"""
高度なアンサンブル学習モジュール

- Stackingアンサンブル
- 動的重み付け
- モデル多様性の導入
- ブレンディング
- メタフィーチャーの利用
"""

import logging
import warnings
from typing import Any, Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import TimeSeriesSplit

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class StackingEnsemble:
    """Stackingアンサンブルの実装"""

    def __init__(self, base_models: List, meta_model: Any = None):
        self.base_models = base_models
        self.meta_model = meta_model or LinearRegression()
        self.is_fitted = False

    def fit(self, X: np.ndarray, y: np.ndarray, cv_folds: int = 5) -> "StackingEnsemble":
        """モデルの学習"""
        # 時系列交差検証を準備
        tscv = TimeSeriesSplit(n_splits=cv_folds)

        # ベースモデルの予測を格納するための配列
        base_predictions = np.zeros((X.shape[0], len(self.base_models)))

        # 各フォールドでベースモデルを学習・予測
        for train_idx, val_idx in tscv.split(X):
            X_train_fold, X_val_fold = X[train_idx], X[val_idx]
            y_train_fold = y[train_idx]

            for i, model in enumerate(self.base_models):
                model.fit(X_train_fold, y_train_fold)
                base_predictions[val_idx, i] = model.predict(X_val_fold)

        # メタフィーチャーを用いてメタモデルを学習
        self.meta_model.fit(base_predictions, y)
        self.is_fitted = True

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """予測"""
        if not self.is_fitted:
            raise ValueError("モデルが学習されていません。fit()を呼び出してください。")

        # 各ベースモデルの予測を取得
        base_preds = np.array([model.predict(X) for model in self.base_models]).T

        # メタモデルで最終予測を計算
        return self.meta_model.predict(base_preds)


class DynamicWeightingEnsemble:
    """動的重み付けアンサンブルの実装"""

    def __init__(self, models: Dict[str, object], weight_calculator: callable = None):
        self.models = models  # {name: model}
        self.weight_calculator = weight_calculator or self._default_weight_calculator
        self.weights_history = []  # 各時刻の重みを記録

    def _default_weight_calculator(self, X: np.ndarray, y_true: np.ndarray) -> Dict[str, float]:
        """デフォルトの重み計算ロジック"""
        weights = {}
        for name, model in self.models.items():
            y_pred = model.predict(X)
            # MSEの逆数を重みとする（精度が高いほど重みが高くなる）
            mse = mean_squared_error(y_true, y_pred)
            weights[name] = 1.0 / (mse + 1e-8)  # ゼロ除算を避けるための小さな値を加算
        # 合計が1になるように正規化
        total_weight = sum(weights.values())
        return {k: v / total_weight for k, v in weights.items()}

    def predict(self, X: np.ndarray, y_true: np.ndarray = None) -> np.ndarray:
        """予測（動的重み付け）"""
        if y_true is None:
            # y_trueがない場合は均等重み
            weights = {name: 1.0 / len(self.models) for name in self.models}
        else:
            # y_trueがある場合は重みを計算
            weights = self.weight_calculator(X, y_true)

        self.weights_history.append(weights)

        # 重み付き平均で予測を計算
        weighted_predictions = np.zeros(X.shape[0])
        for name, model in self.models.items():
            pred = model.predict(X)
            weighted_predictions += weights[name] * pred

        return weighted_predictions

    def get_latest_weights(self) -> Dict[str, float]:
        """最新の重みを取得"""
        if not self.weights_history:
            return {}
        return self.weights_history[-1].copy()


class DiversityEnsemble:
    """
    モデル多様性を考慮したアンサンブル
    - アンサンブル内のモデル間の相関を考慮
    - 多様性を高めるために、過学習しやすさやアルゴリズムの違いを重みに反映
    """

    def __init__(self, models: Dict[str, object], diversity_factor: float = 0.5):
        self.models = models
        self.diversity_factor = diversity_factor  # 多様性重みの影響度
        self.predictions_history = []

    def fit(self, X: np.ndarray, y: np.ndarray):
        """学習はしません（重み計算のための履歴のみ記録）"""
        # 各モデルの予測を履歴に追加
        preds = {}
        for name, model in self.models.items():
            preds[name] = model.predict(X)
        self.predictions_history.append(preds)

    def predict(self, X: np.ndarray) -> np.ndarray:
        """相関と多様性を考慮した予測"""
        # 各モデルの予測を取得
        current_predictions = {name: model.predict(X) for name, model in self.models.items()}

        # 最新の履歴と相関を計算（簡略化のため、最後の履歴のみ使用）
        if self.predictions_history:
            prev_preds = self.predictions_history[-1]
            correlations = self._compute_pairwise_correlations(prev_preds, current_predictions)
        else:
            correlations = {name: 0.0 for name in self.models}

        # 重み計算（均等重み + 相関に基づくペナルティ + 多様性ファクター）
        base_weight = 1.0 / len(self.models)
        weights = {}
        for name in self.models:
            # 相関が高いほど重みを下げる
            penalty = correlations.get(name, 0.0)
            diversity_weight = base_weight * (1 - penalty * self.diversity_factor)
            weights[name] = max(diversity_weight, 0.01)  # 重みが0にならないようにする

        # 合計が1になるように正規化
        total_weight = sum(weights.values())
        weights = {k: v / total_weight for k, v in weights.items()}

        # 重み付き平均を計算
        final_prediction = np.zeros(X.shape[0])
        for name, pred in current_predictions.items():
            final_prediction += weights[name] * pred

        return final_prediction

    def _compute_pairwise_correlations(self, prev: Dict[str, np.ndarray], curr: Dict[str, np.ndarray]):
        """モデル間の相関を計算"""
        correlations = {}
        for name in self.models:
            if name in prev and name in curr:
                # 前回と今回の予測の相関を計算
                corr = np.corrcoef(prev[name], curr[name])[0, 1]
                correlations[name] = abs(corr)  # 絶対値を取る（相関の強さ）
            else:
                correlations[name] = 0.0
        return correlations

    def get_model_diversity_score(self) -> float:
        """モデル間の多様性スコアを計算（0-1、1に近いほど多様）"""
        if len(self.models) < 2:
            return 1.0

        # 各モデルの予測の相関を平均して多様性を計算（簡略化）
        # 実際には、多数のデータポイントでの相関を取る必要がある
        if not self.predictions_history:
            return 0.5  # 初期値

        latest_preds = self.predictions_history[-1]
        if len(latest_preds) < 2:
            return 1.0

        correlations = []
        names = list(latest_preds.keys())
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                name1, name2 = names[i], names[j]
                if name1 in latest_preds and name2 in latest_preds:
                    corr = np.corrcoef(latest_preds[name1], latest_preds[name2])[0, 1]
                    correlations.append(abs(corr))

        if not correlations:
            return 0.5

        avg_corr = np.mean(correlations)
        return 1.0 - avg_corr  # 相関が低いほど多様


def create_model_diversity_ensemble(input_dim: int = 10, forecast_horizon: int = 5):
    """
    モデル多様性を考慮したアンサンブルを生成
    例: LightGBM, LSTM, CNN, Random Forest の組み合わせ
    """
    from .advanced_models import (
        AttentionLSTM,
        CNNLSTMHybrid,
        MultiStepPredictor,
        NBEATS,
        EnhancedLSTM,
    )
    from .hyperparameter_optimizer import MultiModelOptimizer

    # モデルのインスタンスを生成
    models = {
        "LSTM": AttentionLSTM(input_dim=input_dim, forecast_horizon=forecast_horizon),
        "CNN-LSTM": CNNLSTMHybrid(input_dim=input_dim, forecast_horizon=forecast_horizon),
        "Multi-Step": MultiStepPredictor(input_dim=input_dim, forecast_horizon=forecast_horizon),
        "N-BEATS": NBEATS(input_size=input_dim, forecast_size=forecast_horizon),
        "Advanced": EnhancedLSTM(input_dim=input_dim, forecast_horizon=forecast_horizon),
    }

    # それぞれのモデルに最適なハイパーパラメータを設定
    optimizer = MultiModelOptimizer()
    for name, model in models.items():
        # 擬似的に最適化されたパラメータを適用
        optimized_params = optimizer.optimize(model, X=None, y=None, model_name=name)
        if hasattr(model, "set_params"):
            model.set_params(**optimized_params)
        elif hasattr(model, "model") and hasattr(model.model, "set_params"):
            model.model.set_params(**optimized_params)

    return DiversityEnsemble(models)


def create_blending_ensemble(base_models: List, blending_model: object = None):
    """
    ブレンディングアンサンブルを生成
    - 単純な平均、加重平均、学習済みメタモデルなど
    """
    from sklearn.linear_model import Ridge  # 例として Ridge を使用

    meta_model = blending_model or Ridge(alpha=1.0)
    return StackingEnsemble(base_models=base_models, meta_model=meta_model)


def create_meta_feature_ensemble(base_models: List, feature_generator: callable = None):
    """
    メタフィーチャー（例: モデル予測の残差など）を用いたアンサンブル
    - feature_generator は X から新しい特徴量を生成する関数
    """
    if feature_generator is None:

        def feature_generator(X):
            return X  # デフォルトでは元の特徴量を使用

    # ベースモデルの予測 + 生成されたメタフィーチャーを結合して学習
    class MetaFeatureEnsemble:
        def __init__(self, base_models, meta_model, feature_gen):
            self.base_models = base_models
            self.meta_model = meta_model  # 通常の学習器 (e.g., LogisticRegression, MLP)
            self.feature_gen = feature_gen

        def fit(self, X: np.ndarray, y: np.ndarray):
            # ベースモデルの予測を取得
            base_preds = np.array([model.predict(X) for model in self.base_models]).T  # shape: (n_samples, n_models)

            # メタフィーチャーを生成
            meta_features = self.feature_gen(X)  # shape: (n_samples, n_meta_features)

            # ベース予測 + メタフィーチャーを結合
            X_meta = np.hstack([base_preds, meta_features])  # shape: (n_samples, n_models + n_meta_features)

            # メタモデルを学習
            self.meta_model.fit(X_meta, y)

        def predict(self, X: np.ndarray) -> np.ndarray:
            base_preds = np.array([model.predict(X) for model in self.base_models]).T
            meta_features = self.feature_gen(X)
            X_meta = np.hstack([base_preds, meta_features])
            return self.meta_model.predict(X_meta)

    # 例: Ridge 回帰をメタモデルとして使用
    from sklearn.linear_model import Ridge

    return MetaFeatureEnsemble(base_models, Ridge(), feature_generator)


def ensemble_predict_with_confidence(ensemble: StackingEnsemble, X: np.ndarray, confidence_interval: float = 0.95):
    """
    信頼区間付きアンサンブル予測
    - アンサンブルの予測とその確信度を返す
    """
    # 予測
    y_pred = ensemble.predict(X)

    # 各ベースモデルの予測の分散を計算し、信頼区間とする
    base_predictions = np.array([model.predict(X) for model in ensemble.base_models])
    std = np.std(base_predictions, axis=0)

    # 信頼区間（簡易的に平均予測 +/- 1.96 * 標準偏差）
    z_score = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.576,
    }.get(confidence_interval, 1.96)
    margin = z_score * std

    return {
        "prediction": y_pred,
        "lower_bound": y_pred - margin,
        "upper_bound": y_pred + margin,
        "std": std,  # 予測の不確実性の指標
    }


class WeightedVotingEnsemble:
    """加重投票アンサンブル（分類用）"""

    def __init__(self, models: Dict[str, object], weights: Dict[str, float]):
        self.models = models
        self.weights = weights  # {model_name: weight}
        if set(models.keys()) != set(weights.keys()):
            raise ValueError("モデル名と重みのキーが一致していません。")

        # 重みを正規化
        total_weight = sum(weights.values())
        self.weights = {k: v / total_weight for k, v in weights.items()}

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """確率の加重平均を返す"""
        proba_sum = np.zeros((X.shape[0], len(list(self.models.values())[0].classes_)))
        for name, model in self.models.items():
            proba = model.predict_proba(X)  # shape: (n_samples, n_classes)
            proba_sum += self.weights[name] * proba
        return proba_sum

    def predict(self, X: np.ndarray) -> np.ndarray:
        """クラスの加重投票結果を返す"""
        proba = self.predict_proba(X)
        return np.argmax(proba, axis=1)


class OnlineEnsemble:
    """
    オンライン学習に対応したアンサンブル
    - 新しいデータが到着するたびにモデルを更新
    - Adagrad, Adam などの勾配降下法ベースで重みを更新
    """

    def __init__(
        self,
        models: List,
        initial_weights: List[float] = None,
        learning_rate: float = 0.01,
    ):
        self.models = models
        n_models = len(models)
        if initial_weights is None:
            self.weights = np.ones(n_models) / n_models  # 初期は均等重み
        else:
            if len(initial_weights) != n_models:
                raise ValueError("初期重みの数がモデル数と一致していません。")
            self.weights = np.array(initial_weights)

        self.learning_rate = learning_rate
        self.history = {"weights": [], "predictions": [], "errors": []}

    def partial_fit(self, X: np.ndarray, y: np.ndarray):
        """オンライン学習でモデルを更新"""
        # 各モデルで予測
        model_preds = np.array([model.predict(X) for model in self.models]).T  # shape: (n_samples, n_models)

        # アンサンブル予測（加重平均）
        ensemble_pred = np.average(model_preds, axis=1, weights=self.weights)

        # 各モデルの誤差を計算
        errors = np.abs(model_preds - y.reshape(-1, 1))  # shape: (n_samples, n_models)

        # 簡易的な重み更新（誤差が小さいモデルの重みを増やす）
        # これは例であり、実際のオンライン学習アルゴリズムはより複雑
        for i in range(len(self.models)):
            # サンプルごとの平均誤差
            avg_error = np.mean(errors[:, i])
            # 誤差に応じて重みを更新（誤差が小さいほど重みを増やす）
            self.weights[i] *= 1.0 + self.learning_rate / (1.0 + avg_error)
            # 重みを正規化
            self.weights = self.weights / np.sum(self.weights)

        # 履歴を記録
        self.history["weights"].append(self.weights.copy())
        self.history["predictions"].append(ensemble_pred)
        self.history["errors"].append(np.mean(errors, axis=0))

    def predict(self, X: np.ndarray) -> np.ndarray:
        """重み付き予測"""
        model_preds = np.array([model.predict(X) for model in self.models]).T
        return np.average(model_preds, axis=1, weights=self.weights)


class HierarchicalEnsemble:
    """
    階層的アンサンブル
    - 高レベルのメタモデルが、低レベルのベースモデルの出力を統合
    - 例: 業界ごとの予測 → 全体の傾向予測 など
    """

    def __init__(self, sector_models: Dict[str, object], global_model: object):
        self.sector_models = sector_models  # 業界ごとのモデル
        self.global_model = global_model  # 全体傾向を統合するモデル

    def fit(
        self,
        X_sector: Dict[str, np.ndarray],
        y_sector: Dict[str, np.ndarray],
        X_global: np.ndarray,
        y_global: np.ndarray,
    ):
        # 業界ごとのモデルを学習
        for sector, model in self.sector_models.items():
            if sector in X_sector and sector in y_sector:
                model.fit(X_sector[sector], y_sector[sector])

        # 業界モデルの出力を特徴量としてグローバルモデルを学習
        sector_predictions = {}
        for sector, model in self.sector_models.items():
            if sector in X_sector:
                sector_predictions[sector] = model.predict(X_sector[sector])

        # グローバル特徴量に業界予測を結合
        X_meta = np.column_stack(list(sector_predictions.values()) + [X_global])

        self.global_model.fit(X_meta, y_global)

    def predict(self, X_sector: Dict[str, np.ndarray], X_global: np.ndarray) -> np.ndarray:
        # 業界ごとの予測を取得
        sector_preds = []
        for sector, model in self.sector_models.items():
            if sector in X_sector:
                pred = model.predict(X_sector[sector])
                sector_preds.append(pred)
            else:
                # 欠損値の場合は0や平均値などで埋める
                sector_preds.append(np.zeros(X_global.shape[0]))

        # グローバル特徴量に結合して最終予測
        X_meta = np.column_stack(sector_preds + [X_global])
        return self.global_model.predict(X_meta)


def get_ensemble_strategy(ensemble_type: str, **kwargs):
    """
    指定されたアンサンブル戦略のインスタンスを返す
    """
    if ensemble_type == "stacking":
        return StackingEnsemble(**kwargs)
    elif ensemble_type == "dynamic_weighting":
        return DynamicWeightingEnsemble(**kwargs)
    elif ensemble_type == "diversity":
        return DiversityEnsemble(**kwargs)
    elif ensemble_type == "blending":
        return create_blending_ensemble(**kwargs)
    elif ensemble_type == "meta_feature":
        return create_meta_feature_ensemble(**kwargs)
    elif ensemble_type == "weighted_voting":
        return WeightedVotingEnsemble(**kwargs)
    elif ensemble_type == "online":
        return OnlineEnsemble(**kwargs)
    elif ensemble_type == "hierarchical":
        return HierarchicalEnsemble(**kwargs)
    else:
        raise ValueError(f"Unknown ensemble type: {ensemble_type}")
