import sqlite3
from datetime import datetime, timedelta
from typing import Dict

import pandas as pd
import yfinance as yf
import streamlit as st
import sqlite3

# --- Cached Computation Functions ---


@st.cache_data(ttl=60)
def _cached_calculate_cumulative_pnl(db_path: str) -> pd.DataFrame:
    try:
        conn = sqlite3.connect(db_path)
        query = "SELECT date, ticker, action, quantity, price FROM orders ORDER BY date"
        orders = pd.read_sql_query(query, conn)
        conn.close()

        if orders.empty:
            return pd.DataFrame()

        orders["date"] = pd.to_datetime(orders["date"])
        cumulative_pnl = []
        positions = {}
        running_pnl = 0.0

        for _, row in orders.iterrows():
            ticker = row["ticker"]
            action = row["action"]
            quantity = row["quantity"]
            price = row["price"]

            if action == "BUY":
                if ticker not in positions:
                    positions[ticker] = []
                positions[ticker].append({"quantity": quantity, "price": price})
            elif action == "SELL" and ticker in positions:
                remaining_to_sell = quantity
                pnl = 0.0
                while remaining_to_sell > 0 and positions[ticker]:
                    buy_position = positions[ticker][0]
                    sell_qty = min(buy_position["quantity"], remaining_to_sell)
                    pnl += (price - buy_position["price"]) * sell_qty
                    buy_position["quantity"] -= sell_qty
                    remaining_to_sell -= sell_qty
                    if buy_position["quantity"] == 0:
                        positions[ticker].pop(0)
                running_pnl += pnl

            cumulative_pnl.append({"date": row["date"], "cumulative_pnl": running_pnl})

        df = pd.DataFrame(cumulative_pnl)
        return df.groupby("date").last().reset_index()
    except Exception as e:
        print(f"Error in cached PnL: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=60)
def _cached_strategy_performance(db_path: str) -> pd.DataFrame:
    try:
        conn = sqlite3.connect(db_path)
        # Check column existence
        cols = pd.read_sql_query("PRAGMA table_info(orders)", conn)
        if "strategy_name" not in cols["name"].values:
            conn.close()
            return pd.DataFrame()

        query = "SELECT strategy_name, action, quantity, price, ticker FROM orders WHERE strategy_name IS NOT NULL ORDER BY date"
        orders = pd.read_sql_query(query, conn)
        conn.close()

        if orders.empty:
            return pd.DataFrame()

        strategies = {}
        for strategy in orders["strategy_name"].unique():
            strategy_orders = orders[orders["strategy_name"] == strategy]
            positions = {}
            trades = []
            for _, row in strategy_orders.iterrows():
                ticker = row["ticker"]
                action = row["action"]
                quantity = row["quantity"]
                price = row["price"]

                if action == "BUY":
                    if ticker not in positions:
                        positions[ticker] = []
                    positions[ticker].append({"quantity": quantity, "price": price})
                elif action == "SELL" and ticker in positions:
                    remaining = quantity
                    while remaining > 0 and positions[ticker]:
                        buy_pos = positions[ticker][0]
                        sell_qty = min(buy_pos["quantity"], remaining)
                        profit_pct = ((price - buy_pos["price"]) / buy_pos["price"]) * 100
                        trades.append({"profit_pct": profit_pct, "win": profit_pct > 0})
                        buy_pos["quantity"] -= sell_qty
                        remaining -= sell_qty
                        if buy_pos["quantity"] == 0:
                            positions[ticker].pop(0)

            if trades:
                df_trades = pd.DataFrame(trades)
                strategies[strategy] = {
                    "trades": len(trades),
                    "win_rate": df_trades["win"].mean(),
                    "avg_profit": df_trades["profit_pct"].mean(),
                    "total_pnl": df_trades["profit_pct"].sum(),
                }

        return pd.DataFrame.from_dict(strategies, orient="index").reset_index().rename(columns={"index": "strategy"})
    except Exception as e:
        print(f"Error in cached strategy perf: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=60)
def _cached_ticker_performance(db_path: str) -> pd.DataFrame:
    try:
        conn = sqlite3.connect(db_path)
        orders = pd.read_sql_query("SELECT ticker, action, quantity, price FROM orders ORDER BY date", conn)
        conn.close()

        if orders.empty:
            return pd.DataFrame()

        tickers_performance = {}
        for ticker in orders["ticker"].unique():
            ticker_orders = orders[orders["ticker"] == ticker]
            positions = []
            trades = []
            for _, row in ticker_orders.iterrows():
                action = row["action"]
                qty = row["quantity"]
                price = row["price"]
                if action == "BUY":
                    positions.append({"quantity": qty, "price": price})
                elif action == "SELL":
                    rem = qty
                    while rem > 0 and positions:
                        buy = positions[0]
                        sold = min(buy["quantity"], rem)
                        profit_pct = ((price - buy["price"]) / buy["price"]) * 100
                        trades.append(profit_pct)
                        buy["quantity"] -= sold
                        rem -= sold
                        if buy["quantity"] == 0:
                            positions.pop(0)

            if trades:
                tickers_performance[ticker] = {
                    "trades": len(trades),
                    "avg_profit": sum(trades) / len(trades),
                    "total_pnl": sum(trades),
                }
        return (
            pd.DataFrame.from_dict(tickers_performance, orient="index")
            .reset_index()
            .rename(columns={"index": "ticker"})
        )
    except Exception as e:
        print(f"Error in cached ticker perf: {e}")
        return pd.DataFrame()


class PerformanceAnalyzer:
    """
    Analyzes performance metrics from paper trading history.
    """

    def __init__(self, db_path: str = "paper_trading.db"):
        """
        Initialize Performance Analyzer.

        Args:
            db_path (str): Path to the SQLite database
        """
        self.db_path = db_path

    def _get_connection(self):
        """Get database connection."""
        return sqlite3.connect(self.db_path)

    def get_cumulative_pnl(self) -> pd.DataFrame:
        """
        Calculate cumulative P&L over time.

        Returns:
            pd.DataFrame: DataFrame with date and cumulative P/L
        """
        return _cached_calculate_cumulative_pnl(self.db_path)

    def get_strategy_performance(self) -> pd.DataFrame:
        """
        Get performance metrics by strategy.

        Returns:
            pd.DataFrame: Strategy performance metrics
        """
        return _cached_strategy_performance(self.db_path)

    def get_ticker_performance(self) -> pd.DataFrame:
        """
        Get performance metrics by ticker.

        Returns:
            pd.DataFrame: Ticker performance metrics
        """
        return _cached_ticker_performance(self.db_path)

    def get_monthly_returns(self) -> pd.DataFrame:
        """
        Calculate monthly returns.

        Returns:
            pd.DataFrame: Monthly return data
        """
        try:
            cumulative_pnl = self.get_cumulative_pnl()

            if cumulative_pnl.empty:
                return pd.DataFrame()

            cumulative_pnl["date"] = pd.to_datetime(cumulative_pnl["date"])
            cumulative_pnl["year"] = cumulative_pnl["date"].dt.year
            cumulative_pnl["month"] = cumulative_pnl["date"].dt.month

            # Get last value of each month
            monthly = cumulative_pnl.groupby(["year", "month"]).last().reset_index()

            # Calculate monthly returns
            monthly["monthly_return"] = monthly["cumulative_pnl"].diff()

            return monthly[["year", "month", "monthly_return"]]

        except Exception as e:
            print(f"Error calculating monthly returns: {e}")
            return pd.DataFrame()

    def compare_with_benchmark(self, benchmark_ticker: str = "^N225", days: int = 365) -> Dict:
        """
        Compare portfolio performance with a benchmark.

        Args:
            benchmark_ticker (str): Benchmark ticker symbol
            days (int): Number of days to compare

        Returns:
            dict: Comparison metrics
        """
        try:
            # Get portfolio cumulative P&L
            portfolio_pnl = self.get_cumulative_pnl()

            if portfolio_pnl.empty:
                return {}

            # Get benchmark data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            benchmark = yf.Ticker(benchmark_ticker)
            bench_hist = benchmark.history(start=start_date, end=end_date)

            if bench_hist.empty:
                return {}

            # Calculate benchmark returns (normalized to start at 0)
            bench_hist["benchmark_return"] = ((bench_hist["Close"] / bench_hist["Close"].iloc[0]) - 1) * 100
            bench_hist = bench_hist.reset_index()
            bench_hist["Date"] = pd.to_datetime(bench_hist["Date"])

            # Merge with portfolio data
            portfolio_pnl["date"] = pd.to_datetime(portfolio_pnl["date"])

            # Normalize portfolio P&L to percentage
            if len(portfolio_pnl) > 0:
                initial_capital = 1000000  # Assume 1M yen initial capital
                portfolio_pnl["portfolio_return"] = (portfolio_pnl["cumulative_pnl"] / initial_capital) * 100

            return {
                "portfolio": portfolio_pnl[["date", "portfolio_return"]].to_dict("records"),
                "benchmark": bench_hist[["Date", "benchmark_return"]]
                .rename(columns={"Date": "date"})
                .to_dict("records"),
            }

        except Exception as e:
            print(f"Error comparing with benchmark: {e}")
            return {}

    def get_daily_returns(self) -> pd.DataFrame:
        """
        Calculate daily returns from equity history.

        Returns:
            pd.DataFrame: DataFrame with date and daily_return columns
        """
        try:
            conn = self._get_connection()
            query = """
            SELECT date, total_equity
            FROM balance
            ORDER BY date
            """
            equity = pd.read_sql_query(query, conn, parse_dates=["date"])
            conn.close()

            if equity.empty or len(equity) < 2:
                return pd.DataFrame()

            # Calculate daily returns
            equity["daily_return"] = equity["total_equity"].pct_change() * 100
            equity["daily_pnl"] = equity["total_equity"].diff()

            return equity[["date", "daily_return", "daily_pnl"]].dropna()

        except Exception as e:
            print(f"Error calculating daily returns: {e}")
            return pd.DataFrame()

    def get_monthly_heatmap_data(self) -> pd.DataFrame:
        """
        Format data for monthly performance heatmap.

        Returns:
            pd.DataFrame: DataFrame with year, month, and monthly_return_pct
        """
        try:
            monthly = self.get_monthly_returns()

            if monthly.empty:
                return pd.DataFrame()

            # Convert to percentage
            monthly["monthly_return_pct"] = monthly["monthly_return"] / 10000  # Assuming returns are in basis points

            # Add month names for display
            month_names = {
                1: "1月",
                2: "2月",
                3: "3月",
                4: "4月",
                5: "5月",
                6: "6月",
                7: "7月",
                8: "8月",
                9: "9月",
                10: "10月",
                11: "11月",
                12: "12月",
            }
            monthly["month_name"] = monthly["month"].map(month_names)

            return monthly[["year", "month", "month_name", "monthly_return"]]

        except Exception as e:
            print(f"Error formatting heatmap data: {e}")
            return pd.DataFrame()

    def get_performance_summary(self) -> Dict:
        """
        Get overall performance summary statistics.

        Returns:
            dict: Summary metrics including win rate, best/worst month, total trades
        """
        try:
            conn = self._get_connection()

            # Total trades
            query_trades = "SELECT COUNT(*) as total_trades FROM orders"
            total_trades = pd.read_sql_query(query_trades, conn)["total_trades"].iloc[0]

            # Win rate (from closed positions)
            query_orders = "SELECT * FROM orders ORDER BY date"
            orders = pd.read_sql_query(query_orders, conn)

            conn.close()

            if orders.empty:
                return {
                    "total_trades": 0,
                    "win_rate": 0.0,
                    "best_month": None,
                    "worst_month": None,
                    "total_return": 0.0,
                }

            # Calculate win rate from realized trades
            positions = {}
            wins = 0
            losses = 0

            for _, row in orders.iterrows():
                ticker = row["ticker"]
                action = row["action"]
                quantity = row["quantity"]
                price = row["price"]

                if action == "BUY":
                    if ticker not in positions:
                        positions[ticker] = []
                    positions[ticker].append({"quantity": quantity, "price": price})

                elif action == "SELL" and ticker in positions:
                    remaining = quantity
                    while remaining > 0 and positions[ticker]:
                        buy_pos = positions[ticker][0]
                        sell_qty = min(buy_pos["quantity"], remaining)
                        profit = (price - buy_pos["price"]) * sell_qty

                        if profit > 0:
                            wins += 1
                        elif profit < 0:
                            losses += 1

                        buy_pos["quantity"] -= sell_qty
                        remaining -= sell_qty

                        if buy_pos["quantity"] == 0:
                            positions[ticker].pop(0)

            total_closed = wins + losses
            win_rate = (wins / total_closed * 100) if total_closed > 0 else 0.0

            # Monthly stats
            monthly = self.get_monthly_returns()
            best_month = None
            worst_month = None

            if not monthly.empty:
                best_idx = monthly["monthly_return"].idxmax()
                worst_idx = monthly["monthly_return"].idxmin()

                best_month = {
                    "year": int(monthly.loc[best_idx, "year"]),
                    "month": int(monthly.loc[best_idx, "month"]),
                    "return": float(monthly.loc[best_idx, "monthly_return"]),
                }

                worst_month = {
                    "year": int(monthly.loc[worst_idx, "year"]),
                    "month": int(monthly.loc[worst_idx, "month"]),
                    "return": float(monthly.loc[worst_idx, "monthly_return"]),
                }

            # Total return
            cumulative = self.get_cumulative_pnl()
            total_return = cumulative["cumulative_pnl"].iloc[-1] if not cumulative.empty else 0.0

            return {
                "total_trades": int(total_trades),
                "win_rate": win_rate,
                "best_month": best_month,
                "worst_month": worst_month,
                "total_return": total_return,
            }

        except Exception as e:
            print(f"Error calculating performance summary: {e}")
            return {"total_trades": 0, "win_rate": 0.0, "best_month": None, "worst_month": None, "total_return": 0.0}
