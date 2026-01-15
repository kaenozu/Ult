"""
Evolved Strategy - 進化型取引戦略
Neuro-Evolutionによって獲得された「最強のパラメータ」を使用して取引シグナルを生成
"""

import logging

import pandas as pd

from src.neuro_evolution import get_neuro_evolution_engine

logger = logging.getLogger(__name__)


class EvolvedStrategy:
    """進化型戦略"""

    def __init__(self):
        self.engine = get_neuro_evolution_engine()
        self.params = self.engine.load_best_gene()

        # デフォルトパラメータ（まだ進化していない場合用）
        if not self.params:
            self.params = {
                "rsi_buy_threshold": 30,
                "rsi_sell_threshold": 70,
                "sma_short_window": 20,
                "sma_long_window": 50,
                "stop_loss_pct": 0.05,
                "take_profit_pct": 0.10,
            }
            logger.info("EvolvedStrategy: Using default parameters (No evolution data found)")
        else:
            logger.info(f"EvolvedStrategy: Loaded evolved parameters: {self.params}")

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """シグナル生成 (1=Buy, -1=Sell, 0=Hold)"""
        if df is None or df.empty or len(df) < 200:
            return pd.Series()

        try:
            # パラメータ展開
            p = self.params
            sma_s = int(p.get("sma_short_window", 20))
            sma_l = int(p.get("sma_long_window", 50))
            rsi_buy = p.get("rsi_buy_threshold", 30)
            rsi_sell = p.get("rsi_sell_threshold", 70)

            data = df.copy()

            # 指標計算
            data["SMA_S"] = data["Close"].rolling(window=sma_s).mean()
            data["SMA_L"] = data["Close"].rolling(window=sma_l).mean()

            # RSI
            delta = data["Close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss
            data["RSI"] = 100 - (100 / (1 + rs))

            # シグナル
            signals = pd.Series(0, index=data.index)

            # Buy: SMA_S > SMA_L AND RSI < Buy_Threshold (押し目買い)
            # または SMAゴールデンクロス
            # ここではVectorBacktesterと同じロジックにする: SMA順張り + RSI逆張りフィルター
            buy_cond = (data["SMA_S"] > data["SMA_L"]) & (data["RSI"] < rsi_buy)

            # Sell: SMA_S < SMA_L OR RSI > Sell_Threshold
            sell_cond = (data["SMA_S"] < data["SMA_L"]) | (data["RSI"] > rsi_sell)

            signals[buy_cond] = 1
            signals[sell_cond] = -1

            return signals

        except Exception as e:
            logger.error(f"EvolvedStrategy signal generation error: {e}")
            return pd.Series(0, index=df.index)
