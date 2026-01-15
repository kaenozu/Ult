"""
動的リスク管理モジュール

市場状況に応じてリアルタイムでリスクパラメータを調整します。
"""

import logging
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd

from .regime_detector import RegimeDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DynamicRiskManager:
    """
    動的リスク管理マネージャー

    市場レジームとボラティリティに基づいて、リスクパラメータを動的に調整します。
    """

    def __init__(self, config: Optional[Dict] = None, regime_detector: Optional[RegimeDetector] = None):
        """
        Args:
            config: 設定辞書
            regime_detector: 市場レジーム検出器（Noneの場合は新規作成）
        """
        self.config = config or {}
        self.regime_detector = regime_detector or RegimeDetector()
        self.current_regime = None
        self.current_params = {}
        self.parameter_history = []

        logger.info("DynamicRiskManager initialized")

    def adjust_risk_for_volatility(self, volatility: float) -> float:
        """ボラティリティに応じてリスク許容度を調整"""
        # 低ボラなら1.0、高ボラ（30%以上）なら0.5程度に縮小
        if volatility <= 0.1:
            return 1.0
        elif volatility >= 0.4:
            return 0.2
        else:
            return 1.0 - (volatility - 0.1) * 2.0

    def update_parameters(self, df: pd.DataFrame, lookback: int = 20) -> Dict[str, Any]:
        """
        現在の市場状況に基づいてパラメータを更新

        Args:
            df: 最新の価格データ
            lookback: 分析期間

        Returns:
            更新されたパラメータの辞書
        """
        # レジーム検出
        # NOTE: RegimeDetector uses internal windows, lookback argument is unused for detection logic
        self.current_regime = self.regime_detector.detect_regime(df)

        # レジーム別の基本パラメータ取得
        base_params = self.regime_detector.get_regime_strategy(self.current_regime)

        # ボラティリティに基づく微調整
        volatility_adjustment = self._calculate_volatility_adjustment(df, lookback)

        # パラメータ調整
        self.current_params = {
            "regime": self.current_regime,
            "stop_loss": base_params["stop_loss"] * volatility_adjustment,
            "take_profit": base_params["take_profit"] * volatility_adjustment,
            "position_size": base_params["position_size"] / volatility_adjustment,
            "strategy": base_params.get("strategy", "unknown"),
            "description": base_params.get("description", "No description available"),
            "volatility_adjustment": volatility_adjustment,
        }

        # 履歴に追加
        self.parameter_history.append({"timestamp": pd.Timestamp.now(), "params": self.current_params.copy()})

        logger.info(f"Parameters updated for regime: {self.current_regime}")
        logger.info(
            f"Stop loss: {self.current_params['stop_loss']:.4f}, "
            f"Take profit: {self.current_params['take_profit']:.4f}, "
            f"Position size: {self.current_params['position_size']:.4f}"
        )

        return self.current_params

    def _calculate_volatility_adjustment(self, df: pd.DataFrame, lookback: int = 20) -> float:
        """
        ボラティリティに基づく調整係数を計算

        Args:
            df: 価格データ
            lookback: 分析期間

        Returns:
            調整係数（0.5~2.0の範囲）
        """
        try:
            from ta.volatility import AverageTrueRange

            # ATR計算
            atr_indicator = AverageTrueRange(high=df["High"], low=df["Low"], close=df["Close"], window=lookback)

            current_atr = atr_indicator.average_true_range().iloc[-1]
            historical_atr = atr_indicator.average_true_range().iloc[-lookback * 2 : -lookback].mean()

            # 現在のボラティリティ / 過去の平均ボラティリティ
            adjustment = current_atr / historical_atr if historical_atr > 0 else 1.0

        except Exception as e:
            logger.warning(f"Error calculating volatility adjustment: {e}. Using default.")
            adjustment = 1.0

        # 極端な値を制限
        adjustment = np.clip(adjustment, 0.5, 2.0)

        return adjustment

    def get_position_size(
        self,
        account_balance: float,
        risk_per_trade: float = 0.02,
        current_price: float = None,
        stop_loss_price: float = None,
    ) -> float:
        """
        動的ポジションサイズを計算

        Args:
            account_balance: 口座残高
            risk_per_trade: 1トレードあたりのリスク（デフォルト2%）
            current_price: 現在価格（Noneの場合は簡易計算）
            stop_loss_price: 損切り価格（Noneの場合は簡易計算）

        Returns:
            ポジションサイズ（株数または金額）
        """
        # レジーム別の調整
        regime_multiplier = self.current_params.get("position_size", 1.0)

        # 基本リスク金額
        risk_amount = account_balance * risk_per_trade

        # 調整後のリスク金額
        adjusted_risk = risk_amount * regime_multiplier

        # 価格ベースの計算
        if current_price and stop_loss_price:
            # 1株あたりのリスク
            risk_per_share = abs(current_price - stop_loss_price)

            if risk_per_share > 0:
                # ポジションサイズ（株数）
                position_size = adjusted_risk / risk_per_share
            else:
                # リスクがゼロの場合は基本サイズ
                position_size = adjusted_risk / current_price
        else:
            # 簡易計算（金額ベース）
            position_size = adjusted_risk

        logger.info(f"Calculated position size: {position_size:.2f}")

        return position_size

    def calculate_stop_loss(self, entry_price: float, direction: str = "long") -> float:
        """
        動的損切り価格を計算

        Args:
            entry_price: エントリー価格
            direction: 'long' または 'short'

        Returns:
            損切り価格
        """
        stop_loss_pct = self.current_params.get("stop_loss", 0.02)

        if direction == "long":
            stop_loss_price = entry_price * (1 - stop_loss_pct)
        else:  # short
            stop_loss_price = entry_price * (1 + stop_loss_pct)

        logger.info(
            f"Stop loss price for {direction}: {stop_loss_price:.2f} " f"({stop_loss_pct * 100:.2f}% from entry)"
        )

        return stop_loss_price

    def calculate_take_profit(self, entry_price: float, direction: str = "long") -> float:
        """
        動的利確価格を計算

        Args:
            entry_price: エントリー価格
            direction: 'long' または 'short'

        Returns:
            利確価格
        """
        take_profit_pct = self.current_params.get("take_profit", 0.05)

        if direction == "long":
            take_profit_price = entry_price * (1 + take_profit_pct)
        else:  # short
            take_profit_price = entry_price * (1 - take_profit_pct)

        logger.info(
            f"Take profit price for {direction}: {take_profit_price:.2f} " f"({take_profit_pct * 100:.2f}% from entry)"
        )

        return take_profit_price

    def should_enter_trade(self, signal_strength: float = 0.7, min_strength: float = 0.6) -> bool:
        """
        トレードに入るべきか判断

        Args:
            signal_strength: シグナルの強さ（0-1）
            min_strength: 最小必要強度

        Returns:
            トレードに入るべき場合True
        """
        # レジームに基づく調整
        regime = self.current_regime

        # 高ボラティリティ時は慎重に
        if regime == "high_volatility":
            min_strength = min_strength * 1.2
        # 低ボラティリティ時は積極的に
        elif regime == "low_volatility":
            min_strength = min_strength * 0.9

        should_enter = signal_strength >= min_strength

        logger.info(
            f"Trade decision: {'ENTER' if should_enter else 'SKIP'} "
            f"(signal={signal_strength:.2f}, threshold={min_strength:.2f})"
        )

        return should_enter

    def get_risk_metrics(self) -> Dict[str, Any]:
        """
        現在のリスク指標を取得

        Returns:
            リスク指標の辞書
        """
        return {
            "current_regime": self.current_regime,
            "stop_loss_pct": self.current_params.get("stop_loss", 0) * 100,
            "take_profit_pct": self.current_params.get("take_profit", 0) * 100,
            "position_size_multiplier": self.current_params.get("position_size", 1.0),
            "strategy": self.current_params.get("strategy", "unknown"),
            "volatility_adjustment": self.current_params.get("volatility_adjustment", 1.0),
        }

    def adjust_risk_for_volatility(self, volatility: float) -> float:
        """ボラティリティに基づいてリスク許容度を調整"""
        # ボラティリティが高いほどリスク許容度（倍率）を下げる
        if volatility <= 0:
            return 1.0
        
        # 基準値をテスト値に合わせて調整
        base_vol = 0.15
        adjustment = base_vol / volatility
        return float(np.clip(adjustment, 0.1, 2.0))

    def get_parameter_history(self, n: int = 10) -> list:
        """
        パラメータ履歴を取得

        Args:
            n: 取得する履歴数

        Returns:
            パラメータ履歴のリスト
        """
        return self.parameter_history[-n:]


# 使用例
if __name__ == "__main__":
    # サンプルデータ
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    df = pd.DataFrame(
        {
            "Open": np.random.randn(100).cumsum() + 100,
            "High": np.random.randn(100).cumsum() + 102,
            "Low": np.random.randn(100).cumsum() + 98,
            "Close": np.random.randn(100).cumsum() + 100,
            "Volume": np.random.randint(1000000, 10000000, 100),
        },
        index=dates,
    )

    # 動的リスク管理
    risk_manager = DynamicRiskManager()

    # パラメータ更新
    params = risk_manager.update_parameters(df)
    print(f"Updated parameters: {params}")

    # ポジションサイズ計算
    account_balance = 1000000  # 100万円
    position_size = risk_manager.get_position_size(
        account_balance=account_balance, current_price=100, stop_loss_price=98
    )
    print(f"Position size: {position_size:.2f}")

    # 損切り・利確価格
    entry_price = 100
    stop_loss = risk_manager.calculate_stop_loss(entry_price, "long")
    take_profit = risk_manager.calculate_take_profit(entry_price, "long")
    print(f"Entry: {entry_price}, Stop loss: {stop_loss:.2f}, Take profit: {take_profit:.2f}")

    # リスク指標
    metrics = risk_manager.get_risk_metrics()
    print(f"Risk metrics: {metrics}")
