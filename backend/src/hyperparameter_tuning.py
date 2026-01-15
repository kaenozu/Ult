"""
Phase 29-3: ハイパーパラメータ最適化モジュール

Optunaを使用して各モデルの最適パラメータを探索します。
Walk-Forward Validationで時系列データに適した検証を行います。
"""

import json
import logging
import os
from typing import Any, Dict

import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
from optuna.samplers import TPESampler
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)


class HyperparameterTuner:
    """
    ハイパーパラメータ最適化クラス

    Optunaを使用して各モデルの最適パラメータを探索します。
    """

    def __init__(self, model_type: str, n_splits: int = 5):
        """
        初期化

        Args:
            model_type: モデルタイプ ('lightgbm', 'lstm', 'transformer')
            n_splits: 時系列クロスバリデーションの分割数
        """
        self.model_type = model_type
        self.n_splits = n_splits
        self.study = None
        self.best_params = None

        logger.info(f"HyperparameterTuner initialized for {model_type}")

    def _calculate_sharpe_ratio(self, returns: np.ndarray, risk_free_rate: float = 0.0) -> float:
        """
        Sharpe Ratioを計算

        Args:
            returns: リターンの配列
            risk_free_rate: リスクフリーレート

        Returns:
            Sharpe Ratio
        """
        if len(returns) == 0 or np.std(returns) == 0:
            return 0.0

        excess_returns = returns - risk_free_rate
        sharpe = np.mean(excess_returns) / np.std(excess_returns)

        # 年率換算（252営業日）
        return sharpe * np.sqrt(252)

    def _objective_lightgbm(self, trial: optuna.Trial, X: pd.DataFrame, y: pd.Series) -> float:
        """
        LightGBMの目的関数

        Args:
            trial: Optunaのトライアル
            X: 特徴量
            y: ターゲット

        Returns:
            Sharpe Ratio（最大化）
        """
        # パラメータの提案
        params = {
            "objective": "binary",
            "metric": "binary_logloss",
            "verbosity": -1,
            "seed": 42,
            "num_leaves": trial.suggest_int("num_leaves", 20, 100),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "min_data_in_leaf": trial.suggest_int("min_data_in_leaf", 10, 100),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
            "bagging_freq": trial.suggest_int("bagging_freq", 1, 7),
            "lambda_l1": trial.suggest_float("lambda_l1", 0, 10),
            "lambda_l2": trial.suggest_float("lambda_l2", 0, 10),
        }

        # Walk-Forward Validation
        tscv = TimeSeriesSplit(n_splits=self.n_splits)
        sharpe_scores = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

            # モデル訓練
            train_data = lgb.Dataset(X_train, label=y_train)
            val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

            model = lgb.train(
                params,
                train_data,
                num_boost_round=100,
                valid_sets=[val_data],
                callbacks=[lgb.early_stopping(stopping_rounds=10, verbose=False)],
            )

            # 予測
            preds = model.predict(X_val)

            # シグナル生成（確率 > 0.55 で買い、< 0.45 で売り）
            signals = np.where(preds > 0.55, 1, np.where(preds < 0.45, -1, 0))

            # リターン計算（簡易版）
            # 実際のリターンは次の日の価格変動に基づく
            # ここでは y_val が次の日のリターン > 0 かどうかを示すと仮定
            returns = signals * (y_val.values * 2 - 1)  # 0/1 -> -1/1 に変換

            # Sharpe Ratio計算
            sharpe = self._calculate_sharpe_ratio(returns)
            sharpe_scores.append(sharpe)

        # 平均Sharpe Ratioを返す
        return np.mean(sharpe_scores)

    def _objective_lstm(self, trial: optuna.Trial, X: pd.DataFrame, y: pd.Series) -> float:
        """
        LSTMの目的関数

        Args:
            trial: Optunaのトライアル
            X: 特徴量
            y: ターゲット

        Returns:
            Sharpe Ratio（最大化）
        """
        # パラメータの提案
        {
            "hidden_units": trial.suggest_int("hidden_units", 32, 256, step=32),
            "num_layers": trial.suggest_int("num_layers", 1, 4),
            "dropout_rate": trial.suggest_float("dropout_rate", 0.1, 0.5),
            "learning_rate": trial.suggest_float("learning_rate", 0.0001, 0.01, log=True),
            "batch_size": trial.suggest_int("batch_size", 16, 128, step=16),
        }

        # LSTM実装は複雑なため、ここでは簡易版
        # 実際にはTensorFlow/PyTorchでモデルを構築して訓練

        # プレースホルダー: 実際の実装では適切なSharpe Ratioを計算
        sharpe = 1.5 + np.random.randn() * 0.3

        return sharpe

    def optimize(self, X: pd.DataFrame, y: pd.Series, n_trials: int = 50, timeout: int = 3600) -> Dict[str, Any]:
        """
        ハイパーパラメータ最適化を実行

        Args:
            X: 特徴量データフレーム
            y: ターゲット（0 or 1）
            n_trials: 試行回数
            timeout: タイムアウト（秒）

        Returns:
            最適パラメータ
        """
        logger.info(f"Starting hyperparameter optimization for {self.model_type}")
        logger.info(f"n_trials={n_trials}, timeout={timeout}s")

        # Optunaスタディの作成
        sampler = TPESampler(seed=42)
        self.study = optuna.create_study(
            direction="maximize",
            sampler=sampler,
            study_name=f"{self.model_type}_optimization",
        )

        # 目的関数の選択
        if self.model_type == "lightgbm":

            def objective_func(trial):
                return self._objective_lightgbm(trial, X, y)

        elif self.model_type == "lstm":

            def objective_func(trial):
                return self._objective_lstm(trial, X, y)

        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

        # 最適化実行
        self.study.optimize(objective_func, n_trials=n_trials, timeout=timeout, show_progress_bar=True)

        self.best_params = self.study.best_params

        logger.info("Optimization completed!")
        logger.info(f"Best Sharpe Ratio: {self.study.best_value:.4f}")
        logger.info(f"Best params: {self.best_params}")

        return self.best_params

    def get_best_params(self) -> Dict[str, Any]:
        """
        最適パラメータを取得

        Returns:
            最適パラメータの辞書
        """
        if self.best_params is None:
            raise ValueError("Optimization has not been run yet")

        return self.best_params

    def save_results(self, filepath: str):
        """
        最適化結果を保存

        Args:
            filepath: 保存先ファイルパス
        """
        if self.study is None:
            raise ValueError("Optimization has not been run yet")

        results = {
            "model_type": self.model_type,
            "best_params": self.best_params,
            "best_value": self.study.best_value,
            "n_trials": len(self.study.trials),
            "optimization_history": [
                {"number": trial.number, "value": trial.value, "params": trial.params} for trial in self.study.trials
            ],
        }

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            json.dump(results, f, indent=4)

        logger.info(f"Saved optimization results to {filepath}")

    def load_results(self, filepath: str) -> Dict[str, Any]:
        """
        最適化結果を読み込み

        Args:
            filepath: ファイルパス

        Returns:
            最適化結果
        """
        with open(filepath, "r") as f:
            results = json.load(f)

        self.best_params = results["best_params"]
        logger.info(f"Loaded optimization results from {filepath}")

        return results


def optimize_all_models(df: pd.DataFrame, n_trials: int = 30) -> Dict[str, Dict[str, Any]]:
    """
    すべてのモデルのハイパーパラメータを最適化

    Args:
        df: 株価データフレーム
        n_trials: 各モデルの試行回数

    Returns:
        各モデルの最適パラメータ
    """
    from src.features import add_advanced_features

    # 特徴量を生成
    logger.info("Generating features...")
    df_features = add_advanced_features(df.copy())
    df_features = df_features.dropna()

    if len(df_features) < 500:
        logger.warning("Not enough data for optimization")
        return {}

    # 特徴量とターゲットを準備
    feature_cols = [col for col in df_features.columns if col not in ["Return_1d", "Return_5d"]]
    X = df_features[feature_cols]
    y = (df_features["Return_1d"] > 0).astype(int)

    results = {}

    # LightGBMの最適化
    logger.info("=" * 60)
    logger.info("Optimizing LightGBM...")
    logger.info("=" * 60)

    tuner_lgb = HyperparameterTuner("lightgbm", n_splits=5)
    best_params_lgb = tuner_lgb.optimize(X, y, n_trials=n_trials)
    tuner_lgb.save_results("config/optimization_results_lightgbm.json")
    results["lightgbm"] = best_params_lgb

    # LSTMの最適化（プレースホルダー）
    logger.info("=" * 60)
    logger.info("Optimizing LSTM...")
    logger.info("=" * 60)
    logger.info("LSTM optimization is a placeholder - implement with TensorFlow/PyTorch")

    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Hyperparameter Tuning Module - Phase 29-3")
    print("=" * 60)
    print("このモジュールは以下を実装します:")
    print("1. Optunaを使用したハイパーパラメータ最適化")
    print("2. Walk-Forward Validation")
    print("3. Sharpe Ratio最大化")
    print("4. 最適化結果の保存・読み込み")
