"""
Advanced Features V2 - 高度特徴量エンジニアリング
Wavelet変換、FFT、セクター相関などの高度な特徴量を追加
"""

import logging
from typing import List

import numpy as np
import pandas as pd
import pywt

logger = logging.getLogger(__name__)


class AdvancedFeaturesV2:
    """高度特徴量エンジニアリング V2"""

    def __init__(self):
        pass

    def add_wavelet_features(
        self,
        df: pd.DataFrame,
        column: str = "Close",
        wavelet: str = "db4",
        level: int = 2,
    ) -> pd.DataFrame:
        """
        Wavelet変換によるノイズ除去とトレンド抽出

        Args:
            df: データフレーム
            column: 対象カラム
            wavelet: Waveletの種類 (db4, sym4, haarなど)
            level: 分解レベル

        Returns:
            特徴量追加後のデータフレーム
        """
        try:
            data = df[column].values

            # データの長さが偶数である必要があるため、調整
            if len(data) % 2 != 0:
                data = data[:-1]

            coeffs = pywt.wavedec(data, wavelet, mode="per", level=level)

            # 近似係数（トレンド）
            # データ長を元の長さに合わせるための補間などは簡易的に省略し、
            # トレンド成分を再構成して特徴量とする

            # レベルごとの詳細係数を0にして再構成（デノイズ）
            coeffs_denoised = list(coeffs)
            for i in range(1, len(coeffs)):
                coeffs_denoised[i] = np.zeros_like(coeffs[i])

            denoised = pywt.waverec(coeffs_denoised, wavelet, mode="per")

            # 長さが異なる場合の調整
            if len(denoised) > len(df):
                denoised = denoised[: len(df)]
            elif len(denoised) < len(df):
                denoised = np.pad(denoised, (0, len(df) - len(denoised)), mode="edge")

            df[f"{column}_Wavelet_Trend"] = denoised
            df[f"{column}_Wavelet_Diff"] = df[column] - denoised

            return df

        except Exception as e:
            logger.error(f"Wavelet feature error: {e}")
            return df

    def add_fft_features(self, df: pd.DataFrame, column: str = "Close", window: int = 30) -> pd.DataFrame:
        """
        FFTによる周期性抽出（ローリングウィンドウ）

        Args:
            df: データフレーム
            column: 対象カラム
            window: ウィンドウサイズ

        Returns:
            特徴量追加後のデータフレーム
        """
        try:
            # 支配的な周期成分の振幅と位相を抽出

            def get_fft_stats(x):
                fft_vals = np.fft.fft(x)
                fft_freq = np.fft.fftfreq(len(x))

                # 正の周波数のみ
                pos_mask = fft_freq > 0
                fft_vals = fft_vals[pos_mask]
                fft_freq = fft_freq[pos_mask]

                if len(fft_vals) == 0:
                    return 0, 0

                # 最大振幅のインデックス
                idx = np.argmax(np.abs(fft_vals))

                max_amp = np.abs(fft_vals[idx])
                # dominant_period = 1 / fft_freq[idx]

                return max_amp

            # ローリング適用 (計算コスト削減のため、ステップを大きくするか、重要なポイントのみ計算も検討)
            # ここではシンプルにローリング適用

            df[f"{column}_FFT_Amp"] = df[column].rolling(window=window).apply(get_fft_stats, raw=True)

            return df

        except Exception as e:
            logger.error(f"FFT feature error: {e}")
            return df

    def add_sector_correlation(self, df: pd.DataFrame, ticker: str, sector_tickers: List[str] = None) -> pd.DataFrame:
        """
        セクター相関特徴量（実装予定）
        今回はプレースホルダーとして、市場全体（日経平均など）との相関を追加することを想定

        Args:
            df: データフレーム
            ticker: 対象銘柄
            sector_tickers: 同セクターの銘柄リスト

        Returns:
            データフレーム
        """
        # 外部データ連携が必要なため、今回はスキップまたは簡易実装
        return df

    def apply_all(self, df: pd.DataFrame) -> pd.DataFrame:
        """全高度特徴量を適用"""
        if df.empty:
            return df

        df = self.add_wavelet_features(df)
        df = self.add_fft_features(df)

        return df


# シングルトン
_features_v2 = None


def get_advanced_features_v2() -> AdvancedFeaturesV2:
    global _features_v2
    if _features_v2 is None:
        _features_v2 = AdvancedFeaturesV2()
    return _features_v2
