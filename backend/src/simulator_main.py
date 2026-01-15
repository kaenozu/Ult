"""トレードシミュレーションメインモジュール

このモジュールは、TradeSimulatorCoreを拡張し、実際のシミュレーションロジックを実装します。
"""

from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from src.strategies import Order, OrderType, Strategy

from .simulator_core import TradeSimulatorCore


class TradeSimulator(TradeSimulatorCore):
    """取引シミュレーションを実行するクラス（単一責任：取引シミュレーションの実行）"""

    def run_simulation(
        self,
        data: Dict[str, pd.DataFrame],
        strategy_map: Dict[str, Strategy],
        stop_loss: float = 0.05,
        take_profit: float = 0.1,
        trailing_stop: Optional[float] = None,
    ) -> Dict[str, Any]:
        """シミュレーションを実行

        Args:
            data: 銘柄名と価格データの辞書
            strategy_map: 銘柄名と戦略の辞書
            stop_loss: 損切り割合
            take_profit: 利確割合
            trailing_stop: トレーリングストップ割合

        Returns:
            シミュレーション結果
        """
        # 生成シグナル（整数またはOrderオブジェクト）
        signals_map = self._generate_signals(data, strategy_map)

        # 統一インデックス作成
        all_dates = sorted(set().union(*[df.index for df in data.values() if df is not None]))
        full_index = pd.DatetimeIndex(all_dates)

        # 初期化
        cash = self.initial_capital
        holdings: Dict[str, float] = {t: 0.0 for t in data}
        self.entry_prices: Dict[str, float] = {t: 0.0 for t in data}  # インスタンス変数として定義
        trades: List[Dict[str, Any]] = []
        portfolio_value_history: List[float] = []
        position_history: List[int] = []
        trailing_stop_levels: Dict[str, float] = {t: 0.0 for t in data}
        highest_prices: Dict[str, float] = {t: 0.0 for t in data}

        # データ整列
        aligned_data: Dict[str, pd.DataFrame] = {}
        for ticker, df in data.items():
            aligned = df.reindex(full_index).ffill()
            aligned["Signal"] = signals_map.get(ticker, pd.Series(0, index=df.index)).reindex(full_index).fillna(0)
            aligned_data[ticker] = aligned

        # メミュレーションループ
        for i in range(len(full_index) - 1):
            # ポ場価値計算
            current_portfolio_value = self._calculate_portfolio_value(cash, holdings, aligned_data, i, final_calc=False)

            for ticker, df in aligned_data.items():
                today_sig = df["Signal"].iloc[i]
                exec_price = df["Open"].iloc[i + 1]
                position = holdings[ticker]
                exit_executed = False
                today_high = df["High"].iloc[i]
                today_low = df["Low"].iloc[i]

                # 損切・利確・トレーリングストップチェック
                if position != 0:
                    entry = self.entry_prices[ticker]
                    # 最高値更新
                    if position > 0:  # ロンポジション
                        highest_prices[ticker] = max(highest_prices[ticker], today_high)

                        # トレーピングストップ更新
                        if trailing_stop and trailing_stop > 0:
                            new_stop = highest_prices[ticker] * (1 - trailing_stop)
                            trailing_stop_levels[ticker] = max(trailing_stop_levels[ticker], new_stop)

                        # トレーピングストップ
                        if trailing_stop and trailing_stop > 0 and today_low <= trailing_stop_levels[ticker]:
                            trades.append(
                                self._create_trade_record(
                                    ticker,
                                    "Trailing Stop",
                                    entry,
                                    trailing_stop_levels[ticker],
                                    "Long",
                                    full_index[i],
                                )
                            )
                            cash += holdings[ticker] * trailing_stop_levels[ticker]
                            holdings[ticker] = 0.0
                            self.entry_prices[ticker] = 0.0
                            trailing_stop_levels[ticker] = 0.0
                            highest_prices[ticker] = 0.0
                            exit_executed = True
                            continue

                        # 利確
                        elif take_profit and (today_high - entry) / entry >= take_profit:
                            take_profit_price = entry * (1 + take_profit)
                            trades.append(
                                self._create_trade_record(
                                    ticker,
                                    "Take Profit",
                                    entry,
                                    take_profit_price,
                                    "Long",
                                    full_index[i],
                                )
                            )
                            cash += holdings[ticker] * take_profit_price
                            holdings[ticker] = 0.0
                            self.entry_prices[ticker] = 0.0
                            trailing_stop_levels[ticker] = 0.0
                            highest_prices[ticker] = 0.0
                            exit_executed = True
                            continue

                        # 損切
                        elif stop_loss and (entry - today_low) / entry >= stop_loss:
                            stop_price = entry * (1 - stop_loss)
                            trades.append(
                                self._create_trade_record(
                                    ticker,
                                    "Stop Loss",
                                    entry,
                                    stop_price,
                                    "Long",
                                    full_index[i],
                                )
                            )
                            cash += holdings[ticker] * stop_price
                            holdings[ticker] = 0.0
                            self.entry_prices[ticker] = 0.0
                            trailing_stop_levels[ticker] = 0.0
                            highest_prices[ticker] = 0.0
                            exit_executed = True
                            continue

                # 整数信号ロジック
                if isinstance(today_sig, (int, np.integer)):
                    position, cash, exit_executed = self._process_integer_signals(
                        today_sig,
                        ticker,
                        holdings,
                        cash,
                        exec_price,
                        trades,
                        exit_executed,
                        full_index,
                        i,
                    )

                # Orderオブジェクトロジック
                if isinstance(today_sig, Order):
                    (
                        holdings,
                        cash,
                        self.entry_prices,
                        exit_executed,
                    ) = self._process_order_signals(
                        today_sig,
                        ticker,
                        holdings,
                        cash,
                        current_portfolio_value,
                        df,
                        trailing_stop,
                        highest_prices,
                        trailing_stop_levels,
                        exit_executed,
                        exec_price,
                        trades,
                        full_index,
                        i,
                    )

                # 整数信号による新規ポジション
                if not exit_executed and isinstance(today_sig, (int, np.integer)):
                    (
                        holdings,
                        cash,
                        self.entry_prices,
                        highest_prices,
                        trailing_stop_levels,
                    ) = self._process_new_positions(
                        today_sig,
                        ticker,
                        holdings,
                        cash,
                        exec_price,
                        current_portfolio_value,
                        highest_prices,
                        trailing_stop,
                        trailing_stop_levels,
                    )

            # ポ場総額計算
            end_of_day_value = self._calculate_portfolio_value(cash, holdings, aligned_data, i, final_calc=True)
            portfolio_value_history.append(end_of_day_value)

            # ポジション履歴
            position_state = self._get_position_state(holdings)
            position_history.append(position_state)

        # 終値評価
        final_portfolio_value = self._calculate_portfolio_value(
            cash, holdings, aligned_data, len(full_index) - 1, final_calc=True
        )

        return {
            "signals": signals_map,
            "trades": trades,
            "portfolio_value_history": portfolio_value_history,
            "position_history": position_history,
            "final_value": final_portfolio_value,
            "holdings": holdings,
        }

    def _generate_signals(self, data, strategy_map):
        """シグナル生成"""
        signals_map = {}
        for ticker, df in data.items():
            if df is None or df.empty:
                continue
            strat = strategy_map.get(ticker)
            if strat:
                signals_map[ticker] = strat.generate_signals(df)
            else:
                signals_map[ticker] = pd.Series(0, index=df.index)
        return signals_map

    def _process_integer_signals(
        self,
        today_sig,
        ticker,
        holdings,
        cash,
        exec_price,
        trades,
        exit_executed,
        full_index,
        i,
    ):
        """整数信号の処理"""
        position = holdings[ticker]
        exit_date = full_index[i + 1]

        if position > 0 and today_sig == -1:  # ロングポジションをクローズ
            entry = self.entry_prices[ticker]
            ret = (exec_price - entry) / entry
            trades.append(
                {
                    "ticker": ticker,
                    "entry_date": None,
                    "exit_date": exit_date,
                    "entry_price": entry,
                    "exit_price": exec_price,
                    "return": ret,
                    "type": "Long",
                }
            )
            cash += holdings[ticker] * exec_price
            holdings[ticker] = 0.0
            self.entry_prices[ticker] = 0.0
            exit_executed = True
        elif position < 0 and today_sig == 1:  # ショートポジションをクローズ
            entry = self.entry_prices[ticker]
            ret = (entry - exec_price) / entry
            trades.append(
                {
                    "ticker": ticker,
                    "entry_date": None,
                    "exit_date": exit_date,
                    "entry_price": entry,
                    "exit_price": exec_price,
                    "return": ret,
                    "type": "Short",
                }
            )
            cash += (entry - exec_price) * abs(holdings[ticker])
            holdings[ticker] = 0.0
            self.entry_prices[ticker] = 0.0
            exit_executed = True
        return holdings, cash, exit_executed

    def _process_order_signals(
        self,
        today_sig,
        ticker,
        holdings,
        cash,
        current_portfolio_value,
        df,
        trailing_stop,
        highest_prices,
        trailing_stop_levels,
        exit_executed,
        exec_price,
        trades,
        full_index,
        i,
    ):
        """Orderオブジェクト信号の処理"""
        if not today_sig.ticker:
            today_sig.ticker = ticker

        should_execute = False
        fill_price = exec_price
        next_idx = min(i + 1, len(df) - 1)

        if today_sig.type == OrderType.MARKET:
            should_execute = True
        elif today_sig.type == OrderType.LIMIT:
            if today_sig.action.upper() == "BUY":
                if df["Low"].iloc[next_idx] <= today_sig.price:
                    should_execute = True
                    fill_price = min(today_sig.price, exec_price)
            else:  # SELL
                if df["High"].iloc[next_idx] >= today_sig.price:
                    should_execute = True
                    fill_price = max(today_sig.price, exec_price)
        elif today_sig.type == OrderType.STOP:
            if today_sig.action.upper() == "BUY":
                if df["High"].iloc[next_idx] >= today_sig.price:
                    should_execute = True
                    fill_price = max(today_sig.price, exec_price)
            else:  # SELL
                if df["Low"].iloc[next_idx] <= today_sig.price:
                    should_execute = True
                    fill_price = min(today_sig.price, exec_price)

        if should_execute:
            if today_sig.action.upper() == "BUY":
                if holdings[ticker] == 0:
                    qty = (
                        today_sig.quantity
                        if today_sig.quantity
                        else self._size_position(ticker, current_portfolio_value, fill_price)
                    )
                    holdings[ticker] = qty
                    self.entry_prices[ticker] = fill_price
                    highest_prices[ticker] = fill_price
                    if trailing_stop and trailing_stop > 0:
                        trailing_stop_levels[ticker] = fill_price * (1 - trailing_stop)
            elif today_sig.action.upper() == "SELL":
                if holdings[ticker] != 0:
                    entry = self.entry_prices[ticker]
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
                            "exit_date": full_index[i + 1],
                            "entry_price": entry,
                            "exit_price": fill_price,
                            "return": ret,
                            "type": trade_type,
                        }
                    )
                    holdings[ticker] = 0.0
                    self.entry_prices[ticker] = 0.0
                    exit_executed = True

        return holdings, cash, self.entry_prices, exit_executed

    def _process_new_positions(
        self,
        today_sig,
        ticker,
        holdings,
        cash,
        exec_price,
        current_portfolio_value,
        highest_prices,
        trailing_stop,
        trailing_stop_levels,
    ):
        """新規ポジション処理"""
        if holdings[ticker] == 0 and today_sig == 1:
            # ポンポジションオープン
            shares = self._size_position(ticker, current_portfolio_value, exec_price)
            holdings[ticker] = shares
            self.entry_prices[ticker] = exec_price
            cash -= shares * exec_price
            highest_prices[ticker] = exec_price
            if trailing_stop and trailing_stop > 0:
                trailing_stop_levels[ticker] = exec_price * (1 - trailing_stop)
        elif holdings[ticker] == 0 and today_sig == -1 and self.allow_short:
            # ショートポジションオープン
            shares = self._size_position(ticker, current_portfolio_value, exec_price)
            holdings[ticker] = -shares
            self.entry_prices[ticker] = exec_price
        return holdings, cash, self.entry_prices, highest_prices, trailing_stop_levels
