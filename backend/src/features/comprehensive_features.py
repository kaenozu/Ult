"""
Comprehensive Feature Generator
Generates 50+ advanced features for maximum prediction accuracy.
"""

import logging
from typing import Dict, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ComprehensiveFeatureGenerator:
    """
    Generates comprehensive feature set including:
        pass
    - Market microstructure features
    - Advanced technical indicators
    - Cross-asset features
    - Statistical features
    - Time-based features
    """

    def __init__(self):
        self.feature_names = []

    def generate_all_features(
        self, df: pd.DataFrame, external_data: Optional[Dict[str, pd.DataFrame]] = None
    ) -> pd.DataFrame:
        """
        Generate all features.

        Args:
            df: Price data with OHLCV
            external_data: Optional external market data (VIX, indices, etc.)

        Returns:
            DataFrame with all features
        """
        df = df.copy()

        logger.info("Generating comprehensive feature set...")

        # 1. Basic price features
        df = self._add_price_features(df)

        # 2. Technical indicators
        df = self._add_technical_indicators(df)

        # 3. Volume features
        df = self._add_volume_features(df)

        # 4. Volatility features
        df = self._add_volatility_features(df)

        # 5. Momentum features
        df = self._add_momentum_features(df)

        # 6. Statistical features
        df = self._add_statistical_features(df)

        # 7. Time-based features
        df = self._add_time_features(df)

        # 8. Cross-asset features (if available)
        if external_data:
            df = self._add_cross_asset_features(df, external_data)

        # 9. Feature interactions
        df = self._add_feature_interactions(df)

        logger.info(f"Generated {len(df.columns)} features")

        return df

    def _add_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add basic price-based features."""
        # Returns
        df["returns_1d"] = df["Close"].pct_change()
        df["returns_5d"] = df["Close"].pct_change(5)
        df["returns_10d"] = df["Close"].pct_change(10)
        df["returns_20d"] = df["Close"].pct_change(20)

        # Log returns
        df["log_returns"] = np.log(df["Close"] / df["Close"].shift(1))

        # Price position in range
        df["price_position"] = (df["Close"] - df["Low"]) / (df["High"] - df["Low"] + 1e-10)

        # Gap
        df["gap"] = (df["Open"] - df["Close"].shift(1)) / df["Close"].shift(1)

        return df

    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add technical indicators."""
        # Moving averages
        for period in [5, 10, 20, 50, 200]:
            df[f"SMA_{period}"] = df["Close"].rolling(period).mean()
            df[f"EMA_{period}"] = df["Close"].ewm(span=period).mean()

        # Moving average crossovers
        df["SMA_5_20_cross"] = df["SMA_5"] - df["SMA_20"]
        df["SMA_20_50_cross"] = df["SMA_20"] - df["SMA_50"]

        # RSI
        df["RSI_14"] = self._calculate_rsi(df["Close"], 14)
        df["RSI_28"] = self._calculate_rsi(df["Close"], 28)

        # MACD
        ema_12 = df["Close"].ewm(span=12).mean()
        ema_26 = df["Close"].ewm(span=26).mean()
        df["MACD"] = ema_12 - ema_26
        df["MACD_signal"] = df["MACD"].ewm(span=9).mean()
        df["MACD_hist"] = df["MACD"] - df["MACD_signal"]

        # Bollinger Bands
        sma_20 = df["Close"].rolling(20).mean()
        std_20 = df["Close"].rolling(20).std()
        df["BB_upper"] = sma_20 + 2 * std_20
        df["BB_lower"] = sma_20 - 2 * std_20
        df["BB_width"] = (df["BB_upper"] - df["BB_lower"]) / sma_20
        df["BB_position"] = (df["Close"] - df["BB_lower"]) / (df["BB_upper"] - df["BB_lower"] + 1e-10)

        # Stochastic
        low_14 = df["Low"].rolling(14).min()
        high_14 = df["High"].rolling(14).max()
        df["Stoch_K"] = 100 * (df["Close"] - low_14) / (high_14 - low_14 + 1e-10)
        df["Stoch_D"] = df["Stoch_K"].rolling(3).mean()

        # ADX (simplified)
        df["ADX"] = self._calculate_adx(df, 14)

        return df

    def _add_volume_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volume-based features."""
        # Volume moving averages
        df["Volume_MA_5"] = df["Volume"].rolling(5).mean()
        df["Volume_MA_20"] = df["Volume"].rolling(20).mean()

        # Volume ratio
        df["Volume_ratio"] = df["Volume"] / (df["Volume_MA_20"] + 1e-10)

        # On-Balance Volume (OBV)
        df["OBV"] = (np.sign(df["Close"].diff()) * df["Volume"]).fillna(0).cumsum()

        # Volume-weighted average price (VWAP)
        df["VWAP"] = (df["Close"] * df["Volume"]).cumsum() / df["Volume"].cumsum()
        df["VWAP_deviation"] = (df["Close"] - df["VWAP"]) / (df["VWAP"] + 1e-10)

        # Money Flow Index (MFI)
        typical_price = (df["High"] + df["Low"] + df["Close"]) / 3
        money_flow = typical_price * df["Volume"]
        positive_flow = money_flow.where(typical_price > typical_price.shift(1), 0).rolling(14).sum()
        negative_flow = money_flow.where(typical_price < typical_price.shift(1), 0).rolling(14).sum()
        df["MFI"] = 100 - (100 / (1 + positive_flow / (negative_flow + 1e-10)))

        return df

    def _add_volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility features."""
        # Historical volatility
        df["volatility_5"] = df["returns_1d"].rolling(5).std()
        df["volatility_20"] = df["returns_1d"].rolling(20).std()
        df["volatility_60"] = df["returns_1d"].rolling(60).std()

        # ATR (Average True Range)
        high_low = df["High"] - df["Low"]
        high_close = np.abs(df["High"] - df["Close"].shift())
        low_close = np.abs(df["Low"] - df["Close"].shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df["ATR"] = true_range.rolling(14).mean()

        # Intraday range
        df["intraday_range"] = (df["High"] - df["Low"]) / df["Close"]

        return df

    def _add_momentum_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add momentum features."""
        # Rate of Change (ROC)
        for period in [5, 10, 20]:
            df[f"ROC_{period}"] = df["Close"].pct_change(period) * 100

        # Momentum
        df["momentum_5"] = df["Close"] - df["Close"].shift(5)
        df["momentum_10"] = df["Close"] - df["Close"].shift(10)

        # Williams %R
        high_14 = df["High"].rolling(14).max()
        low_14 = df["Low"].rolling(14).min()
        df["Williams_R"] = -100 * (high_14 - df["Close"]) / (high_14 - low_14 + 1e-10)

        return df

    def _add_statistical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add statistical features."""
        # Skewness and kurtosis
        df["skew_20"] = df["returns_1d"].rolling(20).skew()
        df["kurt_20"] = df["returns_1d"].rolling(20).kurt()

        # Z-score
        mean_20 = df["Close"].rolling(20).mean()
        std_20 = df["Close"].rolling(20).std()
        df["zscore"] = (df["Close"] - mean_20) / (std_20 + 1e-10)

        # Autocorrelation
        df["autocorr_5"] = df["returns_1d"].rolling(20).apply(lambda x: x.autocorr(lag=5) if len(x) >= 5 else 0)

        return df

    def _add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add time-based features."""
        if not isinstance(df.index, pd.DatetimeIndex):
            return df

        df["day_of_week"] = df.index.dayofweek
        df["day_of_month"] = df.index.day
        df["month"] = df.index.month
        df["quarter"] = df.index.quarter

        # Is month end
        df["is_month_end"] = df.index.is_month_end.astype(int)

        return df

    def _add_cross_asset_features(self, df: pd.DataFrame, external_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """Add cross-asset features."""
        # Convert index to timezone-naive for compatibility
        df_index = df.index.tz_localize(None) if df.index.tz is not None else df.index

        # VIX
        if "VIX" in external_data and not external_data["VIX"].empty:
            vix = external_data["VIX"]["Close"]
            vix_index = vix.index.tz_localize(None) if vix.index.tz is not None else vix.index
            vix.index = vix_index
            df["VIX"] = vix.reindex(df_index, method="ffill")
            df["VIX_change"] = df["VIX"].pct_change()

        # Market index (e.g., Nikkei, S&P500)
        if "NIKKEI" in external_data and not external_data["NIKKEI"].empty:
            nikkei = external_data["NIKKEI"]["Close"]
            nikkei_index = nikkei.index.tz_localize(None) if nikkei.index.tz is not None else nikkei.index
            nikkei.index = nikkei_index
            df["Market_returns"] = nikkei.pct_change().reindex(df_index, method="ffill")

        return df

    def _add_feature_interactions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add feature interaction terms."""
        # RSI * Volume ratio
        if "RSI_14" in df.columns and "Volume_ratio" in df.columns:
            df["RSI_Volume"] = df["RSI_14"] * df["Volume_ratio"]

        # MACD * Volatility
        if "MACD" in df.columns and "volatility_20" in df.columns:
            df["MACD_Vol"] = df["MACD"] * df["volatility_20"]

        return df

    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate RSI."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
        rs = gain / (loss + 1e-10)
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _calculate_adx(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate ADX (simplified)."""
        high_diff = df["High"].diff()
        low_diff = -df["Low"].diff()

        pos_dm = high_diff.where((high_diff > low_diff) & (high_diff > 0), 0)
        neg_dm = low_diff.where((low_diff > high_diff) & (low_diff > 0), 0)

        tr = pd.concat(
            [
                df["High"] - df["Low"],
                abs(df["High"] - df["Close"].shift()),
                abs(df["Low"] - df["Close"].shift()),
            ],
            axis=1,
        ).max(axis=1)

        atr = tr.rolling(period).mean()
        pos_di = 100 * (pos_dm.rolling(period).mean() / atr)
        neg_di = 100 * (neg_dm.rolling(period).mean() / atr)

        dx = 100 * abs(pos_di - neg_di) / (pos_di + neg_di + 1e-10)
        adx = dx.rolling(period).mean()

        return adx
