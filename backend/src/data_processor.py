"""データ前処理モジュール

このモジュールは、株価データの前処理（標準化、欠損値処理、技術指標の追加など）
を行うための機能を提供します。データの取得と前処理を分離し、
単一責任の原則を適用します。
"""

import logging
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """株価データの前処理を行うクラス"""

    def __init__(self):
        pass

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """データクリーニングを行う

        Args:
            df (pd.DataFrame): 前処理対象のDataFrame

        Returns:
            pd.DataFrame: クリーニング済みのDataFrame
        """
        df_clean = df.copy()

        # 欠損値の処理
        if "Close" in df_clean.columns:
            # Close価格を基準に前方埋めを実施
            df_clean["Close"] = df_clean["Close"].fillna(method="ffill")

            # Close価格があれば他の列も同様に前方埋め
            for col in df_clean.columns:
                if col != "Close":
                    df_clean[col] = df_clean[col].fillna(method="ffill")

        # 数値でない列を除外
        numeric_columns = df_clean.select_dtypes(include=[np.number]).columns
        df_clean = df_clean[numeric_columns]

        # NaNを完全に削除
        df_clean = df_clean.dropna()

        return df_clean

    def add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """テクニカル指標を追加

        Args:
            df (pd.DataFrame): 元のDataFrame

        Returns:
            pd.DataFrame: テクニカル指標を追加したDataFrame
        """
        df_with_indicators = df.copy()

        if "Close" not in df_with_indicators.columns:
            logger.warning("Cannot add technical indicators: 'Close' column not found")
            return df_with_indicators

        # 移動平均
        df_with_indicators["SMA_5"] = df_with_indicators["Close"].rolling(window=5).mean()
        df_with_indicators["SMA_20"] = df_with_indicators["Close"].rolling(window=20).mean()
        df_with_indicators["SMA_50"] = df_with_indicators["Close"].rolling(window=50).mean()

        # RSI
        delta = df_with_indicators["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df_with_indicators["RSI"] = 100 - (100 / (1 + rs))

        # ボリンジャーバンド
        rolling_mean = df_with_indicators["Close"].rolling(window=20).mean()
        rolling_std = df_with_indicators["Close"].rolling(window=20).std()
        df_with_indicators["BB_upper"] = rolling_mean + (rolling_std * 2)
        df_with_indicators["BB_lower"] = rolling_mean - (rolling_std * 2)
        df_with_indicators["BB_middle"] = rolling_mean

        # MACD
        exp1 = df_with_indicators["Close"].ewm(span=12).mean()
        exp2 = df_with_indicators["Close"].ewm(span=26).mean()
        df_with_indicators["MACD"] = exp1 - exp2
        df_with_indicators["MACD_signal"] = df_with_indicators["MACD"].ewm(span=9).mean()
        df_with_indicators["MACD_hist"] = df_with_indicators["MACD"] - df_with_indicators["MACD_signal"]

        return df_with_indicators

    def normalize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """データを正規化
        注：このメソッドは実験的機能です

        Args:
            df (pd.DataFrame): 元のDataFrame

        Returns:
            pd.DataFrame: 正規化されたDataFrame
        """
        df_normalized = df.copy()

        # 数値列のみ対象
        numeric_columns = df_normalized.select_dtypes(include=[np.number]).columns

        for col in numeric_columns:
            mean_val = df_normalized[col].mean()
            std_val = df_normalized[col].std()

            if std_val != 0:
                df_normalized[col] = (df_normalized[col] - mean_val) / std_val

        return df_normalized

    def preprocess(self, df: pd.DataFrame, add_indicators: bool = True, normalize: bool = False) -> pd.DataFrame:
        """データの前処理を一括して実行

        Args:
            df (pd.DataFrame): 前処理対象のDataFrame
            add_indicators (bool): テクニカル指標を追加するか
            normalize (bool): 正規化を行うか

        Returns:
            pd.DataFrame: 前処理済みのDataFrame
        """
        logger.info("Starting data preprocessing...")

        # データクリーニング
        df_processed = self.clean_data(df)

        # テクニカル指標追加
        if add_indicators:
            df_processed = self.add_technical_indicators(df_processed)

        # 正規化
        if normalize:
            df_processed = self.normalize_data(df_processed)

        logger.info(f"Data preprocessing completed. Shape: {df_processed.shape}")

        return df_processed


# 複数の銘柄データを前処理するクラス
class MultiTickerDataProcessor:
    """複数の銘柄データを一括して前処理するクラス"""

    def __init__(self):
        self.preprocessor = DataPreprocessor()

    def preprocess_multiple(
        self,
        data_dict: Dict[str, pd.DataFrame],
        add_indicators: bool = True,
        normalize: bool = False,
    ) -> Dict[str, pd.DataFrame]:
        """複数の銘柄データを前処理

        Args:
            data_dict (Dict[str, pd.DataFrame]): 銘柄名とDataFrameの辞書
            add_indicators (bool): テクニカル指標を追加するか
            normalize (bool): 正規化を行うか

        Returns:
            Dict[str, pd.DataFrame]: 前処理済みのDataFrameの辞書
        """
        processed_data = {}

        for ticker, df in data_dict.items():
            if df.empty:
                logger.warning(f"No data to process for {ticker}")
                processed_data[ticker] = df
                continue

            processed_df = self.preprocessor.preprocess(df, add_indicators=add_indicators, normalize=normalize)
            processed_data[ticker] = processed_df

        return processed_data
