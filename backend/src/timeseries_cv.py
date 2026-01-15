"""
Time Series Cross-Validation - 時系列専用CV
株価データの時系列特性を考慮したクロスバリデーション
"""

import logging
from typing import Dict, Generator, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class TimeSeriesCV:
    """時系列クロスバリデーション"""

    def __init__(self, n_splits: int = 5, gap: int = 5):
        """
        Args:
            n_splits: 分割数
            gap: 訓練とテストの間のギャップ（日数）
        """
        self.n_splits = n_splits
        self.gap = gap

    def split(self, X: pd.DataFrame, y: pd.Series = None) -> Generator[Tuple, None, None]:
        """
        時系列データを分割

        Yields:
            (train_index, test_index) のタプル
        """
        n_samples = len(X)

        # 最小テストサイズ
        min_test_size = max(20, n_samples // (self.n_splits + 1))

        # 最小訓練サイズ
        min_train_size = max(50, n_samples // 2)

        for i in range(self.n_splits):
            # テスト開始位置
            test_start = min_train_size + i * min_test_size + self.gap
            test_end = test_start + min_test_size

            if test_end > n_samples:
                break

            train_end = test_start - self.gap

            train_idx = np.arange(0, train_end)
            test_idx = np.arange(test_start, min(test_end, n_samples))

            yield train_idx, test_idx

    def get_n_splits(self) -> int:
        return self.n_splits


class WalkForwardOptimizer:
    """ウォークフォワード最適化"""

    def __init__(self, train_size: int = 252, test_size: int = 21, step: int = 21):
        """
        Args:
            train_size: 訓練期間（日数）
            test_size: テスト期間（日数）
            step: ステップサイズ（日数）
        """
        self.train_size = train_size
        self.test_size = test_size
        self.step = step

    def split(self, X: pd.DataFrame) -> Generator[Tuple, None, None]:
        """
        ウォークフォワード分割

        Yields:
            (train_index, test_index) のタプル
        """
        n_samples = len(X)

        start = 0
        while start + self.train_size + self.test_size <= n_samples:
            train_start = start
            train_end = start + self.train_size
            test_start = train_end
            test_end = train_end + self.test_size

            train_idx = np.arange(train_start, train_end)
            test_idx = np.arange(test_start, test_end)

            yield train_idx, test_idx

            start += self.step


def evaluate_with_cv(model_factory, X: pd.DataFrame, y: pd.Series, cv=None, metric: str = "accuracy") -> Dict:
    """
    クロスバリデーションでモデルを評価

    Args:
        model_factory: モデル生成関数
        X: 特徴量
        y: ターゲット
        cv: CVオブジェクト
        metric: 評価指標

    Returns:
        評価結果
    """
    if cv is None:
        cv = TimeSeriesCV(n_splits=5, gap=5)

    scores = []

    for fold, (train_idx, test_idx) in enumerate(cv.split(X)):
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        try:
            model = model_factory()
            model.fit(X_train, y_train)

            if metric == "accuracy":
                from sklearn.metrics import accuracy_score

                y_pred = model.predict(X_test)
                score = accuracy_score(y_test, y_pred)
            elif metric == "mae":
                from sklearn.metrics import mean_absolute_error

                y_pred = model.predict(X_test)
                score = -mean_absolute_error(y_test, y_pred)  # 負にして大きいほど良く
            else:
                y_pred = model.predict(X_test)
                score = (y_pred == y_test).mean()

            scores.append(score)
            logger.debug(f"Fold {fold + 1}: {score:.4f}")

        except Exception as e:
            logger.warning(f"CV fold {fold} error: {e}")

    if not scores:
        return {"mean": 0, "std": 0, "scores": []}

    return {
        "mean": np.mean(scores),
        "std": np.std(scores),
        "scores": scores,
        "n_folds": len(scores),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # テスト
    X = pd.DataFrame(np.random.randn(500, 10))
    y = pd.Series(np.random.randint(0, 2, 500))

    cv = TimeSeriesCV(n_splits=5, gap=5)

    for i, (train_idx, test_idx) in enumerate(cv.split(X)):
        print(f"Fold {i + 1}: Train {len(train_idx)}, Test {len(test_idx)}")
