"""
Data Augmentation - データ拡張
合成データで訓練データを増強
"""

import logging
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DataAugmenter:
    """時系列データ拡張"""

    def __init__(self, noise_level: float = 0.02):
        self.noise_level = noise_level

    def add_noise(self, df: pd.DataFrame, n_copies: int = 2) -> pd.DataFrame:
        """
        ノイズを加えてデータを増強

        Args:
            df: 元データ
            n_copies: 生成するコピー数

        Returns:
            増強されたデータ
        """
        augmented = [df.copy()]

        price_cols = ["Open", "High", "Low", "Close"]
        existing_cols = [c for c in price_cols if c in df.columns]

        for i in range(n_copies):
            copy_df = df.copy()

            for col in existing_cols:
                noise = np.random.normal(0, self.noise_level, len(df))
                copy_df[col] = copy_df[col] * (1 + noise)

            # 出来高も少し変動
            if "Volume" in copy_df.columns:
                vol_noise = np.random.normal(0, self.noise_level * 2, len(df))
                copy_df["Volume"] = copy_df["Volume"] * (1 + vol_noise)
                copy_df["Volume"] = copy_df["Volume"].clip(lower=0)

            augmented.append(copy_df)

        result = pd.concat(augmented, ignore_index=True)
        logger.info(f"Augmented data: {len(df)} -> {len(result)} rows")
        return result

    def time_warp(self, df: pd.DataFrame, factor: float = 0.1) -> pd.DataFrame:
        """
        時間方向の伸縮

        Args:
            df: 元データ
            factor: 伸縮の強さ

        Returns:
            時間ワープされたデータ
        """
        n = len(df)
        if n < 10:
            return df

        # ランダムな伸縮点
        warp_point = np.random.randint(n // 4, 3 * n // 4)
        warp_amount = 1 + np.random.uniform(-factor, factor)

        # 前半と後半で伸縮
        new_indices = np.concatenate(
            [
                np.linspace(0, warp_point, int(warp_point * warp_amount)),
                np.linspace(warp_point, n - 1, int((n - warp_point) / warp_amount)),
            ]
        )

        new_indices = np.clip(new_indices.astype(int), 0, n - 1)
        new_indices = np.unique(new_indices)

        return df.iloc[new_indices].reset_index(drop=True)

    def generate_synthetic_sample(self, df: pd.DataFrame, n_samples: int = 100) -> pd.DataFrame:
        """
        統計的特性を保持した合成データを生成

        Args:
            df: 元データ
            n_samples: 生成するサンプル数

        Returns:
            合成データ
        """
        if "Close" not in df.columns:
            return df

        # 元データのリターン統計
        returns = df["Close"].pct_change().dropna()
        mean_return = returns.mean()
        std_return = returns.std()

        # 合成リターンを生成
        synthetic_returns = np.random.normal(mean_return, std_return, n_samples)

        # 価格系列を生成
        start_price = df["Close"].iloc[-1]
        synthetic_prices = [start_price]

        for ret in synthetic_returns:
            synthetic_prices.append(synthetic_prices[-1] * (1 + ret))

        synthetic_df = pd.DataFrame(
            {
                "Close": synthetic_prices[1:],
                "Open": np.array(synthetic_prices[1:]) * np.random.uniform(0.99, 1.01, n_samples),
                "High": np.array(synthetic_prices[1:]) * np.random.uniform(1.0, 1.02, n_samples),
                "Low": np.array(synthetic_prices[1:]) * np.random.uniform(0.98, 1.0, n_samples),
                "Volume": (
                    np.random.randint(
                        int(df["Volume"].mean() * 0.5),
                        int(df["Volume"].mean() * 1.5),
                        n_samples,
                    )
                    if "Volume" in df.columns
                    else np.zeros(n_samples)
                ),
            }
        )

        return synthetic_df

    def augment_for_training(
        self, X: np.ndarray, y: np.ndarray, augment_factor: int = 2
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        訓練データを増強

        Args:
            X: 特徴量
            y: ターゲット
            augment_factor: 増強倍率

        Returns:
            (増強されたX, 増強されたy)
        """
        X_aug = [X]
        y_aug = [y]

        for _ in range(augment_factor - 1):
            # ノイズ追加
            noise = np.random.normal(0, self.noise_level, X.shape)
            X_noisy = X + noise
            X_aug.append(X_noisy)
            y_aug.append(y)

        return np.concatenate(X_aug), np.concatenate(y_aug)


# シングルトン
_augmenter = None


def get_augmenter() -> DataAugmenter:
    global _augmenter
    if _augmenter is None:
        _augmenter = DataAugmenter(noise_level=0.02)
    return _augmenter
