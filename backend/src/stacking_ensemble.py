"""
Phase 29-2: Stacking Ensemble Implementation

複数の基本モデル（Level 1）の予測を統合し、
メタモデル（Level 2）で最終予測を行うスタッキングアンサンブルを実装します。

アーキテクチャ:
    pass
Level 1: LightGBM, LSTM, Transformer, GRU
↓ (各モデルの予測確率)
Level 2: XGBoost Meta-Learner
↓
Final Prediction
"""

import logging
from typing import List, Optional

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)


class StackingEnsemble:
    """
    スタッキングアンサンブルクラス

    複数の基本モデルの予測を統合し、メタモデルで最終予測を行います。
    """

    def __init__(self, base_models: Optional[List] = None):
        """
        初期化

        Args:
            base_models: Level 1の基本モデルリスト
        """
        self.base_models = base_models or []
        self.meta_model = None
        self.is_trained = False

        logger.info(f"StackingEnsemble initialized with {len(self.base_models)} base models")

    def add_base_model(self, model, name: str):
        """
        基本モデルを追加

        Args:
            model: 基本モデル（predict_probaメソッドを持つ）
            name: モデル名
        """
        self.base_models.append({"model": model, "name": name})
        logger.info(f"Added base model: {name}")

    def _get_base_predictions(self, X: pd.DataFrame, train: bool = False) -> pd.DataFrame:
        """
        Level 1モデルの予測を取得

        Args:
            X: 特徴量データフレーム
            train: 訓練モードかどうか

        Returns:
            各モデルの予測確率を含むデータフレーム
        """
        predictions = pd.DataFrame(index=X.index)

        for model_info in self.base_models:
            model = model_info["model"]
            name = model_info["name"]

            try:
                # モデルの予測を取得
                if hasattr(model, "predict_proba"):
                    # 分類モデル（確率を返す）
                    pred = model.predict_proba(X)
                    # 2クラス分類の場合、クラス1の確率のみ使用
                    if pred.ndim == 2 and pred.shape[1] == 2:
                        predictions[f"{name}_prob"] = pred[:, 1]
                    else:
                        predictions[f"{name}_prob"] = pred
                elif hasattr(model, "predict"):
                    # 回帰モデル
                    predictions[f"{name}_pred"] = model.predict(X)
                else:
                    logger.warning(f"Model {name} has no predict method")

            except Exception as e:
                logger.error(f"Error getting predictions from {name}: {e}")
                predictions[f"{name}_prob"] = 0.5  # デフォルト値

        return predictions

    def fit(self, X: pd.DataFrame, y: pd.Series, n_splits: int = 5):
        """
        スタッキングアンサンブルを訓練

        Args:
            X: 特徴量データフレーム
            y: ターゲット（0 or 1）
            n_splits: 時系列クロスバリデーションの分割数
        """
        logger.info("Training Stacking Ensemble...")

        # Level 1モデルの訓練（既に訓練済みと仮定）
        # ここでは各モデルが既にfitされていることを前提とする

        # Out-of-Fold予測を生成（過学習を防ぐ）
        tscv = TimeSeriesSplit(n_splits=n_splits)
        oof_predictions = pd.DataFrame(index=X.index)

        for model_info in self.base_models:
            model = model_info["model"]
            name = model_info["name"]
            oof_pred = np.zeros(len(X))

            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train = y.iloc[train_idx]

                # モデルを訓練
                try:
                    if hasattr(model, "fit"):
                        model.fit(X_train, y_train)

                    # 検証セットで予測
                    if hasattr(model, "predict_proba"):
                        pred = model.predict_proba(X_val)
                        if pred.ndim == 2 and pred.shape[1] == 2:
                            oof_pred[val_idx] = pred[:, 1]
                        else:
                            oof_pred[val_idx] = pred
                    elif hasattr(model, "predict"):
                        oof_pred[val_idx] = model.predict(X_val)

                except Exception as e:
                    logger.error(f"Error training {name}: {e}")
                    oof_pred[val_idx] = 0.5

            oof_predictions[f"{name}_prob"] = oof_pred

        # Level 2メタモデルの訓練
        logger.info("Training Level 2 meta-model...")

        # XGBoost/LightGBMをメタモデルとして使用
        params = {
            "objective": "binary",
            "metric": "binary_logloss",
            "verbosity": -1,
            "seed": 42,
            "num_leaves": 31,
            "learning_rate": 0.05,
            "feature_fraction": 0.8,
        }

        train_data = lgb.Dataset(oof_predictions, label=y)
        self.meta_model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[train_data],
            callbacks=[lgb.early_stopping(stopping_rounds=10, verbose=False)],
        )

        self.is_trained = True
        logger.info("Stacking Ensemble training completed")

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """
        確率予測

        Args:
            X: 特徴量データフレーム

        Returns:
            予測確率（0~1）
        """
        if not self.is_trained:
            raise ValueError("Model is not trained yet")

        # Level 1の予測を取得
        base_predictions = self._get_base_predictions(X, train=False)

        # Level 2で最終予測
        final_pred = self.meta_model.predict(base_predictions)

        return final_pred

    def predict(self, X: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        """
        クラス予測

        Args:
            X: 特徴量データフレーム
            threshold: 分類閾値

        Returns:
            予測クラス（0 or 1）
        """
        proba = self.predict_proba(X)
        return (proba > threshold).astype(int)

    def get_feature_importance(self) -> pd.DataFrame:
        """
        メタモデルの特徴量重要度を取得

        Returns:
            特徴量重要度のデータフレーム
        """
        if not self.is_trained or self.meta_model is None:
            return pd.DataFrame()

        importance = self.meta_model.feature_importance(importance_type="gain")
        feature_names = self.meta_model.feature_name()

        df = pd.DataFrame({"feature": feature_names, "importance": importance}).sort_values(
            "importance", ascending=False
        )

        return df


def create_stacking_ensemble_from_strategies(df: pd.DataFrame, strategies: List) -> StackingEnsemble:
    """
    戦略クラスからスタッキングアンサンブルを作成

    Args:
        df: 株価データフレーム
        strategies: 戦略クラスのリスト

    Returns:
        StackingEnsembleインスタンス
    """
    from src.features import add_advanced_features

    # 特徴量を生成
    add_advanced_features(df.copy())

    # スタッキングアンサンブルを初期化
    ensemble = StackingEnsemble()

    # 各戦略をLevel 1モデルとして追加
    for strategy in strategies:
        try:
            # 戦略からシグナルを生成
            signals = strategy.generate_signals(df)

            # シグナルをモデルとして扱う（簡易版）
            # 実際には各戦略の内部モデルを直接使用する方が良い
            class StrategyWrapper:
                def __init__(self, signals):
                    self.signals = signals

                def predict_proba(self, X):
                    # シグナルを確率に変換
                    # 1 (BUY) -> 0.7, -1 (SELL) -> 0.3, 0 (HOLD) -> 0.5
                    proba = np.where(self.signals == 1, 0.7, np.where(self.signals == -1, 0.3, 0.5))
                    return proba

            wrapper = StrategyWrapper(signals)
            ensemble.add_base_model(wrapper, strategy.name)

        except Exception as e:
            logger.error(f"Error adding strategy {strategy.name}: {e}")

    return ensemble


if __name__ == "__main__":
    print("Stacking Ensemble Module - Phase 29-2")
    print("=" * 50)
    print("このモジュールは以下を実装します:")
    print("1. Level 1: 複数の基本モデル（LightGBM, LSTM, Transformer, GRU）")
    print("2. Level 2: XGBoost/LightGBM メタラーナー")
    print("3. Out-of-Fold予測による過学習防止")
    print("4. 時系列クロスバリデーション")
