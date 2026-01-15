"""トレードシミュレーションコアモジュール

このモジュールは、株価データと取引戦略に基づいて取引シミュレーションを実行する核となる機能を提供します。
"""

from typing import Any, Dict, Union

import pandas as pd


class TradeSimulatorCore:
    """取引シミュレーションの核心ロジックを提供するクラス"""

    def __init__(
        self,
        initial_capital: float = 100_000,
        position_size: Union[float, Dict[str, float]] = 0.1,
        commission: float = 0.001,
        slippage: float = 0.001,
        allow_short: bool = True,
    ) -> None:
        self.initial_capital = initial_capital
        self.position_size = position_size
        self.commission = commission
        self.slippage = slippage
        self.allow_short = allow_short

    def _size_position(self, ticker: str, portfolio_value: float, exec_price: float) -> float:
        """ポジションサイズを計算"""
        if isinstance(self.position_size, dict):
            alloc = self.position_size.get(ticker, 0.0)
        else:
            alloc = self.position_size
        target_amount = portfolio_value * alloc
        return target_amount / exec_price if exec_price != 0 else 0.0

    def _calculate_portfolio_value(
        self,
        cash: float,
        holdings: Dict[str, float],
        aligned_data: Dict[str, pd.DataFrame],
        index: int,
        final_calc: bool = False,
    ) -> float:
        """ポートフォリオ価値を計算"""
        current_portfolio_value = cash
        for t in aligned_data:
            if holdings[t] != 0 and not pd.isna(aligned_data[t]["Close"].iloc[index]):
                if holdings[t] > 0:  # ロンポジション
                    current_portfolio_value += holdings[t] * aligned_data[t]["Close"].iloc[index]
                else:  # ショートポジション
                    entry_price_val = self.entry_prices[
                        t
                    ]  # 修正：entry_pricesはインスタンス変数として定義する必要がある
                    current_price_val = aligned_data[t]["Close"].iloc[index]
                    profit = (entry_price_val - current_price_val) * abs(holdings[t])
                    current_portfolio_value += profit
        return current_portfolio_value

    def _get_position_state(self, holdings: Dict[str, float]) -> int:
        """ポジション状態を取得"""
        position_state = 0
        for h in holdings.values():
            if h > 0:
                position_state = 1
                break
            elif h < 0:
                position_state = -1
                break
        return position_state

    def _create_trade_record(
        self,
        ticker: str,
        reason: str,
        entry: float,
        exec_price: float,
        trade_type: str,
        date,
    ) -> Dict[str, Any]:
        """取引記録を作成"""
        return {
            "ticker": ticker,
            "entry_date": None,
            "exit_date": date,
            "entry_price": entry,
            "exit_price": exec_price,
            "return": (exec_price - entry) / entry if trade_type == "Long" else (entry - exec_price) / entry,
            "type": trade_type,
            "reason": reason,
        }
