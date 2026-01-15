"""
ハイパーパラメータ最適化モジュール

Optunaを使用して、各予測モデルの最適なハイパーパラメータを探索します。
- LSTM, LightGBM, Transformerモデルの最適化
- ベイズ最適化
- 時系列特化の交差検証
"""

import logging
import warnings
from typing import Any, Callable, Dict

import lightgbm as lgb
import numpy as np
import optuna
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from tensorflow import keras

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class HyperparameterOptimizer:
    """ハイパーパラメータ最適化クラス"""

    def __init__(self, objective_func: Callable, n_trials: int = 50):
        self.objective_func = objective_func
        self.n_trials = n_trials
        self.study = None

    def optimize(self) -> Dict[str, Any]:
        """最適化を実行"""
        self.study = optuna.create_study(direction="minimize")
        self.study.optimize(self.objective_func, n_trials=self.n_trials)

        logger.info(f"Best params: {self.study.best_params}")
        logger.info(f"Best value: {self.study.best_value}")

        return self.study.best_params


def create_lstm_objective(X: np.ndarray, y: np.ndarray, cv_folds: int = 3):
    """LSTMモデル用の目的関数を作成"""

    def objective(trial):
        # ハイパーパラメータの提案
        hidden_dim = trial.suggest_int("hidden_dim", 32, 128)
        num_layers = trial.suggest_int("num_layers", 1, 3)
        dropout = trial.suggest_float("dropout", 0.1, 0.5)
        learning_rate = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
        batch_size = trial.suggest_categorical("batch_size", [16, 32, 64])
        epochs = trial.suggest_int("epochs", 10, 50)

        # 時系列交差検証
        tscv = TimeSeriesSplit(n_splits=cv_folds)
        scores = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # モデル構築
            model = keras.Sequential()
            for i in range(num_layers):
                return_sequences = i < num_layers - 1
                model.add(
                    keras.layers.LSTM(
                        hidden_dim,
                        return_sequences=return_sequences,
                        dropout=dropout,
                        recurrent_dropout=dropout,
                    )
                )

            model.add(keras.layers.Dense(y.shape[1]))
            model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
                loss="mse",
                metrics=["mae"],
            )

            # 学習
            model.fit(
                X_train,
                y_train,
                epochs=epochs,
                batch_size=batch_size,
                verbose=0,
                validation_data=(X_val, y_val),
            )

            # 検証スコア
            val_pred = model.predict(X_val, verbose=0)
            score = mean_squared_error(y_val, val_pred)
            scores.append(score)

        return np.mean(scores)

    return objective


def create_lgbm_objective(X: np.ndarray, y: np.ndarray, cv_folds: int = 3):
    """LightGBMモデル用の目的関数を作成"""

    def objective(trial):
        # ハイパーパラメータの提案
        n_estimators = trial.suggest_int("n_estimators", 50, 300)
        learning_rate = trial.suggest_float("learning_rate", 0.01, 0.3, log=True)
        max_depth = trial.suggest_int("max_depth", 3, 10)
        num_leaves = trial.suggest_int("num_leaves", 20, 100)
        min_child_samples = trial.suggest_int("min_child_samples", 5, 50)
        subsample = trial.suggest_float("subsample", 0.6, 1.0)
        colsample_bytree = trial.suggest_float("colsample_bytree", 0.6, 1.0)

        # 時系列交差検証
        tscv = TimeSeriesSplit(n_splits=cv_folds)
        scores = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # LightGBMデータセット作成
            train_data = lgb.Dataset(X_train, label=y_train)
            val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

            # パラメータの準備
            params = {
                "objective": "regression",
                "metric": "mse",
                "boosting_type": "gbdt",
                "n_estimators": n_estimators,
                "learning_rate": learning_rate,
                "max_depth": max_depth,
                "num_leaves": num_leaves,
                "min_child_samples": min_child_samples,
                "subsample": subsample,
                "colsample_bytree": colsample_bytree,
                "random_state": 42,
                "verbose": -1,
            }

            # 学習
            model = lgb.train(
                params,
                train_data,
                valid_sets=[train_data, val_data],
                callbacks=[lgb.early_stopping(stopping_rounds=10)],
                verbose_eval=False,
            )

            # 検証スコア
            val_pred = model.predict(X_val)
            score = mean_squared_error(y_val, val_pred)
            scores.append(score)

        return np.mean(scores)

    return objective


def create_transformer_objective(X: np.ndarray, y: np.ndarray, cv_folds: int = 3):
    """Transformerモデル用の目的関数を作成"""

    def objective(trial):
        # ハイパーパラメータの提案
        hidden_size = trial.suggest_int("hidden_size", 32, 128)
        num_heads = trial.suggest_int("num_heads", 2, 8)
        trial.suggest_int("num_layers", 1, 3)
        dropout = trial.suggest_float("dropout", 0.1, 0.5)
        learning_rate = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
        batch_size = trial.suggest_categorical("batch_size", [16, 32, 64])
        epochs = trial.suggest_int("epochs", 10, 50)

        # 時系列交差検証
        tscv = TimeSeriesSplit(n_splits=cv_folds)
        scores = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # Transformerモデルの構築（簡単なMulti-Head Attentionモデル）
            inputs = keras.Input(shape=X_train.shape[1:])

            x = keras.layers.MultiHeadAttention(num_heads=num_heads, key_dim=hidden_size // num_heads)(inputs, inputs)
            x = keras.layers.Dropout(dropout)(x)

            # 残差接続
            x = x + inputs
            x = keras.layers.LayerNormalization()(x)

            # Feed Forward
            x = keras.layers.Dense(hidden_size * 2, activation="relu")(x)
            x = keras.layers.Dropout(dropout)(x)
            x = keras.layers.Dense(hidden_size)(x)
            x = keras.layers.Dropout(dropout)(x)

            # グローバル平均プーリングと出力
            x = keras.layers.GlobalAveragePooling1D()(x)
            outputs = keras.layers.Dense(y_train.shape[1])(x)

            model = keras.Model(inputs=inputs, outputs=outputs)

            model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
                loss="mse",
                metrics=["mae"],
            )

            # 学習
            model.fit(
                X_train,
                y_train,
                epochs=epochs,
                batch_size=batch_size,
                verbose=0,
                validation_data=(X_val, y_val),
            )

            # 検証スコア
            val_pred = model.predict(X_val, verbose=0)
            score = mean_squared_error(y_val, val_pred)
            scores.append(score)

        return np.mean(scores)

    return objective


def optimize_lstm_params(X: np.ndarray, y: np.ndarray, n_trials: int = 30) -> Dict[str, Any]:
    """LSTMモデルのハイパーパラメータを最適化"""
    objective = create_lstm_objective(X, y)
    optimizer = HyperparameterOptimizer(objective, n_trials=n_trials)
    return optimizer.optimize()


def optimize_lgbm_params(X: np.ndarray, y: np.ndarray, n_trials: int = 30) -> Dict[str, Any]:
    """LightGBMモデルのハイパーパラメータを最適化"""
    objective = create_lgbm_objective(X, y)
    optimizer = HyperparameterOptimizer(objective, n_trials=n_trials)
    return optimizer.optimize()


def optimize_transformer_params(X: np.ndarray, y: np.ndarray, n_trials: int = 30) -> Dict[str, Any]:
    """Transformerモデルのハイパーパメータを最適化"""
    objective = create_transformer_objective(X, y)
    optimizer = HyperparameterOptimizer(objective, n_trials=n_trials)
    return optimizer.optimize()


class MultiModelOptimizer:
    """複数モデルのハイパーパラメータを最適化するクラス"""

    def __init__(self, cv_folds: int = 3):
        self.cv_folds = cv_folds
        self.best_params = {}

    def optimize(self, model, X=None, y=None, model_name: str = None) -> Dict[str, Any]:
        """
        単一モデルの最適化
        初期化時はX, yがNoneの場合があるため、その時は推奨デフォルト値を返す
        """
        if X is None or y is None:
            # 推奨デフォルトパラメータ（各モデルの__init__のデフォルトに近いもの）
            return {}

        # 実際の最適化が必要な場合は、既存の関数を呼び出す
        # (ここでは簡略化のため空の辞書を返す)
        return {}

    def optimize_all_models(
        self,
        X: np.ndarray,
        y: np.ndarray,
        model_types: list = ["lstm", "lgbm", "transformer"],
        n_trials_per_model: int = 20,
    ) -> Dict[str, Dict[str, Any]]:
        """すべてのモデルのハイパーパラメータを最適化"""

        for model_type in model_types:
            logger.info(f"Optimizing {model_type} model...")

            if model_type == "lstm":
                self.best_params[model_type] = optimize_lstm_params(X, y, n_trials=n_trials_per_model)
            elif model_type == "lgbm":
                self.best_params[model_type] = optimize_lgbm_params(X, y, n_trials=n_trials_per_model)
            elif model_type == "transformer":
                self.best_params[model_type] = optimize_transformer_params(X, y, n_trials=n_trials_per_model)

            logger.info(f"Completed optimization for {model_type}")

        return self.best_params


def create_dynamic_optimizer():
    """市場状況に応じた動的パラメータ調整のためのクラス"""

    class DynamicOptimizer:
        def __init__(self):
            self.market_regime = "normal"  # normal, high_volatility, low_volatility, trending
            self.model_performance_history = {}

        def update_regime(self, volatility: float, trend_strength: float):
            """市場レジームを更新"""
            if volatility > 0.02:  # 高ボラティリティ
                self.market_regime = "high_volatility"
            elif volatility < 0.005:  # 低ボラティリティ
                self.market_regime = "low_volatility"
            elif trend_strength > 0.7:  # 強いトレンド
                self.market_regime = "trending"
            else:
                self.market_regime = "normal"

        def get_adaptive_params(self, model_type: str) -> Dict[str, Any]:
            """市場レジームに基づいて適応的なパラメータを返す"""
            base_params = {
                "lstm": {
                    "hidden_dim": 64,
                    "num_layers": 2,
                    "dropout": 0.2,
                    "learning_rate": 0.001,
                    "batch_size": 32,
                    "epochs": 30,
                },
                "lgbm": {
                    "n_estimators": 100,
                    "learning_rate": 0.1,
                    "max_depth": 6,
                    "num_leaves": 50,
                    "min_child_samples": 20,
                    "subsample": 0.8,
                    "colsample_bytree": 0.8,
                },
            }

            params = base_params.get(model_type, {}).copy()

            # 市場レジームに基づくパラメータ調整
            if self.market_regime == "high_volatility":
                # 高ボラティリティでは過学習を防ぐためにドロップアウトを増加
                if "dropout" in params:
                    params["dropout"] = min(params["dropout"] + 0.1, 0.5)
                if "learning_rate" in params:
                    params["learning_rate"] = max(params["learning_rate"] * 0.8, 1e-5)
            elif self.market_regime == "low_volatility":
                # 低ボラティリティでは学習を深く進める
                if "epochs" in params:
                    params["epochs"] = min(params["epochs"] + 10, 100)
            elif self.market_regime == "trending":
                # トレンド中は短期的な変化に敏感になるように
                if "learning_rate" in params:
                    params["learning_rate"] = min(params["learning_rate"] * 1.2, 0.3)

            return params

    return DynamicOptimizer()


if __name__ == "__main__":
    # テスト用の実装
    logging.basicConfig(level=logging.INFO)

    # ダミーデータの作成
    np.random.seed(42)
    n_samples, sequence_length, n_features = 200, 30, 10
    X = np.random.randn(n_samples, sequence_length, n_features).astype(np.float32)
    y = np.random.randn(n_samples, 5).astype(np.float32)  # 5ステップ先予測

    # 複数モデルの最適化
    optimizer = MultiModelOptimizer(cv_folds=3)
    best_params = optimizer.optimize_all_models(
        X,
        y,
        model_types=["lstm", "lgbm"],
        n_trials_per_model=10,  # 実際には30-50を推奨
    )

    print("Best parameters found:")
    for model_type, params in best_params.items():
        print(f"{model_type}: {params}")

    # 動的オプティマイザーのテスト
    dynamic_opt = create_dynamic_optimizer()

    # テスト用の市場状況
    dynamic_opt.update_regime(volatility=0.01, trend_strength=0.3)
    print(f"\nCurrent market regime: {dynamic_opt.market_regime}")
    print(f"Adaptive LSTM params: {dynamic_opt.get_adaptive_params('lstm')}")

    dynamic_opt.update_regime(volatility=0.03, trend_strength=0.3)
    print(f"Updated market regime: {dynamic_opt.market_regime}")
    print(f"Adaptive LSTM params: {dynamic_opt.get_adaptive_params('lstm')}")
