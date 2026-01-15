"""取引実行モジュール。

このモジュールは、バックテストエンジンからの信号を受けて、取引注文を実行する機能を提供します。
"""

from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd

from src.strategies.base import Order, OrderType


class BacktestExecutor:
    """バックテスト取引実行クラス。

    バックテストエンジンからの信号を受け取り、注文を執行します。
    """

    def __init__(self, commission: float, slippage: float):
        self.commission = commission
        self.slippage = slippage

    def execute_order(
        self,
        signal: Union[int, Order],
        holdings: Dict[str, float],
        entry_prices: Dict[str, float],
        cash: float,
        exec_price: float,
        ticker: str,
        today_high: float,
        today_low: float,
        aligned_data: Dict[str, pd.DataFrame],
        trailing_stop: Optional[float],
        stop_loss: float,
        take_profit: float,
        trades: List[Dict[str, Any]],
        trailing_stop_levels: Dict[str, float],
        highest_prices: Dict[str, float],
        current_portfolio_value: float,
    ) -> tuple[float, Dict[str, float], Dict[str, float], bool, List[Dict[str, Any]]]:
        """
        1つの期間における注文を執行します。

        Args:
            signal (Union[int, Order]): シグナル (整数またはOrderオブジェクト)
            holdings (Dict[str, float]): 現在の保有銘柄
            entry_prices (Dict[str, float]): 保有銘柄の平均取得価格
            cash (float): 現在の現金残高
            exec_price (float): 注文執行価格
            ticker (str): 対象銘柄コード
            today_high (float): 今日の最高値
            today_low (float): 今日の最安値
            aligned_data (Dict[str, pd.DataFrame]): 整列化された価格データ
            trailing_stop (Optional[float]): トレーリングストップ割合
            stop_loss (float): 損切割合
            take_profit (float): 利確割合
            trades (List[Dict[str, Any]]): 取引履歴
            trailing_stop_levels (Dict[str, float]): トレーリングストップ価格
            highest_prices (Dict[str, float]): 保有銘柄の最高価格
            current_portfolio_value (float): 現在の資産総額

        Returns:
            tuple: (更新された現金残高, 更新された保有銘柄, 更新された平均取得価格, 退出が執行されたか, 更新された取引履歴)
        """
        position = holdings[ticker]
        exit_executed = False

        # ポジションが存在する場合の損切・利確ロジック
        if position != 0:
            entry = entry_prices[ticker]
            # 最高価格更新 (ロングポジションのみ)
            if position > 0:
                highest_prices[ticker] = max(highest_prices[ticker], today_high)

                # トレーリングストップ価格更新
                if trailing_stop and trailing_stop > 0:
                    new_stop = highest_prices[ticker] * (1 - trailing_stop)
                    trailing_stop_levels[ticker] = max(trailing_stop_levels[ticker], new_stop)

                # トレーリングストップチェック
                if trailing_stop and trailing_stop_levels[ticker] > 0 and today_low <= trailing_stop_levels[ticker]:
                    trades.append(
                        {
                            "ticker": ticker,
                            "entry_date": None,
                            "exit_date": None,  # この関数外で設定
                            "entry_price": entry,
                            "exit_price": trailing_stop_levels[ticker],
                            "return": (trailing_stop_levels[ticker] - entry) / entry,
                            "type": "Long",
                            "reason": "Trailing Stop",
                        }
                    )
                    cash += holdings[ticker] * trailing_stop_levels[ticker]
                    holdings[ticker] = 0.0
                    entry_prices[ticker] = 0.0
                    trailing_stop_levels[ticker] = 0.0
                    highest_prices[ticker] = 0.0
                    exit_executed = True
                    return cash, holdings, entry_prices, exit_executed, trades

            # 利確チェック
            if take_profit and (
                (position > 0 and (today_high - entry) / entry >= take_profit)
                or (position < 0 and (entry - today_low) / entry >= take_profit)
            ):
                take_profit_price = entry * (1 + take_profit) if position > 0 else entry * (1 - take_profit)
                trades.append(
                    {
                        "ticker": ticker,
                        "entry_date": None,
                        "exit_date": None,  # この関数外で設定
                        "entry_price": entry,
                        "exit_price": take_profit_price,
                        "return": take_profit if position > 0 else -take_profit,
                        "type": "Long" if position > 0 else "Short",
                        "reason": "Take Profit",
                    }
                )
                cash += (
                    holdings[ticker] * take_profit_price
                    if position > 0
                    else (entry - take_profit_price) * abs(holdings[ticker])
                )
                holdings[ticker] = 0.0
                entry_prices[ticker] = 0.0
                trailing_stop_levels[ticker] = 0.0
                highest_prices[ticker] = 0.0
                exit_executed = True
                return cash, holdings, entry_prices, exit_executed, trades

            # 損切チェック
            if stop_loss and (
                (position > 0 and (entry - today_low) / entry >= stop_loss)
                or (position < 0 and (today_high - entry) / entry >= stop_loss)
            ):
                stop_price = entry * (1 - stop_loss) if position > 0 else entry * (1 + stop_loss)
                trades.append(
                    {
                        "ticker": ticker,
                        "entry_date": None,
                        "exit_date": None,  # この関数外で設定
                        "entry_price": entry,
                        "exit_price": stop_price,
                        "return": -stop_loss if position > 0 else stop_loss,
                        "type": "Long" if position > 0 else "Short",
                        "reason": "Stop Loss",
                    }
                )
                cash += holdings[ticker] * stop_price if position > 0 else (entry - stop_price) * abs(holdings[ticker])
                holdings[ticker] = 0.0
                entry_prices[ticker] = 0.0
                trailing_stop_levels[ticker] = 0.0
                highest_prices[ticker] = 0.0
                exit_executed = True
                return cash, holdings, entry_prices, exit_executed, trades

        # 退出ロジック (整数信号)
        if isinstance(signal, (int, np.integer)):
            if position > 0 and signal == -1:  # ロングポジションをクローズ
                entry = entry_prices[ticker]
                ret = (exec_price - entry) / entry
                trades.append(
                    {
                        "ticker": ticker,
                        "entry_date": None,
                        "exit_date": None,  # この関数外で設定
                        "entry_price": entry,
                        "exit_price": exec_price,
                        "return": ret,
                        "type": "Long",
                    }
                )
                cash += holdings[ticker] * exec_price
                holdings[ticker] = 0.0
                entry_prices[ticker] = 0.0
                exit_executed = True
            elif position < 0 and signal == 1:  # ショートポジションをクローズ
                entry = entry_prices[ticker]
                ret = (entry - exec_price) / entry
                trades.append(
                    {
                        "ticker": ticker,
                        "entry_date": None,
                        "exit_date": None,  # この関数外で設定
                        "entry_price": entry,
                        "exit_price": exec_price,
                        "return": ret,
                        "type": "Short",
                    }
                )
                cash += (entry - exec_price) * abs(holdings[ticker])
                holdings[ticker] = 0.0
                entry_prices[ticker] = 0.0
                exit_executed = True

        # 注文オブジェクトロジック
        if isinstance(signal, Order):
            should_execute = False
            fill_price = exec_price

            if signal.type == OrderType.MARKET:
                should_execute = True
            elif signal.type == OrderType.LIMIT:
                if signal.action.upper() == "BUY":
                    if today_low <= signal.price:
                        should_execute = True
                        fill_price = min(signal.price, exec_price)
                else:  # SELL
                    if today_high >= signal.price:
                        should_execute = True
                        fill_price = max(signal.price, exec_price)
            elif signal.type == OrderType.STOP:
                if signal.action.upper() == "BUY":
                    if today_high >= signal.price:
                        should_execute = True
                        fill_price = max(signal.price, exec_price)
                else:  # SELL
                    if today_low <= signal.price:
                        should_execute = True
                        fill_price = min(signal.price, exec_price)

            if should_execute:
                if signal.action.upper() == "BUY":
                    if holdings[ticker] == 0:
                        qty = self._size_position(ticker, current_portfolio_value, fill_price)
                        holdings[ticker] = qty
                        entry_prices[ticker] = fill_price
                        cash -= qty * fill_price
                        # トレーリングストップ追跡の初期化
                        highest_prices[ticker] = fill_price
                        if trailing_stop and trailing_stop > 0:
                            trailing_stop_levels[ticker] = fill_price * (1 - trailing_stop)
                elif signal.action.upper() == "SELL":
                    if holdings[ticker] != 0:
                        entry = entry_prices[ticker]
                        if holdings[ticker] > 0:
                            ret = (fill_price - entry) / entry
                            trade_type = "Long"
                        else:
                            ret = (entry - fill_price) / entry
                            trade_type = "Short"
                        trades.append(
                            {
                                "ticker": ticker,
                                "entry_date": None,
                                "exit_date": None,  # 関数外で設定
                                "entry_price": entry,
                                "exit_price": fill_price,
                                "return": ret,
                                "type": trade_type,
                            }
                        )
                        cash += (
                            holdings[ticker] * fill_price
                            if holdings[ticker] > 0
                            else (entry - fill_price) * abs(holdings[ticker])
                        )
                        holdings[ticker] = 0.0
                        entry_prices[ticker] = 0.0
                        exit_executed = True

        # 新規ポジション (整数信号)
        if not exit_executed and isinstance(signal, (int, np.integer)):
            if holdings[ticker] == 0 and signal == 1:
                # ロングポジションオープン
                shares = self._size_position(ticker, current_portfolio_value, exec_price)
                holdings[ticker] = shares
                entry_prices[ticker] = exec_price
                cash -= shares * exec_price
                # トレーリングストップ追跡の初期化
                highest_prices[ticker] = exec_price
                if trailing_stop and trailing_stop > 0:
                    trailing_stop_levels[ticker] = exec_price * (1 - trailing_stop)
            elif holdings[ticker] == 0 and signal == -1 and self.allow_short:
                # ショートポジションオープン
                shares = self._size_position(ticker, current_portfolio_value, exec_price)
                holdings[ticker] = -shares
                entry_prices[ticker] = exec_price
                # ショートエントリーでは現金は変化しない（マージンモデル）

        return cash, holdings, entry_prices, exit_executed, trades

    def _size_position(self, ticker: str, portfolio_value: float, exec_price: float) -> float:
        """Calculate number of shares for a new position."""
        # This is a simplified method; in practice, it might use self.position_size
        # which could be a float or a dict per ticker like in the original Backtester.
        # For now, we'll assume 10% allocation per trade.
        alloc = 0.1
        target_amount = portfolio_value * alloc
        return target_amount / exec_price if exec_price != 0 else 0.0
