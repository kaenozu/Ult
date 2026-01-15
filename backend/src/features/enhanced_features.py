"""
拡張された時系列特徴量エンジニアリング

予測精度向上のための高度な時系列特徴量を生成します。
- クロスセクション特徴量
- マルチタイムフレーム特徴量
- カレンダー効果
- ターゲットエンコーディング
- マイクロ構造特徴量
"""

import logging
import warnings
from typing import Dict, Optional

import numpy as np
import pandas as pd
import ta

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


def add_cross_sectional_features(df: pd.DataFrame, market_data: Dict[str, pd.DataFrame], ticker: str) -> pd.DataFrame:
    """
    クロスセクション特徴量を追加

    Args:
        df: 対象銘柄のデータフレーム
        market_data: 市場全体のデータ (他銘柄)
        ticker: 対象銘柄

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    # マーケットリターン（市場全体の平均リターン）
    market_returns = []
    for tick, data in market_data.items():
        if tick != ticker and "Close" in data.columns:
            returns = data["Close"].pct_change()
            market_returns.append(returns)

    if market_returns:
        market_returns_df = pd.concat(market_returns, axis=1)
        df_out["Market_Return"] = market_returns_df.mean(axis=1)

        # 個別リターン vs マーケットリターンの差分
        df_out["Alpha"] = df_out["Close"].pct_change() - df_out["Market_Return"]

    # 他銘柄との相関（過去20日間）
    correlations = []
    for tick, data in market_data.items():
        if tick != ticker and "Close" in data.columns:
            # 価格をマージして相関を計算
            merged = pd.concat(
                [
                    df_out["Close"].pct_change().tail(20),
                    data["Close"].pct_change().tail(20),
                ],
                axis=1,
            )
            merged.columns = ["Target", "Peer"]
            if len(merged.dropna()) >= 10:  # 十分なデータがある場合
                corr = merged["Target"].corr(merged["Peer"])
                correlations.append(corr)

    if correlations:
        df_out["Peer_Correlation"] = np.mean(correlations)

    return df_out


def add_multitimeframe_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    マルチタイムフレーム特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    if len(df_out) < 50:
        return df_out

    # 日足から週足/月足への集約特徴量
    df_out.index = pd.to_datetime(df_out.index)

    # 週足特徴量 (5営業日)
    weekly_data = df_out.resample("W").agg(
        {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
    )

    # 週足の移動平均
    weekly_data["SMA_4W"] = weekly_data["Close"].rolling(4).mean()  # 4週移動平均

    # 最新の週データを日足データにマージ
    weekly_data.index = weekly_data.index.normalize()  # 日付のみに
    df_out = df_out.join(weekly_data.add_suffix("_weekly"), how="left")

    # 前週比リターン
    df_out["Weekly_Return"] = df_out["Close_weekly"] / df_out["Close_weekly"].shift(5) - 1

    # マルチタイムフレームの乖離
    df_out["MTF_Divergence"] = (df_out["Close"] - df_out["SMA_4W_weekly"]) / df_out["SMA_4W_weekly"]

    return df_out


def add_calendar_effects(df: pd.DataFrame) -> pd.DataFrame:
    """
    カレンダー効果特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    # インデックスが日付でない場合、変換
    if not isinstance(df_out.index, pd.DatetimeIndex):
        df_out.index = pd.to_datetime(df_out.index)

    # 曜日
    df_out["DayOfWeek"] = df_out.index.dayofweek
    df_out["IsWeekend"] = df_out["DayOfWeek"].isin([5, 6]).astype(int)

    # 月初/月末
    df_out["IsMonthStart"] = df_out.index.is_month_start.astype(int)
    df_out["IsMonthEnd"] = df_out.index.is_month_end.astype(int)

    # 四半期開始/終了
    df_out["IsQuarterStart"] = df_out.index.is_quarter_start.astype(int)
    df_out["IsQuarterEnd"] = df_out.index.is_quarter_end.astype(int)

    # 日中/夜間取引の区別（仮想的なもの）
    df_out["DayOfYear"] = df_out.index.dayofyear
    df_out["WeekOfYear"] = df_out.index.isocalendar().week.astype(int)

    # 特定のイベント（例：年末調整、業績発表期など）のためのダミー変数
    df_out["IsYearEnd"] = ((df_out.index.month == 12) & (df_out.index.day >= 20)).astype(int)
    df_out["IsQ1Start"] = ((df_out.index.month == 1) | (df_out.index.month == 2)).astype(int)

    return df_out


def add_target_encoding_features(df: pd.DataFrame, target_col: str = "Close", window: int = 20) -> pd.DataFrame:
    """
    ターゲットエンコーディング特徴量を追加

    注意: データリークを避けるため、未来情報を使用しないように注意

    Args:
        df: データフレーム
        target_col: エンコーディング対象の列
        window: 移動統計のウィンドウ

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    # 価格の変化率（過去のリターン）をもとにカテゴリ化
    returns = df_out[target_col].pct_change()

    # 移動平均をもとに価格の相対的位置を計算
    ma = df_out[target_col].rolling(window=window).mean()
    df_out[f"{target_col}_Position_MA{window}"] = (df_out[target_col] - ma) / (ma + 1e-6)

    # 価格カテゴリ（相対的位置）
    df_out[f"{target_col}_Cat"] = pd.cut(
        df_out[f"{target_col}_Position_MA{window}"],
        bins=5,
        labels=["Very_Low", "Low", "Neutral", "High", "Very_High"],
    ).astype("category")

    # カテゴリ点ごとの過去リターンの平均（シフトして未来の情報としない）
    try:
        category_returns = returns.groupby(df_out[f"{target_col}_Cat"]).rolling(window=5).mean()
        # カテゴリ内でのシフトを行い、インデックスを揃える
        shifted_returns = category_returns.groupby(level=0).shift(1)
        # MultiIndexの2番目のレベル（元の日付インデックス）を取り出してマージ
        df_out[f"{target_col}_Cat_ExpReturn"] = shifted_returns.reset_index(level=0, drop=True)
    except Exception as e:
        logger.warning(f"Target encoding failed: {e}")
        df_out[f"{target_col}_Cat_ExpReturn"] = 0

    return df_out


def add_microstructure_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    マイクロ構造特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    required_cols = ["Open", "High", "Low", "Close", "Volume"]
    if not all(col in df_out.columns for col in required_cols):
        return df_out

    # ビッド・アスクの代用品（OHLCの関係から計算）
    # True Range
    df_out["True_Range"] = np.maximum(
        df_out["High"] - df_out["Low"],
        np.abs(df_out["High"] - df_out["Close"].shift(1)),
        np.abs(df_out["Low"] - df_out["Close"].shift(1)),
    )

    # 価格変化と出来高の関係
    df_out["Price_Volume_Corr"] = df_out["Close"].pct_change().rolling(10).corr(df_out["Volume"].pct_change())

    # 売買代金
    df_out["Dollar_Volume"] = df_out["Close"] * df_out["Volume"]

    # 価格変動と出来高の比率
    df_out["Volume_Price_Trend"] = df_out["Volume"] * df_out["Close"].pct_change()
    df_out["Volume_Price_Trend_MA"] = df_out["Volume_Price_Trend"].rolling(10).sum()

    # 始値と終値の乖離
    df_out["OC_Ratio"] = (df_out["Close"] - df_out["Open"]) / df_out["Open"]

    # 高値と安値の範囲
    df_out["HL_Range"] = (df_out["High"] - df_out["Low"]) / df_out["Open"]

    # 価格の方向性と出来高の関係
    df_out["Volume_Spread"] = np.where(df_out["Close"] >= df_out["Open"], df_out["Volume"], -df_out["Volume"])
    df_out["Volume_Spread_MA"] = df_out["Volume_Spread"].rolling(10).sum()

    return df_out


def add_volatility_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    拡張されたボラティリティ特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    if "Close" not in df_out.columns:
        return df_out

    # 1. ヒストリカルボラティリティ（複数期間）
    for window in [5, 10, 20, 60]:
        df_out[f"Historical_Vol_{window}"] = df_out["Close"].pct_change().rolling(window).std() * np.sqrt(252)

    # 2. 実現ボラティリティ（対数リターンの二乗和）
    log_rets = np.log(df_out["Close"] / df_out["Close"].shift(1))
    df_out["Realized_Vol"] = np.sqrt(log_rets.rolling(20).apply(lambda x: np.sum(x**2)))

    # 3. ボラティリティクラスタリング（GARCH的な特徴）
    squared_rets = log_rets**2
    df_out["Vol_Clustering"] = squared_rets.rolling(10).mean().shift(1)  # 前日の二乗リターン

    # 4. ボラティリティの変化率
    df_out["Vol_Change"] = df_out["Historical_Vol_20"].pct_change()

    # 5. ボラティリティのレジーム分類
    vol_regime = pd.cut(df_out["Historical_Vol_20"], bins=3, labels=["Low", "Medium", "High"]).astype("category")
    df_out["Vol_Regime"] = vol_regime

    return df_out


def add_enhanced_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    拡張されたテクニカル指標を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    required_cols = ["High", "Low", "Close", "Volume"]
    if not all(col in df_out.columns for col in required_cols):
        return df_out

    try:
        # 0. 基本的な勢い・レンジ指標
        df_out["RSI_14"] = ta.momentum.RSIIndicator(close=df_out["Close"], window=14).rsi()
        df_out["ATR_14"] = ta.volatility.AverageTrueRange(
            high=df_out["High"], low=df_out["Low"], close=df_out["Close"], window=14
        ).average_true_range()
        for lag in (1, 3, 5, 10):
            df_out[f"Return_Lag_{lag}"] = df_out["Close"].pct_change(lag)

        # 1. バラント指標（価格とボリュームの関係）
        df_out["Chaikin_MF"] = ta.volume.ChaikinMoneyFlowIndicator(
            high=df_out["High"],
            low=df_out["Low"],
            close=df_out["Close"],
            volume=df_out["Volume"],
            window=20,
        ).chaikin_money_flow()

        # 2. EOM（Ease of Movement）
        df_out["EOM"] = ta.volume.EaseOfMovementIndicator(
            high=df_out["High"], low=df_out["Low"], volume=df_out["Volume"], window=14
        ).ease_of_movement()

        # 3. Force Index
        df_out["Force_Index"] = ta.volume.ForceIndexIndicator(
            close=df_out["Close"], volume=df_out["Volume"], window=13
        ).force_index()

        # 4. TRIX (Triple Exponential Average)
        df_out["TRIX"] = ta.trend.TRIXIndicator(close=df_out["Close"], window=14).trix()

        # 5. Mass Index
        ema_high = df_out["High"].ewm(span=9).mean()
        ema_low = df_out["Low"].ewm(span=9).mean()
        high_low_diff = ema_high - ema_low
        double_ema_diff = high_low_diff.ewm(span=9).mean()
        df_out["Mass_Index"] = (high_low_diff / double_ema_diff).rolling(25).sum()

    except Exception as e:
        logger.error(f"Error adding enhanced technical indicators: {e}")

    return df_out


def add_risk_adjusted_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    リスク調整特徴量を追加

    Args:
        df: データフレーム

    Returns:
        特徴量追加後のデータフレーム
    """
    df_out = df.copy()

    if "Close" not in df_out.columns:
        return df_out

    # 1. シャープ比（過去期間におけるリターン/ボラティリティ）
    returns = df_out["Close"].pct_change()
    for window in [20, 60]:  # 1ヶ月, 3ヶ月
        rolling_return = returns.rolling(window).sum()
        rolling_vol = returns.rolling(window).std() * np.sqrt(252)
        df_out[f"Sharpe_Ratio_{window}"] = rolling_return / (rolling_vol + 1e-6)

    # 2. Sortino比（ downside volatility）
    for window in [20, 60]:
        rolling_return = returns.rolling(window).sum()
        negative_returns = returns.copy()
        negative_returns[returns > 0] = 0
        downside_dev = negative_returns.rolling(window).std() * np.sqrt(252)
        df_out[f"Sortino_Ratio_{window}"] = rolling_return / (downside_dev + 1e-6)

    # 3. カルマ比率（リターン/下振れリスク）
    for window in [20, 60]:
        rolling_return = returns.rolling(window).sum()
        downside_dev = np.sqrt((returns.where(returns < 0, 0) ** 2).rolling(window).mean()) * np.sqrt(252)
        df_out[f"Calmar_Ratio_{window}"] = rolling_return / (downside_dev + 1e-6)

    # 4. ゲインロスレシオ
    for window in [20, 60]:
        positive_returns = returns[returns > 0].rolling(window, min_periods=1).mean()
        negative_returns = returns[returns < 0].rolling(window, min_periods=1).mean()
        df_out[f"Gain_Loss_Ratio_{window}"] = positive_returns / (negative_returns.abs() + 1e-6)

    return df_out


def _add_macro_and_sentiment_features(
    df: pd.DataFrame, external_features: Optional[Dict[str, pd.DataFrame]] = None
) -> pd.DataFrame:
    """
    VIXなどのマクロ指標やニュースセンチメントを付加。
    external_features:
      - vix: DataFrame (index: date, column: Close)
      - move/us_yield/oil/fx: DataFrame
      - sentiment: Dict or DataFrame (score/labelなど)
    """
    if not external_features:
        return df

    df_out = df.copy()
    try:

        def _append_series(key: str, prefix: str):
            src = external_features.get(key)
            if isinstance(src, pd.DataFrame) and not src.empty:
                series = None
                if "Close" in src.columns:
                    series = src["Close"]
                elif src.shape[1] > 0:
                    series = src.iloc[:, 0]
                if series is not None:
                    series = series.reindex(df_out.index).fillna(method="ffill")
                    df_out[f"{prefix}_Close"] = series
                    df_out[f"{prefix}_Change"] = series.pct_change()

        _append_series("vix", "VIX")
        _append_series("move", "MOVE")
        _append_series("us10y", "US10Y")
        _append_series("us2y", "US2Y")
        _append_series("usd_jpy", "USDJPY")
        _append_series("dxy", "DXY")
        _append_series("oil", "OIL")

        sentiment = external_features.get("sentiment")
        if isinstance(sentiment, pd.DataFrame):
            aligned = sentiment.reindex(df_out.index).fillna(method="ffill")
            for col in aligned.columns:
                df_out[f"Sent_{col}"] = aligned[col]
            # スプレッド例: news と market の差分
            if {"news_score", "market_score"}.issubset(aligned.columns):
                df_out["Sent_News_Spread"] = aligned["news_score"] - aligned["market_score"]
            if {"social_score", "market_score"}.issubset(aligned.columns):
                df_out["Sent_Social_Spread"] = aligned["social_score"] - aligned["market_score"]
        elif isinstance(sentiment, dict):
            for key, value in sentiment.items():
                df_out[f"Sent_{key}"] = value

        sentiment = external_features.get("sentiment")
        if isinstance(sentiment, pd.DataFrame):
            aligned = sentiment.reindex(df_out.index).fillna(method="ffill")
            for col in aligned.columns:
                df_out[f"Sent_{col}"] = aligned[col]
        elif isinstance(sentiment, dict):
            for key, value in sentiment.items():
                df_out[f"Sent_{key}"] = value
    except Exception as exc:
        logger.warning("Failed to append macro/sentiment features: %s", exc)
    return df_out


def generate_enhanced_features(
    df: pd.DataFrame,
    market_data: Optional[Dict[str, pd.DataFrame]] = None,
    ticker: Optional[str] = None,
    external_features: Optional[Dict[str, pd.DataFrame]] = None,
) -> pd.DataFrame:
    """
    全ての拡張特徴量を生成

    Args:
        df: 対象データフレーム
        market_data: 市場全体のデータ（クロスセクション特徴量用）
        ticker: 対象銘柄

    Returns:
        拡張特徴量が追加されたデータフレーム
    """
    df_out = df.copy()

    if len(df_out) < 50:
        logger.warning(f"Insufficient data for enhanced feature engineering: {len(df_out)} rows")
        return df_out

    # 1. マイクロ構造特徴量
    df_out = add_microstructure_features(df_out)

    # 2. カレンダー効果
    df_out = add_calendar_effects(df_out)

    # 3. 拡張テクニカル指標
    df_out = add_enhanced_technical_indicators(df_out)

    # 4. ボラティリティ特徴量
    df_out = add_volatility_features(df_out)

    # 5. リスク調整特徴量
    df_out = add_risk_adjusted_features(df_out)

    # 6. マルチタイムフレーム特徴量
    df_out = add_multitimeframe_features(df_out)

    # 7. クロスセクション特徴量（市場データがある場合）
    if market_data is not None and ticker is not None:
        df_out = add_cross_sectional_features(df_out, market_data, ticker)

    # 7.5. マクロ・センチメント特徴量
    df_out = _add_macro_and_sentiment_features(df_out, external_features=external_features)

    # 8. ターゲットエンコーディング
    df_out = add_target_encoding_features(df_out)

    # 無効値の処理
    df_out = df_out.replace([np.inf, -np.inf], np.nan)

    # 数値列とカテゴリ列を分けて処理
    numeric_cols = df_out.select_dtypes(include=[np.number]).columns
    df_out[numeric_cols] = df_out[numeric_cols].fillna(method="ffill").fillna(method="bfill").fillna(0)

    # カテゴリ列などの非数値列
    other_cols = df_out.select_dtypes(exclude=[np.number]).columns
    if not other_cols.empty:
        df_out[other_cols] = df_out[other_cols].fillna(method="ffill").fillna(method="bfill")

    logger.info(f"Generated enhanced features. New shape: {df_out.shape}")

    return df_out


if __name__ == "__main__":
    # テスト用の実装
    logging.basicConfig(level=logging.INFO)

    # ダミーデータの作成
    dates = pd.date_range(start="2020-01-01", periods=200, freq="D")
    dummy_data = pd.DataFrame(
        {
            "Open": np.random.randn(200).cumsum() + 100,
            "High": np.random.randn(200).cumsum() + 102,
            "Low": np.random.randn(200).cumsum() + 98,
            "Close": np.random.randn(200).cumsum() + 100,
            "Volume": np.random.randint(1000000, 5000000, 200),
        },
        index=dates,
    )

    dummy_data["Open"] = dummy_data["Close"].shift(1) + np.random.normal(0, 0.1, len(dummy_data))
    dummy_data["High"] = dummy_data[["Open", "Close"]].max(axis=1) + abs(np.random.normal(0, 0.2, len(dummy_data)))
    dummy_data["Low"] = dummy_data[["Open", "Close"]].min(axis=1) - abs(np.random.normal(0, 0.2, len(dummy_data)))

    # 特徴量生成のテスト
    enhanced_df = generate_enhanced_features(dummy_data, ticker="TEST")

    print(f"Original shape: {dummy_data.shape}")
    print(f"Enhanced shape: {enhanced_df.shape}")
    print(f"New features: {set(enhanced_df.columns) - set(dummy_data.columns)}")
