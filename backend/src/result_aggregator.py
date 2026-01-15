"""結果集計モジュール

このモジュールは、トレードシミュレーションの結果を集計して分析可能な形に整形する機能を提供します。
計算と集計を分離することで、単一責任の原則を適用します。
"""

from typing import Any, Dict, List

import pandas as pd


class ResultAggregator:
    """シミュレーション結果を集計するクラス（単一責任：結果の集計と整形）"""

    def __init__(self):
        pass

    def aggregate_trades(self, trades: List[Dict[str, Any]]) -> pd.DataFrame:
        """取引記録を集計してDataFrameとして返す

        Args:
            trades (List[Dict[str, Any]]): 取引記録のリスト

        Returns:
            pd.DataFrame: 取引記録のDataFrame
        """
        if not trades:
            return pd.DataFrame()

        # データフレームに変換
        df = pd.DataFrame(trades)

        # 日付列を日時型に変換
        if "exit_date" in df.columns:
            df["exit_date"] = pd.to_datetime(df["exit_date"])

        # 利益率の基本統計
        if "return" in df.columns:
            df["return_pct"] = df["return"] * 100

        return df

    def aggregate_position_history(self, position_history: List[int], date_index: pd.DatetimeIndex) -> pd.DataFrame:
        """ポジション履歴を集計

        Args:
            position_history (List[int]): ポジション履歴のリスト
            date_index (pd.DatetimeIndex): 日付インデックス

        Returns:
            pd.DataFrame: ポジション履歴のDataFrame
        """
        if not position_history or len(position_history) != len(date_index):
            return pd.DataFrame()

        df = pd.DataFrame({"position": position_history}, index=date_index)

        # ポジションの基本統計
        df["position_change"] = df["position"].diff()
        df["long_count"] = (df["position"] == 1).cumsum()
        df["short_count"] = (df["position"] == -1).cumsum()
        df["flat_count"] = (df["position"] == 0).cumsum()

        return df

    def aggregate_portfolio_history(
        self,
        portfolio_values: List[float],
        date_index: pd.DatetimeIndex,
        initial_capital: float,
    ) -> pd.DataFrame:
        """ポートフォリオ履歴を集計

        Args:
            portfolio_values (List[float]): ポートフォリオ価値のリスト
            date_index (pd.DatetimeIndex): 日付インデックス
            initial_capital (float): 初期資本

        Returns:
            pd.DataFrame: ポートフォリオ履歴のDataFrame
        """
        if not portfolio_values or len(portfolio_values) != len(date_index):
            return pd.DataFrame()

        df = pd.DataFrame({"portfolio_value": portfolio_values}, index=date_index)

        # リーターン計算
        df["daily_return"] = df["portfolio_value"].pct_change()
        df["cumulative_return"] = (df["portfolio_value"] - initial_capital) / initial_capital

        # 最高値、最低値、ドローダン
        df["rolling_max"] = df["portfolio_value"].expanding().max()
        df["rolling_min"] = df["portfolio_value"].expanding().min()
        df["drawdown"] = (df["portfolio_value"] - df["rolling_max"]) / df["rolling_max"]

        return df

    def aggregate_signal_statistics(self, signals: Dict[str, pd.Series], ticker: str = None) -> Dict[str, int]:
        """シグナルの統計を集計

        Args:
            signals (Dict[str, pd.Series]): 銘柄とシグナルの辞書
            ticker (str): 分析対象の銘柄（Noneの場合、すべてを集計）

        Returns:
            Dict[str, int]: シグナル統計の辞書
        """
        if ticker:
            if ticker not in signals:
                return {}
            signal_series = signals[ticker]
        else:
            # すべてのシグナルを連結
            signal_series = pd.concat(signals.values(), ignore_index=True)

        if signal_series.empty:
            return {}

        # シグナル数をカウント
        signal_counts = {
            "total_signals": len(signal_series),
            "buy_signals": (signal_series == 1).sum(),
            "sell_signals": (signal_series == -1).sum(),
            "neutral_signals": (signal_series == 0).sum(),
            "non_neutral_signals": (signal_series != 0).sum(),
        }

        return signal_counts

    def generate_summary_report(
        self,
        initial_capital: float,
        final_capital: float,
        trades_df: pd.DataFrame,
        portfolio_df: pd.DataFrame,
        position_df: pd.DataFrame,
        signals_stats: Dict[str, int] = None,
    ) -> Dict[str, Any]:
        """要約レポートを生成

        Args:
            initial_capital (float): 初期資本
            final_capital (float): 終了時資本
            trades_df (pd.DataFrame): 取引記録のDataFrame
            portfolio_df (pd.DataFrame): ポートフォリオ履歴のDataFrame
            position_df (pd.DataFrame): ポジション履歴のDataFrame
            signals_stats (Dict[str, int]): シグナル統計

        Returns:
            Dict[str, Any]: 要約レポート
        """
        total_return = (final_capital - initial_capital) / initial_capital

        # 取引統計
        trade_stats = {
            "total_trades": len(trades_df),
            "winning_trades": (trades_df["return"] > 0).sum() if "return" in trades_df.columns else 0,
            "losing_trades": (trades_df["return"] < 0).sum() if "return" in trades_df.columns else 0,
            "break_even_trades": (trades_df["return"] == 0).sum() if "return" in trades_df.columns else 0,
        }

        if trade_stats["total_trades"] > 0:
            trade_stats["win_rate"] = trade_stats["winning_trades"] / trade_stats["total_trades"]
        else:
            trade_stats["win_rate"] = 0.0

        # プラットフォーム統計
        portfolio_stats = {
            "final_value": final_capital,
            "total_return_pct": total_return * 100,
            "max_portfolio_value": (
                portfolio_df["portfolio_value"].max() if "portfolio_value" in portfolio_df.columns else 0.0
            ),
            "min_portfolio_value": (
                portfolio_df["portfolio_value"].min() if "portfolio_value" in portfolio_df.columns else 0.0
            ),
            "max_drawdown": portfolio_df["drawdown"].min() if "drawdown" in portfolio_df.columns else 0.0,
        }

        # ポジション統計
        position_stats = {
            "total_days": len(position_df) if not position_df.empty else 0,
            "long_days": (position_df["position"] == 1).sum() if "position" in position_df.columns else 0,
            "short_days": (position_df["position"] == -1).sum() if "position" in position_df.columns else 0,
            "flat_days": (position_df["position"] == 0).sum() if "position" in position_df.columns else 0,
        }

        return {
            "capital": {
                "initial": initial_capital,
                "final": final_capital,
                "total_return": total_return,
            },
            "trades": trade_stats,
            "portfolio": portfolio_stats,
            "positions": position_stats,
            "signals": signals_stats or {},
        }

    def create_equity_curve(
        self,
        portfolio_values: List[float],
        date_index: pd.DatetimeIndex,
        initial_capital: float,
    ) -> pd.Series:
        """equity curve を作成

        Args:
            portfolio_values (List[float]): ポートフォリオ価値のリスト
            date_index (pd.DatetimeIndex): 日付インデックス
            initial_capital (float): 初期資本

        Returns:
            pd.Series: クィティカーブ
        """
        if not portfolio_values or len(portfolio_values) != len(date_index):
            return pd.Series(dtype=float)

        equity_curve = pd.Series(portfolio_values, index=date_index)

        # 初期化して相対値に変換
        normalized_equity = equity_curve / initial_capital

        return normalized_equity
