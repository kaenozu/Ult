import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any
from src.strategies.technical import RSIStrategy, BollingerBandsStrategy

logger = logging.getLogger(__name__)


class FastBacktester:
    """
    遺伝的アルゴリズム用に最適化された高速バックテスター
    """

    def __init__(self, data: pd.DataFrame):
        self.data = data
        self.initial_capital = 1_000_000

    def run_simulation(self, dna: Any) -> Dict:
        """
        DNAパラメータに基づいてシミュレーションを行う
        """
        if self.data is None or self.data.empty:
            return {"pnl": 0, "win_rate": 0, "trades": 0}

        df = self.data.copy()
        capital = self.initial_capital
        position = 0
        entry_price = 0
        trades = 0
        wins = 0

        # 指標計算 (本来はVector化すべきだが、可読性重視でループ処理のロジックを模倣)
        # 高速化のため、ここでTa-Lib等を使うのがベストだが、pandasで簡易実装

        # RSI
        delta = df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=dna.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=dna.rsi_period).mean()
        rs = gain / loss
        df["RSI"] = 100 - (100 / (1 + rs))

        # SMA
        df["SMA_Short"] = df["Close"].rolling(window=dna.sma_short).mean()
        df["SMA_Long"] = df["Close"].rolling(window=dna.sma_long).mean()

        # Simulation Loop
        for i in range(len(df)):
            if i < 50:
                continue  # Skip initialization

            row = df.iloc[i]
            prev = df.iloc[i - 1]

            price = row["Close"]

            # EXIT LOGIC
            if position > 0:
                pnl_pct = (price - entry_price) / entry_price

                # Stop Loss or Take Profit
                if pnl_pct <= -dna.stop_loss_pct or pnl_pct >= dna.take_profit_pct:
                    capital *= 1 + pnl_pct
                    position = 0
                    trades += 1
                    if pnl_pct > 0:
                        wins += 1
                    continue

                # Technical Exit (RSI Overbought)
                if row["RSI"] > dna.rsi_upper:
                    capital *= 1 + pnl_pct
                    position = 0
                    trades += 1
                    if pnl_pct > 0:
                        wins += 1
                    continue

            # ENTRY LOGIC
            if position == 0:
                # Golden Cross
                golden_cross = (prev["SMA_Short"] < prev["SMA_Long"]) and (row["SMA_Short"] > row["SMA_Long"])

                # RSI Oversold
                rsi_buy = row["RSI"] < dna.rsi_lower

                if golden_cross or rsi_buy:
                    position = 1
                    entry_price = price

        # Force close at end
        if position > 0:
            final_price = df.iloc[-1]["Close"]
            pnl_pct = (final_price - entry_price) / entry_price
            capital *= 1 + pnl_pct
            trades += 1
            if pnl_pct > 0:
                wins += 1

        total_return = capital - self.initial_capital
        win_rate = (wins / trades * 100) if trades > 0 else 0

        return {"pnl": total_return, "win_rate": win_rate, "trades": trades, "final_capital": capital}
