"""
LightGBM/RandomForest/Linear のブレンディング + ウォークフォワード学習器。
シンプルなAPIで再学習とドリフト検知を組み合わせる。
"""

import logging
from typing import Dict, Iterable, Optional, Tuple

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit

from src.drift_monitor import DriftMonitor
from src.data_quality import compute_quality_score
from src.features.enhanced_features import generate_enhanced_features

logger = logging.getLogger(__name__)


class WalkForwardBlender:
    """
    - ベースモデル: LightGBM, RandomForest, Linear
    - メタモデル: LinearRegression
    - TimeSeriesSplit でスタッキング重みを学習
    - DriftMonitor で特徴分布の変化を検知し再学習判定
    """

    def __init__(self, n_splits: int = 4, horizon: int = 1, random_state: int = 42) -> None:
        self.n_splits = n_splits
        self.horizon = horizon
        self.meta_model = LinearRegression()
        self.base_models: Dict[str, object] = {}
        self.quantile_models: Dict[str, object] = {}
        self.feature_cols: Iterable[str] = []
        self.metrics: Dict[str, float] = {}
        self.drift_monitor = DriftMonitor()
        self.random_state = random_state
        self.quality_report = None

    def _prepare_xy(
        self,
        df: pd.DataFrame,
        target_col: str = "Close",
        external_features: Optional[Dict] = None,
        label_smoothing: float = 0.0,
    ) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        feats = generate_enhanced_features(df.copy(), external_features=external_features)
        feats = feats.sort_index()
        feats["target"] = feats[target_col].shift(-self.horizon)
        feats = feats.dropna()
        numeric_cols = feats.select_dtypes(include=[np.number]).columns.tolist()
        feature_cols = [c for c in numeric_cols if c not in {"target"}]
        X = feats[feature_cols].values
        y = feats["target"].values
        if label_smoothing > 0:
            y_mean = float(np.mean(y))
            y = (1 - label_smoothing) * y + label_smoothing * y_mean
        self.feature_cols = feature_cols
        return X, y, feats

    def _fit_base_models(self, X: np.ndarray, y: np.ndarray) -> Dict[str, object]:
        models: Dict[str, object] = {
            "lgbm": lgb.LGBMRegressor(
                num_leaves=31, learning_rate=0.05, n_estimators=200, random_state=self.random_state
            ),
            "rf": RandomForestRegressor(n_estimators=200, max_depth=8, random_state=self.random_state, n_jobs=-1),
            "lin": LinearRegression(),
        }
        try:
            import xgboost as xgb  # type: ignore

            models["xgb"] = xgb.XGBRegressor(
                n_estimators=300,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.8,
                random_state=self.random_state,
            )
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        for name, model in models.items():
            model.fit(X, y)
        return models

    def _fit_quantile_models(self, X: np.ndarray, y: np.ndarray) -> Dict[str, object]:
        models: Dict[str, object] = {}
        try:
            models["p20"] = lgb.LGBMRegressor(
                objective="quantile", alpha=0.2, learning_rate=0.05, n_estimators=200, random_state=self.random_state
            )
            models["p80"] = lgb.LGBMRegressor(
                objective="quantile", alpha=0.8, learning_rate=0.05, n_estimators=200, random_state=self.random_state
            )
            for m in models.values():
                m.fit(X, y)
        except Exception as exc:
            logger.debug("Quantile model training skipped: %s", exc)
        return models

    def fit(
        self,
        df: pd.DataFrame,
        target_col: str = "Close",
        external_features: Optional[Dict] = None,
        label_smoothing: float = 0.05,
    ) -> Dict[str, float]:
        X, y, feats = self._prepare_xy(
            df, target_col=target_col, external_features=external_features, label_smoothing=label_smoothing
        )

        # データ品質チェック
        self.quality_report = compute_quality_score(feats)
        if self.quality_report.score < 0.55:
            raise ValueError(f"Data quality too low (score={self.quality_report.score:.2f})")
        if len(y) < self.n_splits + 5:
            raise ValueError("Insufficient rows for walk-forward blending.")

        tscv = TimeSeriesSplit(n_splits=self.n_splits)
        meta_X = []
        meta_y = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            base_models = self._fit_base_models(X_train, y_train)
            val_preds = np.column_stack([m.predict(X_val) for m in base_models.values()])
            meta_X.append(val_preds)
            meta_y.append(y_val)

        meta_X_arr = np.vstack(meta_X)
        meta_y_arr = np.concatenate(meta_y)
        self.meta_model.fit(meta_X_arr, meta_y_arr)

        # 最終モデルを全データで学習して保持
        self.base_models = self._fit_base_models(X, y)
        self.quantile_models = self._fit_quantile_models(X, y)
        self.drift_monitor.set_reference(feats[self.feature_cols])

        # 簡易スコア
        blended_val = self.meta_model.predict(meta_X_arr)
        rmse = float(np.sqrt(mean_squared_error(meta_y_arr, blended_val)))
        mae = float(mean_absolute_error(meta_y_arr, blended_val))
        self.metrics = {"rmse": rmse, "mae": mae, "quality": self.quality_report.score}
        logger.info("WalkForwardBlender trained: RMSE=%.4f, MAE=%.4f", rmse, mae)
        return self.metrics

    def predict(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> np.ndarray:
        if not self.base_models:
            raise ValueError("Model not trained. Call fit() first.")
        feats = generate_enhanced_features(df.copy(), external_features=external_features)
        feats = feats.sort_index()
        feats = feats[self.feature_cols].fillna(method="ffill").fillna(method="bfill")
        base_preds = np.column_stack([model.predict(feats.values) for model in self.base_models.values()])
        return self.meta_model.predict(base_preds)

    def predict_interval(
        self, df: pd.DataFrame, external_features: Optional[Dict] = None, alpha: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """下限・中央値・上限を返す。quantileモデルがなければ簡易幅で代替。"""
        median = self.predict(df, external_features=external_features)
        if self.quantile_models:
            feats = generate_enhanced_features(df.copy(), external_features=external_features)
            feats = feats.sort_index()
            feats = feats[self.feature_cols].fillna(method="ffill").fillna(method="bfill")
            lower = self.quantile_models.get("p20").predict(feats.values) if self.quantile_models.get("p20") else median
            upper = self.quantile_models.get("p80").predict(feats.values) if self.quantile_models.get("p80") else median
            return lower, median, upper

        std_est = np.std(median) if len(median) > 1 else 0.0
        delta = 1.28 * std_est  # ~80% CI
        return median - delta, median, median + delta

    def needs_retrain(self, df: pd.DataFrame, external_features: Optional[Dict] = None) -> Tuple[bool, Dict]:
        """ドリフト監視に基づく再学習判定を返す。"""
        if not self.base_models:
            return True, {"reason": "untrained"}
        feats = generate_enhanced_features(df.copy(), external_features=external_features)
        feats = feats.sort_index()
        aligned = feats[self.feature_cols] if self.feature_cols else feats.select_dtypes(include=[np.number])
        result = self.drift_monitor.check(aligned)
        return result.drift_detected, result.details
