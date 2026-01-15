"""
時系列クロスバリデーション

時系列データの特性を考慮したクロスバリデーション機能を提供します。
- TimeSeriesSplit
- Walk-forward validation
"""

import logging
from typing import Dict, Generator, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

logger = logging.getLogger(__name__)


class TimeSeriesCV:
    """
    時系列クロスバリデーションクラス
    """

    def __init__(self, n_splits: int = 5, gap: int = 0):
        """
        Args:
            n_splits: 分割数
            gap: TrainとTestの間のギャップ（リーク防止）
        """
        self.n_splits = n_splits
        self.gap = gap
        self.tscv = TimeSeriesSplit(n_splits=n_splits, gap=gap)

    def split(
        self, X: pd.DataFrame, y: Optional[pd.Series] = None
    ) -> Generator[Tuple[np.ndarray, np.ndarray], None, None]:
        """
        データを分割してインデックスを返すジェネレータ

        Args:
            X: 特徴量データ
            y: ターゲットデータ（オプション）

        Yields:
            (train_indices, test_indices)
        """
        return self.tscv.split(X, y)

    def evaluate_model(self, model, X: pd.DataFrame, y: pd.Series, metric_func: callable) -> Dict[str, float]:
        """
        モデルをクロスバリデーションで評価

        Args:
            model: scikit-learn互換のモデル（fit/predictを持つ）
            X: 特徴量
            y: ターゲット
            metric_func: 評価関数 (y_true, y_pred) -> score

        Returns:
            スコアの統計情報（平均、標準偏差）
        """
        scores = []

        for fold, (train_idx, test_idx) in enumerate(self.split(X, y)):
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

            # モデル学習
            model.fit(X_train, y_train)

            # 予測
            preds = model.predict(X_test)

            # 評価
            score = metric_func(y_test, preds)
            scores.append(score)

            logger.info(f"Fold {fold + 1}: Score = {score:.4f}")

        return {
            "mean_score": np.mean(scores),
            "std_score": np.std(scores),
            "min_score": np.min(scores),
            "max_score": np.max(scores),
            "scores": scores,
        }


def walk_forward_validation(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    train_window: int,
    test_window: int,
    step: int,
    metric_func: callable,
) -> Dict[str, float]:
    """
    ウォークフォワードバリデーション（ローリングウィンドウ）

    Args:
        model: モデル
        X: 特徴量
        y: ターゲット
        train_window: 学習期間の長さ
        test_window: テスト期間の長さ
        step: スライド幅
        metric_func: 評価関数

    Returns:
        スコア統計
    """
    n_samples = len(X)
    scores = []

    # 開始インデックス
    start_idx = 0

    while start_idx + train_window + test_window <= n_samples:
        # インデックス計算
        train_end = start_idx + train_window
        test_end = train_end + test_window

        # データ分割
        X_train = X.iloc[start_idx:train_end]
        y_train = y.iloc[start_idx:train_end]
        X_test = X.iloc[train_end:test_end]
        y_test = y.iloc[train_end:test_end]

        # 学習・予測・評価
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        score = metric_func(y_test, preds)
        scores.append(score)

        # 次のステップへ
        start_idx += step

    if not scores:
        return {"mean_score": 0.0}

    return {
        "mean_score": np.mean(scores),
        "std_score": np.std(scores),
        "scores": scores,
    }
