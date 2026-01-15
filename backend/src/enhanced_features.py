"""
Enhanced Feature Engineering for Better Predictions
高度な特徴量エンジニアリングによる予測精度改善
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class EnhancedFeatureEngineer:
    """高度な特徴量エンジニアリング"""

    def __init__(self):
        self.feature_names = []

    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """すべての特徴量を生成"""
        df = df.copy()

        # 基本的な価格特徴量
        df = self._price_features(df)

        # 高度なテクニカル指標
        df = self._technical_indicators(df)

        # ボラティリティ特徴量
        df = self._volatility_features(df)

        # モメンタム特徴量
        df = self._momentum_features(df)

        # マクロ経済特徴量（簡易版）
        df = self._macro_features(df)

        # 時間特徴量
        df = self._time_features(df)

        # NaNを処理
        df = self._handle_missing_values(df)

        logger.info(f"特徴量エンジニアリング完了: {len(df.columns)} 特徴量")
        return df

    def _price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """価格関連特徴量"""
        # 基本的な移動平均
        for period in [5, 10, 20, 50, 200]:
            df[f"SMA_{period}"] = df["Close"].rolling(period).mean()
            df[f"Price_to_SMA_{period}"] = df["Close"] / df[f"SMA_{period}"]

        # 加重移動平均
        for period in [10, 20]:
            df[f"EMA_{period}"] = df["Close"].ewm(span=period).mean()
            df[f"Price_to_EMA_{period}"] = df["Close"] / df[f"EMA_{period}"]

        # 価格変化
        df["Price_Change_1d"] = df["Close"].pct_change(1)
        df["Price_Change_3d"] = df["Close"].pct_change(3)
        df["Price_Change_5d"] = df["Close"].pct_change(5)
        df["Price_Change_10d"] = df["Close"].pct_change(10)

        # 高値・安値からの乖離
        df["High_Low_Range"] = (df["High"] - df["Low"]) / df["Close"]
        df["Close_to_High"] = df["Close"] / df["High"].rolling(20).max()
        df["Close_to_Low"] = df["Close"] / df["Low"].rolling(20).min()

        return df

    def _technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """テクニカル指標"""
        # RSI
        for period in [14, 21]:
            df[f"RSI_{period}"] = self._calculate_rsi(df["Close"], period)

        # MACD
        macd_line, signal_line, histogram = self._calculate_macd(df["Close"])
        df["MACD_Line"] = macd_line
        df["MACD_Signal"] = signal_line
        df["MACD_Histogram"] = histogram

        # ボリンジャーバンド
        bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(df["Close"])
        df["BB_Upper"] = bb_upper
        df["BB_Middle"] = bb_middle
        df["BB_Lower"] = bb_lower
        df["BB_Width"] = (bb_upper - bb_lower) / bb_middle
        df["BB_Position"] = (df["Close"] - bb_lower) / (bb_upper - bb_lower)

        # ストキャスティクス
        stoch_k, stoch_d = self._calculate_stochastic(df)
        df["Stoch_K"] = stoch_k
        df["Stoch_D"] = stoch_d

        # Williams %R
        df["Williams_R"] = self._calculate_williams_r(df)

        # CCI
        df["CCI"] = self._calculate_cci(df)

        # ADX
        df["ADX"] = self._calculate_adx(df)

        return df

    def _volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """ボラティリティ特徴量"""
        # 標準偏差
        for period in [5, 10, 20]:
            df[f"StdDev_{period}"] = df["Close"].rolling(period).std()
            df[f"CV_{period}"] = df[f"StdDev_{period}"] / df["Close"].rolling(period).mean()

        # ATR (Average True Range)
        df["ATR"] = self._calculate_atr(df)
        df["ATR_Ratio"] = df["ATR"] / df["Close"]

        # ボラティリティ比
        df["Volatility_Ratio"] = df["StdDev_10"] / df["StdDev_20"]

        return df

    def _momentum_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """モメンタム特徴量"""
        # モメンタム
        for period in [1, 3, 5, 10, 20]:
            df[f"Momentum_{period}d"] = df["Close"].pct_change(period)

        # ROC (Rate of Change)
        for period in [5, 10, 20]:
            df[f"ROC_{period}d"] = ((df["Close"] - df["Close"].shift(period)) / df["Close"].shift(period)) * 100

        # 加速度
        df["Acceleration_5d"] = df["Price_Change_5d"] - df["Price_Change_5d"].shift(1)

        return df

    def _macro_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """マクロ経済特徴量（簡易版）"""
        # 市場全体の動き（実際は市場インデックスを使用）
        df["Market_Momentum"] = df["Volume"].rolling(5).mean() / df["Volume"].rolling(20).mean()

        # 相対強度（実際は他銘柄との比較）
        df["Relative_Strength"] = df["Price_Change_5d"]

        return df

    def _time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """時間特徴量"""
        if df.index.name == "Date" or isinstance(df.index, pd.DatetimeIndex):
            df["Day_of_Week"] = df.index.dayofweek
            df["Day_of_Month"] = df.index.day
            df["Month"] = df.index.month
            df["Quarter"] = df.index.quarter
            df["Week_of_Year"] = df.index.isocalendar().week

            # サインコサイン特徴量（周期性）
            df["Day_Sin"] = np.sin(2 * np.pi * df.index.dayofweek / 7)
            df["Day_Cos"] = np.cos(2 * np.pi * df.index.dayofweek / 7)
            df["Month_Sin"] = np.sin(2 * np.pi * df.index.month / 12)
            df["Month_Cos"] = np.cos(2 * np.pi * df.index.month / 12)

        return df

    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """RSI計算"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _calculate_macd(
        self, prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD計算"""
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    def _calculate_bollinger_bands(
        self, prices: pd.Series, period: int = 20, std_dev: int = 2
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """ボリンジャーバンド計算"""
        sma = prices.rolling(period).mean()
        std = prices.rolling(period).std()
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        return upper_band, sma, lower_band

    def _calculate_stochastic(
        self, df: pd.DataFrame, k_period: int = 14, d_period: int = 3
    ) -> Tuple[pd.Series, pd.Series]:
        """ストキャスティクス計算"""
        lowest_low = df["Low"].rolling(k_period).min()
        highest_high = df["High"].rolling(k_period).max()
        k_percent = 100 * ((df["Close"] - lowest_low) / (highest_high - lowest_low))
        d_percent = k_percent.rolling(d_period).mean()
        return k_percent, d_percent

    def _calculate_williams_r(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Williams %R計算"""
        highest_high = df["High"].rolling(period).max()
        lowest_low = df["Low"].rolling(period).min()
        williams_r = -100 * ((highest_high - df["Close"]) / (highest_high - lowest_low))
        return williams_r

    def _calculate_cci(self, df: pd.DataFrame, period: int = 20) -> pd.Series:
        """CCI計算"""
        tp = (df["High"] + df["Low"] + df["Close"]) / 3
        sma = tp.rolling(period).mean()
        mad = tp.rolling(period).apply(lambda x: np.abs(x - x.mean()).mean())
        cci = (tp - sma) / (0.015 * mad)
        return cci

    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """ATR計算"""
        high_low = df["High"] - df["Low"]
        high_close = np.abs(df["High"] - df["Close"].shift())
        low_close = np.abs(df["Low"] - df["Close"].shift())
        true_range = np.maximum(high_low, np.maximum(high_close, low_close))
        atr = true_range.rolling(period).mean()
        return atr

    def _calculate_adx(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """ADX計算（簡易版）"""
        high_diff = df["High"].diff()
        low_diff = -df["Low"].diff()

        plus_dm = np.where((high_diff > low_diff) & (high_diff > 0), high_diff, 0)
        minus_dm = np.where((low_diff > high_diff) & (low_diff > 0), low_diff, 0)

        plus_dm = pd.Series(plus_dm).rolling(period).sum()
        minus_dm = pd.Series(minus_dm).rolling(period).sum()

        tr = self._calculate_atr(df, period)
        plus_di = 100 * plus_dm / tr
        minus_di = 100 * minus_dm / tr

        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(period).mean()

        return adx

    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """欠損値処理"""
        # 前方埋めと後方埋め
        df = df.fillna(method="ffill").fillna(method="bfill")

        # まだNaNがある場合は0で埋める
        df = df.fillna(0)

        return df

    def get_feature_names(self) -> List[str]:
        """特徴量名のリストを取得"""
        return self.feature_names


if __name__ == "__main__":
    # テスト
    import yfinance as yf

    # データ取得
    ticker = "7203.T"
    stock = yf.Ticker(ticker)
    df = stock.history(period="1y")

    if not df.empty:
        print(f"元データ: {len(df)} 行")
        print(f"元カラム: {list(df.columns)}")

        # 特徴量エンジニアリング
        engineer = EnhancedFeatureEngineer()
        df_features = engineer.create_features(df)

        print(f"\n特徴量エンジニアリング後: {len(df_features)} 行")
        print(f"特徴量数: {len(df_features.columns)}")
        print(f"新しい特徴量: {list(set(df_features.columns) - set(df.columns))}")

        # サンプル表示
        print(f"\n最新5行の主要特徴量:")
        key_features = [
            "Close",
            "RSI_14",
            "MACD_Line",
            "BB_Position",
            "ATR_Ratio",
            "Momentum_5d",
        ]
        print(df_features[key_features].tail())
    else:
        print("データ取得失敗")
