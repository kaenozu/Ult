from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional

import pandas as pd


class OrderType(Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


@dataclass
class Order:
    ticker: str
    type: OrderType
    action: str  # 'BUY' or 'SELL'
    quantity: float
    price: Optional[float] = None  # Limit or Stop price
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop_pct: Optional[float] = None  # For trailing stop logic
    expiry: str = "GTC"  # Good Till Cancelled or DAY


class Strategy:
    """
    トレード戦略の基底クラス
    """

    def __init__(self, name: str, trend_period: int = 200) -> None:
        """
        戦略の初期化

        Args:
            name: 戦略名
            trend_period: トレンド期間（デフォルト: 200）
        """
        self.name = name
        self.trend_period = trend_period

    def apply_trend_filter(self, df: pd.DataFrame, signals: pd.Series) -> pd.Series:
        if self.trend_period <= 0:
            return signals

        trend_sma = df["Close"].rolling(window=self.trend_period).mean()

        filtered_signals = signals.copy()

        # Filter Longs: More lenient trend filter
        # Only block if price is significantly below SMA (e.g. < 95% of SMA)
        long_condition = df["Close"] > (trend_sma * 0.95)
        filtered_signals.loc[(signals == 1) & (~long_condition)] = 0

        # Filter Shorts: More lenient
        short_condition = df["Close"] < (trend_sma * 1.05)
        filtered_signals.loc[(signals == -1) & (~short_condition)] = 0

        return filtered_signals

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        raise NotImplementedError

    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Standard interface for strategies to return signal and confidence.
        Default implementation wraps generate_signals.
        """
        signals = self.generate_signals(df)
        if signals.empty:
            return {"signal": 0, "confidence": 0.0}

        # Get the latest signal (for the last available date)
        last_signal = signals.iloc[-1]

        return {
            "signal": int(last_signal),
            "confidence": 1.0 if last_signal != 0 else 0.0,
        }

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "買いシグナル"
        elif signal == -1:
            return "売りシグナル"
        return "様子見"
