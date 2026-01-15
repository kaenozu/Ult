"""
Advanced Feature Engineering
Implements market microstructure, alternative data, and cross-asset features.
"""

import logging
from typing import Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AdvancedFeatureEngine:
    """Advanced feature engineering for improved prediction accuracy."""

    def __init__(self):
        self.feature_importance = {}

    def add_market_microstructure_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add market microstructure features.

        Features:
            pass
        - VWAP (Volume Weighted Average Price)
        - VWAP deviation
        - Volume imbalance
        - Intraday volatility
        """
        df = df.copy()

        # VWAP
        df["VWAP"] = (df["Close"] * df["Volume"]).cumsum() / df["Volume"].cumsum()
        df["VWAP_deviation"] = (df["Close"] - df["VWAP"]) / df["VWAP"]

        # Volume imbalance (proxy: volume change rate)
        df["Volume_imbalance"] = df["Volume"].pct_change()

        # Intraday volatility (High-Low range)
        df["Intraday_volatility"] = (df["High"] - df["Low"]) / df["Close"]

        # Price momentum
        df["Price_momentum_5"] = df["Close"].pct_change(5)
        df["Price_momentum_10"] = df["Close"].pct_change(10)

        return df

    def add_alternative_data_features(
        self,
        df: pd.DataFrame,
        sentiment_scores: Optional[pd.Series] = None,
        social_mentions: Optional[pd.Series] = None,
    ) -> pd.DataFrame:
        """
        Add alternative data features.

        Args:
            df: Price data
            sentiment_scores: News sentiment scores (-1 to 1)
            social_mentions: Social media mention counts
        """
        df = df.copy()

        # Sentiment features
        if sentiment_scores is not None:
            df["Sentiment"] = sentiment_scores
            df["Sentiment_MA7"] = sentiment_scores.rolling(7).mean()
            df["Sentiment_change"] = sentiment_scores.diff()
        else:
            # Default neutral sentiment
            df["Sentiment"] = 0.0
            df["Sentiment_MA7"] = 0.0
            df["Sentiment_change"] = 0.0

        # Social media features
        if social_mentions is not None:
            df["Social_mentions"] = social_mentions
            df["Social_mentions_change"] = social_mentions.pct_change()
        else:
            df["Social_mentions"] = 0
            df["Social_mentions_change"] = 0.0

        return df

    def add_cross_asset_features(
        self,
        df: pd.DataFrame,
        sector_index: Optional[pd.DataFrame] = None,
        vix: Optional[pd.Series] = None,
        fx_rate: Optional[pd.Series] = None,
    ) -> pd.DataFrame:
        """
        Add cross-asset correlation features.

        Args:
            df: Stock price data
            sector_index: Sector index prices
            vix: VIX volatility index
            fx_rate: Currency exchange rate (e.g., USDJPY)
        """
        df = df.copy()

        # Sector correlation
        if sector_index is not None and "Close" in sector_index.columns:
            # Calculate rolling correlation
            df["Sector_correlation"] = df["Close"].rolling(20).corr(sector_index["Close"])
            df["Sector_beta"] = (
                df["Close"].pct_change().rolling(20).cov(sector_index["Close"].pct_change())
                / sector_index["Close"].pct_change().rolling(20).var()
            )
        else:
            df["Sector_correlation"] = 0.5  # Neutral
            df["Sector_beta"] = 1.0

        # VIX features
        if vix is not None:
            df["VIX"] = vix
            df["VIX_change"] = vix.pct_change()
            df["VIX_MA20"] = vix.rolling(20).mean()
        else:
            df["VIX"] = 20.0  # Average VIX
            df["VIX_change"] = 0.0
            df["VIX_MA20"] = 20.0

        # FX features (for international stocks)
        if fx_rate is not None:
            df["FX_rate"] = fx_rate
            df["FX_change"] = fx_rate.pct_change()
        else:
            df["FX_rate"] = 1.0
            df["FX_change"] = 0.0

        return df

    def add_advanced_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add advanced technical indicators.

        Indicators:
            pass
        - Ichimoku Cloud components
        - Fibonacci retracement levels
        - Market regime (trending/ranging)
        """
        df = df.copy()

        # Ichimoku Cloud (simplified)
        high_9 = df["High"].rolling(9).max()
        low_9 = df["Low"].rolling(9).min()
        df["Tenkan_sen"] = (high_9 + low_9) / 2  # Conversion line

        high_26 = df["High"].rolling(26).max()
        low_26 = df["Low"].rolling(26).min()
        df["Kijun_sen"] = (high_26 + low_26) / 2  # Base line

        df["Senkou_span_A"] = ((df["Tenkan_sen"] + df["Kijun_sen"]) / 2).shift(26)

        high_52 = df["High"].rolling(52).max()
        low_52 = df["Low"].rolling(52).min()
        df["Senkou_span_B"] = ((high_52 + low_52) / 2).shift(26)

        # Cloud thickness (support/resistance strength)
        df["Cloud_thickness"] = abs(df["Senkou_span_A"] - df["Senkou_span_B"])

        # Fibonacci retracement levels (from recent high/low)
        period = 20
        recent_high = df["High"].rolling(period).max()
        recent_low = df["Low"].rolling(period).min()
        range_hl = recent_high - recent_low

        df["Fib_0.236"] = recent_high - 0.236 * range_hl
        df["Fib_0.382"] = recent_high - 0.382 * range_hl
        df["Fib_0.618"] = recent_high - 0.618 * range_hl

        # Distance to Fibonacci levels
        df["Dist_to_Fib_0.382"] = (df["Close"] - df["Fib_0.382"]) / df["Close"]

        # Market regime indicator (ADX-based)
        # Simplified: use price range volatility
        df["Price_range"] = (df["High"] - df["Low"]) / df["Close"]
        df["Regime_trending"] = (df["Price_range"].rolling(14).mean() > df["Price_range"].rolling(50).mean()).astype(
            int
        )

        return df

    def add_feature_interactions(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add feature interaction terms.

        Interactions can capture non-linear relationships.
        """
        df = df.copy()

        # RSI * Volume (momentum + volume confirmation)
        if "RSI" in df.columns and "Volume" in df.columns:
            df["RSI_Volume"] = df["RSI"] * np.log1p(df["Volume"])

        # MACD * Sentiment
        if "MACD" in df.columns and "Sentiment" in df.columns:
            df["MACD_Sentiment"] = df["MACD"] * df["Sentiment"]

        # Volatility * VIX
        if "Intraday_volatility" in df.columns and "VIX" in df.columns:
            df["Vol_VIX"] = df["Intraday_volatility"] * df["VIX"]

        return df

    def select_features(self, df: pd.DataFrame, importance_threshold: float = 0.01) -> pd.DataFrame:
        """
        Select features based on importance.

        Args:
            df: DataFrame with all features
            importance_threshold: Minimum importance to keep feature
        """
        if not self.feature_importance:
            # If no importance calculated yet, return all features
            return df

        # Filter features by importance
        important_features = [feat for feat, imp in self.feature_importance.items() if imp >= importance_threshold]

        # Keep only important features (plus target if exists)
        available_features = [f for f in important_features if f in df.columns]

        if "target" in df.columns:
            available_features.append("target")

        logger.info(f"Selected {len(available_features)} features (threshold: {importance_threshold})")

        return df[available_features]

    def generate_all_features(
        self,
        df: pd.DataFrame,
        sentiment_scores: Optional[pd.Series] = None,
        sector_index: Optional[pd.DataFrame] = None,
        vix: Optional[pd.Series] = None,
        fx_rate: Optional[pd.Series] = None,
    ) -> pd.DataFrame:
        """
        Generate all advanced features.

        Args:
            df: Base price data
            sentiment_scores: Optional sentiment data
            sector_index: Optional sector index data
            vix: Optional VIX data
            fx_rate: Optional FX rate data
        """
        logger.info("Generating advanced features...")

        # 1. Market microstructure
        df = self.add_market_microstructure_features(df)

        # 2. Alternative data
        df = self.add_alternative_data_features(df, sentiment_scores)

        # 3. Cross-asset
        df = self.add_cross_asset_features(df, sector_index, vix, fx_rate)

        # 4. Advanced technical indicators
        df = self.add_advanced_technical_indicators(df)

        # 5. Feature interactions
        df = self.add_feature_interactions(df)

        # Drop NaN values created by rolling windows
        df = df.dropna()

        logger.info(f"Generated {len(df.columns)} features")

        return df
