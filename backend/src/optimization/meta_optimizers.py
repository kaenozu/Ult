import json
import logging
import os
from typing import Any, Dict, Tuple

import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score

from src.features import add_advanced_features

logger = logging.getLogger(__name__)


class HyperparameterOptimizer:
    def __init__(self, config_path: str = "config/model_params.json"):
        self.config_path = config_path
        self.best_params = {}
        self._load_current_params()

    def _load_current_params(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r") as f:
                    self.best_params = json.load(f)
            except Exception as e:
                logger.error(f"Error loading model params: {e}")
                self.best_params = {}
        else:
            self.best_params = {}

    def save_params(self):
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, "w") as f:
            json.dump(self.best_params, f, indent=4)
        logger.info(f"Saved optimized parameters to {self.config_path}")

    def optimize_random_forest(self, df: pd.DataFrame, n_trials: int = 20) -> Dict[str, Any]:
        """
        Optimizes Random Forest parameters using Optuna.
        """
        logger.info("Starting Random Forest optimization...")

        # Prepare Data
        data = add_advanced_features(df).dropna()
        if len(data) < 100:
            logger.warning("Not enough data for optimization")
            return {}

        # Target: Next day return > 0
        X = data[
            [
                "RSI",
                "SMA_Ratio",
                "Volatility",
                "Ret_1",
                "Ret_5",
                "Freq_Power",
                "Sentiment_Score",
            ]
        ]
        y = (data["Return_1d"] > 0).astype(int)

        # Time-series split
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        def objective(trial):
            n_estimators = trial.suggest_int("n_estimators", 50, 300)
            max_depth = trial.suggest_int("max_depth", 3, 20)
            min_samples_split = trial.suggest_int("min_samples_split", 2, 10)

            clf = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
            )

            clf.fit(X_train, y_train)
            preds = clf.predict(X_test)
            return precision_score(y_test, preds, zero_division=0)

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)

        logger.info(f"Best RF params: {study.best_params}")
        self.best_params["random_forest"] = study.best_params
        self.save_params()
        return study.best_params

    def optimize_lightgbm(self, df: pd.DataFrame, n_trials: int = 20) -> Dict[str, Any]:
        """
        Optimizes LightGBM parameters.
        """
        logger.info("Starting LightGBM optimization...")

        data = add_advanced_features(df).dropna()
        if len(data) < 100:
            return {}

        feature_cols = [
            "ATR",
            "BB_Width",
            "RSI",
            "MACD",
            "Dist_SMA_20",
            "Freq_Power",
            "Sentiment_Score",
        ]
        X = data[feature_cols]
        y = (data["Return_1d"] > 0).astype(int)

        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

        def objective(trial):
            param = {
                "objective": "binary",
                "metric": "binary_logloss",
                "verbosity": -1,
                "boosting_type": "gbdt",
                "feature_pre_filter": False,
                "lambda_l1": trial.suggest_float("lambda_l1", 1e-8, 10.0, log=True),
                "lambda_l2": trial.suggest_float("lambda_l2", 1e-8, 10.0, log=True),
                "num_leaves": trial.suggest_int("num_leaves", 2, 256),
                "feature_fraction": trial.suggest_float("feature_fraction", 0.4, 1.0),
                "bagging_fraction": trial.suggest_float("bagging_fraction", 0.4, 1.0),
                "bagging_freq": trial.suggest_int("bagging_freq", 1, 7),
                "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
            }

            gbm = lgb.train(
                param,
                train_data,
                valid_sets=[valid_data],
                callbacks=[
                    lgb.early_stopping(stopping_rounds=10),
                    lgb.log_evaluation(False),
                ],
            )

            preds = gbm.predict(X_test)
            pred_labels = np.rint(preds)
            accuracy = accuracy_score(y_test, pred_labels)
            return accuracy

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)

        logger.info(f"Best LGBM params: {study.best_params}")
        self.best_params["lightgbm"] = study.best_params
        self.save_params()
        return study.best_params

    def optimize_transformer(self, df: pd.DataFrame, n_trials: int = 20) -> Dict[str, Any]:
        """
        Optimizes Transformer parameters.
        """
        logger.info("Starting Transformer optimization...")

        # 簡易的な実装: 実際にはTransformerモデルの学習が必要だが、
        # ここではパラメータ探索の枠組みのみ実装

        def objective(trial):
            # 探索空間
            {
                "hidden_size": trial.suggest_categorical("hidden_size", [32, 64, 128]),
                "num_attention_heads": trial.suggest_categorical("num_attention_heads", [2, 4, 8]),
                "num_encoder_layers": trial.suggest_int("num_encoder_layers", 1, 3),
                "dropout": trial.suggest_float("dropout", 0.0, 0.3),
                "learning_rate": trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True),
                "batch_size": trial.suggest_categorical("batch_size", [16, 32, 64]),
            }

            # 評価スコア（ダミー）
            # 実際にはここでモデル学習を行う
            return np.random.random()

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)

        best_params = study.best_params
        logger.info(f"Best Transformer params: {best_params}")

        self.best_params["transformer"] = best_params
        self.save_params()

        return best_params


if __name__ == "__main__":
    # Test run
    from src.data_loader import fetch_stock_data

    logging.basicConfig(level=logging.INFO)

    data = fetch_stock_data(["7203.T"], period="2y")
    if data:
        df = data["7203.T"]
        optimizer = HyperparameterOptimizer()
        optimizer.optimize_random_forest(df, n_trials=2)
        optimizer.optimize_lightgbm(df, n_trials=2)

    def optimize_transformer(self, df: pd.DataFrame, n_trials: int = 10) -> Dict[str, Any]:
        """
        Optimizes Transformer parameters using Optuna.
        """
        logger.info("Starting Transformer optimization...")

        try:
            from src.transformer_model import TemporalFusionTransformer
        except ImportError:
            logger.error("Transformer model not available")
            return {}

        data = add_advanced_features(df).dropna()
        if len(data) < 200:
            logger.warning("Not enough data for Transformer optimization")
            return {}

        # 数値カラムのみ選択
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        input_size = len(numeric_cols)

        # シーケンス準備（検証用）
        # ここでは簡易的に直近のデータを検証セットとする
        split_idx = int(len(data) * 0.8)
        train_df = data.iloc[:split_idx]
        val_df = data.iloc[split_idx:]

        def objective(trial):
            # Hyperparameters
            hidden_size = trial.suggest_categorical("hidden_size", [32, 64, 128])
            num_attention_heads = trial.suggest_categorical("num_attention_heads", [2, 4])
            num_encoder_layers = trial.suggest_int("num_encoder_layers", 1, 3)
            dropout = trial.suggest_float("dropout", 0.0, 0.3)
            learning_rate = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
            batch_size = trial.suggest_categorical("batch_size", [16, 32, 64])

            # Model
            model = TemporalFusionTransformer(
                input_size=input_size,
                hidden_size=hidden_size,
                num_attention_heads=num_attention_heads,
                dropout=dropout,
                num_encoder_layers=num_encoder_layers,
                learning_rate=learning_rate,
            )

            # Data Prep
            X_train, y_train = model.prepare_sequences(train_df, sequence_length=30, forecast_horizon=5)
            X_val, y_val = model.prepare_sequences(val_df, sequence_length=30, forecast_horizon=5)

            if len(X_train) == 0 or len(X_val) == 0:
                raise optuna.TrialPruned("Not enough data for sequences")

            # Train
            # エポック数は少なめに設定して高速化
            model.fit(
                X_train,
                y_train,
                epochs=5,
                batch_size=batch_size,
                validation_split=0.0,  # 手動で検証セットを用意したため
                verbose=0,
            )

            # Evaluate
            val_loss = model.model.evaluate(X_val, y_val, verbose=0)[0]

            return val_loss

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=n_trials)

        logger.info(f"Best Transformer params: {study.best_params}")
        self.best_params["transformer"] = study.best_params
        self.save_params()
        return study.best_params


def optimize_strategy_wfo(
    df: pd.DataFrame,
    strategy_class,
    param_grid: Dict[str, Tuple],
    window_size: int = 252,  # 1 year
    step_size: int = 63,  # 3 months
    n_trials: int = 10,
) -> Dict[str, Any]:
    """
    Walk-Forward Optimization (WFO)

    データを複数のウィンドウに分割し、各ウィンドウで:
        pass
    1. 訓練期間でパラメータ最適化
    2. テスト期間でパフォーマンス測定

    Args:
        df: 株価データ
        strategy_class: 最適化する戦略クラス
        param_grid: パラメータの探索範囲 {'param_name': (min, max)}
        window_size: 訓練期間の長さ (日数)
        step_size: ウィンドウのステップサイズ (日数)
        n_trials: 各ウィンドウでの試行回数

    Returns:
        各ウィンドウの最適パラメータとパフォーマンス
    """
    logger.info("Starting Walk-Forward Optimization...")

    results = []
    total_len = len(df)

    # ウィンドウをスライド
    for start_idx in range(0, total_len - window_size - step_size, step_size):
        train_end = start_idx + window_size
        test_end = min(train_end + step_size, total_len)

        train_df = df.iloc[start_idx:train_end]
        test_df = df.iloc[train_end:test_end]

        logger.info(f"Window: train={start_idx}:{train_end}, test={train_end}:{test_end}")

        # Optuna で訓練期間のパラメータ最適化
        def objective(trial):
            # パラメータをサンプリング
            params = {}
            for param_name, (low, high) in param_grid.items():
                if isinstance(low, int):
                    params[param_name] = trial.suggest_int(param_name, low, high)
                else:
                    params[param_name] = trial.suggest_float(param_name, low, high)

            # 戦略を初期化
            strategy = strategy_class(**params)

            # シグナル生成
            signals = strategy.generate_signals(train_df)

            # バックテスト (簡易版)
            returns = train_df["Close"].pct_change()
            strategy_returns = signals.shift(1) * returns
            sharpe = strategy_returns.mean() / (strategy_returns.std() + 1e-6) * np.sqrt(252)

            return sharpe

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

        best_params = study.best_params

        # テスト期間でパフォーマンス測定
        test_strategy = strategy_class(**best_params)
        test_signals = test_strategy.generate_signals(test_df)
        test_returns = test_df["Close"].pct_change()
        test_strategy_returns = test_signals.shift(1) * test_returns
        test_sharpe = test_strategy_returns.mean() / (test_strategy_returns.std() + 1e-6) * np.sqrt(252)

        results.append(
            {
                "window": f"{start_idx}-{test_end}",
                "best_params": best_params,
                "train_sharpe": study.best_value,
                "test_sharpe": test_sharpe,
            }
        )

        logger.info(f"Best params: {best_params}, Train Sharpe: {study.best_value:.2f}, Test Sharpe: {test_sharpe:.2f}")

    # 全ウィンドウの平均パラメータを計算
    avg_params = {}
    for param_name in param_grid.keys():
        values = [r["best_params"][param_name] for r in results]
        avg_params[param_name] = np.mean(values)

    logger.info(f"WFO completed. Average params: {avg_params}")

    return {
        "windows": results,
        "average_params": avg_params,
        "overall_test_sharpe": np.mean([r["test_sharpe"] for r in results]),
    }


def optimize_multi_objective(
    df: pd.DataFrame, strategy_class, param_grid: Dict[str, Tuple], n_trials: int = 50
) -> Dict[str, Any]:
    """
    多目的最適化: リターンとリスク(ドローダウン)を同時最適化

    Args:
        df: 株価データ
        strategy_class: 最適化する戦略クラス
        param_grid: パラメータの探索範囲
        n_trials: 試行回数

    Returns:
        パレート最適解のリスト
    """
    logger.info("Starting Multi-Objective Optimization...")

    def objective(trial):
        # パラメータをサンプリング
        params = {}
        for param_name, (low, high) in param_grid.items():
            if isinstance(low, int):
                params[param_name] = trial.suggest_int(param_name, low, high)
            else:
                params[param_name] = trial.suggest_float(param_name, low, high)

        # 戦略を初期化
        strategy = strategy_class(**params)

        # シグナル生成
        signals = strategy.generate_signals(df)

        # バックテスト
        returns = df["Close"].pct_change()
        strategy_returns = signals.shift(1) * returns

        # 目的関数1: 総リターンを最大化
        total_return = (1 + strategy_returns).prod() - 1

        # 目的関数2: 最大ドローダウンを最小化 (負の値なので最大化)
        cumulative = (1 + strategy_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()

        # Optunaは最大化/最小化のどちらかなので、max_drawdownの絶対値を最小化
        return total_return, -max_drawdown  # (maximize, minimize)

    study = optuna.create_study(directions=["maximize", "minimize"])
    study.optimize(objective, n_trials=n_trials)

    # パレート最適解を取得
    pareto_trials = [t for t in study.best_trials]

    results = []
    for trial in pareto_trials[:10]:  # 上位10個
        results.append(
            {
                "params": trial.params,
                "total_return": trial.values[0],
                "max_drawdown": -trial.values[1],
            }
        )

    logger.info(f"Found {len(pareto_trials)} Pareto optimal solutions")

    return {"pareto_solutions": results, "best_balanced": results[0] if results else {}}
