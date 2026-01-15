"""
高度な時系列特徴量エンジニアリング

予測精度向上のための時系列特化特徴量を生成します。
- ラグ特徴量
- ローリング統計
- テクニカル指標の派生形
"""

import logging
from typing import List

import numpy as np
import pandas as pd
import ta

logger = logging.getLogger(__name__)


def add_lag_features(
    df: pd.DataFrame,
    columns: List[str] = ["Close", "Volume"],
    lags: List[int] = [1, 3, 5, 10, 20],
) -> pd.DataFrame:
    """
    ラグ特徴量を追加

    Args:
        df: データフレーム
        columns: ラグを取るカラム
        lags: ラグの日数リスト

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    for col in columns:
        if col not in df_out.columns:
            continue

        for lag in lags:
            # 単純なラグ
            df_out[f"{col}_lag_{lag}"] = df_out[col].shift(lag)

            # 変化率（リターン）
            df_out[f"{col}_return_{lag}"] = df_out[col].pct_change(lag)

            # 対数リターン
            df_out[f"{col}_log_return_{lag}"] = np.log(df_out[col] / df_out[col].shift(lag))

    return df_out


def add_rolling_stats(
    df: pd.DataFrame,
    columns: List[str] = ["Close"],
    windows: List[int] = [5, 10, 20, 60],
) -> pd.DataFrame:
    """
    ローリング統計量を追加

    Args:
        df: データフレーム
        columns: 対象カラム
        windows: ウィンドウサイズリスト

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    for col in columns:
        if col not in df_out.columns:
            continue

        for window in windows:
            # 標準偏差（ボラティリティ）
            df_out[f"{col}_std_{window}"] = df_out[col].rolling(window=window).std()

            # 歪度（Skewness）
            df_out[f"{col}_skew_{window}"] = df_out[col].rolling(window=window).skew()

            # 尖度（Kurtosis）
            df_out[f"{col}_kurt_{window}"] = df_out[col].rolling(window=window).kurt()

            # Zスコア（現在値が平均からどれだけ離れているか）
            mean = df_out[col].rolling(window=window).mean()
            std = df_out[f"{col}_std_{window}"]
            df_out[f"{col}_zscore_{window}"] = (df_out[col] - mean) / (std + 1e-6)

    return df_out


def add_advanced_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    高度なテクニカル指標特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    if "High" not in df_out.columns or "Low" not in df_out.columns or "Close" not in df_out.columns:
        return df_out

    # ATR (Average True Range) - ボラティリティ
    high_low = df_out["High"] - df_out["Low"]
    high_close = np.abs(df_out["High"] - df_out["Close"].shift())
    low_close = np.abs(df_out["Low"] - df_out["Close"].shift())

    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = np.max(ranges, axis=1)

    df_out["ATR_14"] = true_range.rolling(14).mean()

    # Normalized ATR (価格に対する割合)
    df_out["NATR_14"] = df_out["ATR_14"] / df_out["Close"]

    # Bollinger Band Width
    if "Close" in df_out.columns:
        sma = df_out["Close"].rolling(20).mean()
        std = df_out["Close"].rolling(20).std()
        upper = sma + 2 * std
        lower = sma - 2 * std

        df_out["BB_Width"] = (upper - lower) / sma
        df_out["BB_Position"] = (df_out["Close"] - lower) / (upper - lower)

    return df_out


def add_trend_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    トレンド系指標を追加 (taライブラリ使用)

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    # 必要なカラムの確認
    required_cols = ["High", "Low", "Close"]
    if not all(col in df_out.columns for col in required_cols):
        return df_out

    try:
        # ADX (Average Directional Index)
        df_out["ADX"] = ta.trend.ADXIndicator(
            high=df_out["High"], low=df_out["Low"], close=df_out["Close"], window=14
        ).adx()

        # CCI (Commodity Channel Index)
        df_out["CCI"] = ta.trend.CCIIndicator(
            high=df_out["High"], low=df_out["Low"], close=df_out["Close"], window=20
        ).cci()

        # RSI (Relative Strength Index) - 既に他であるかもしれないが念のため
        df_out["RSI"] = ta.momentum.RSIIndicator(close=df_out["Close"], window=14).rsi()

        # MACD
        macd = ta.trend.MACD(close=df_out["Close"])
        df_out["MACD"] = macd.macd()
        df_out["MACD_Signal"] = macd.macd_signal()
        df_out["MACD_Diff"] = macd.macd_diff()

    except Exception as e:
        logger.error(f"Error adding trend features: {e}")

    return df_out


def generate_all_advanced_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    すべての高度な特徴量を生成
    """
    df_out = df.copy()

    # ラグ特徴量
    df_out = add_lag_features(df_out)

    # ローリング統計
    df_out = add_rolling_stats(df_out)

    # 高度なテクニカル指標 (手動実装分)
    df_out = add_advanced_technical_features(df_out)

    # トレンド系指標 (taライブラリ分)
    df_out = add_trend_features(df_out)

    # 無限大やNaNの処理
    df_out = df_out.replace([np.inf, -np.inf], np.nan)
    # 前方埋め（時系列データなので）
    df_out = df_out.fillna(method="ffill")
    # それでも残るNaN（先頭など）は0埋め
    df_out = df_out.fillna(0)

    logger.info(f"Generated advanced features. New shape: {df_out.shape}")
    return df_out


def add_volatility_regime(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
    """
    ボラティリティレジーム（高/中/低ボラティリティ）を分類

    Phase 29-1で追加された特徴量

    Args:
        df: データフレーム
        window: ボラティリティ計算ウィンドウ

    Returns:
        ボラティリティレジーム特徴量が追加されたデータフレーム
    """
    df_out = df.copy()

    if "Close" not in df_out.columns:
        return df_out

    # ヒストリカルボラティリティ（年率換算）
    returns = df_out["Close"].pct_change()
    df_out["Historical_Volatility"] = returns.rolling(window).std() * np.sqrt(252)

    # ボラティリティの移動平均
    df_out["Vol_MA"] = df_out["Historical_Volatility"].rolling(window).mean()

    # ボラティリティレジーム分類
    # 過去のボラティリティ分布に基づいて3分位で分類
    vol_quantiles = df_out["Historical_Volatility"].quantile([0.33, 0.67])

    def classify_volatility(vol):
        if pd.isna(vol):
            return 1  # デフォルトは中程度
        elif vol < vol_quantiles[0.33]:
            return 0  # 低ボラティリティ
        elif vol < vol_quantiles[0.67]:
            return 1  # 中ボラティリティ
        else:
            return 2  # 高ボラティリティ

    df_out["Volatility_Regime"] = df_out["Historical_Volatility"].apply(classify_volatility)

    # ボラティリティの変化率
    df_out["Volatility_Change"] = df_out["Historical_Volatility"].pct_change()

    logger.info("Added volatility regime features")
    return df_out


def add_momentum_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    モメンタム特徴量を追加

    Phase 29-1で追加された特徴量

    Args:
        df: データフレーム

    Returns:
        モメンタム特徴量が追加されたデータフレーム
    """
    df_out = df.copy()

    required_cols = ["High", "Low", "Close"]
    if not all(col in df_out.columns for col in required_cols):
        return df_out

    try:
        # ROC (Rate of Change)
        for period in [5, 10, 20]:
            df_out[f"ROC_{period}"] = ta.momentum.ROCIndicator(close=df_out["Close"], window=period).roc()

        # Stochastic Oscillator
        stoch = ta.momentum.StochasticOscillator(
            high=df_out["High"],
            low=df_out["Low"],
            close=df_out["Close"],
            window=14,
            smooth_window=3,
        )
        df_out["Stoch_K"] = stoch.stoch()
        df_out["Stoch_D"] = stoch.stoch_signal()

        # Williams %R
        df_out["Williams_R"] = ta.momentum.WilliamsRIndicator(
            high=df_out["High"], low=df_out["Low"], close=df_out["Close"], lbp=14
        ).williams_r()

        # Ultimate Oscillator
        df_out["Ultimate_Osc"] = ta.momentum.UltimateOscillator(
            high=df_out["High"], low=df_out["Low"], close=df_out["Close"]
        ).ultimate_oscillator()

        logger.info("Added momentum features")

    except Exception as e:
        logger.error(f"Error adding momentum features: {e}")

    return df_out


def generate_phase29_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Phase 29-1のすべての新規特徴量を生成

    既存の特徴量に加えて、以下を追加:
        pass
    - ボラティリティレジーム分類
    - 追加のモメンタム指標

    Args:
        df: データフレーム（OHLCV）

    Returns:
        Phase 29-1の特徴量が追加されたデータフレーム
    """
    if df is None or len(df) < 50:
        return df

    df_out = df.copy()

    # 既存の高度な特徴量を生成
    df_out = generate_all_advanced_features(df_out)

    # Phase 29-1の新規特徴量を追加
    df_out = add_volatility_regime(df_out)
    df_out = add_momentum_features(df_out)

    # 無限大やNaNの処理
    df_out = df_out.replace([np.inf, -np.inf], np.nan)
    df_out = df_out.fillna(method="ffill")
    df_out = df_out.fillna(0)

    logger.info(f"Generated Phase 29-1 features. Final shape: {df_out.shape}")
    return df_out
