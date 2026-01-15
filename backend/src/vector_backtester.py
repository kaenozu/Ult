"""
Vectorized Backtester - 高速バックテストエンジン
Pandasのベクトル演算を活用し、ループ処理を排除した超高速バックテストを実現
"""

import logging
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class VectorizedBacktester:
    """ベクトル化バックテスター"""

    def __init__(self):
        pass

    def run_strategy(self, df: pd.DataFrame, params: Dict[str, float]) -> Dict[str, float]:
        """
        戦略パラメータに基づき高速バックテストを実行

        Args:
            df: 価格データ (Close, RSI, SMA_Short, SMA_Long 等を含むこと)
            params: 戦略パラメータ
                - rsi_buy_threshold: RSI買い閾値
                - rsi_sell_threshold: RSI売り閾値
                - sma_short_window: 短期移動平均期間
                - sma_long_window: 長期移動平均期間
                - stop_loss_pct: ストップロス (%)
                - take_profit_pct: 利確 (%)

        Returns:
            パフォーマンス指標 (Sharpe Ratio, Total Return)
        """
        try:
            # データコピー（元データを破壊しないため）  ただし速度重視なら参照渡し検討
            # ここでは安全のためコピー、ただし必要なカラムのみ
            data = df[["Close"]].copy()

            # 1. 指標計算 (ベクトル化)
            # SMAなどはパラメータ依存なのでここで計算
            sma_s = params.get("sma_short_window", 20)
            sma_l = params.get("sma_long_window", 50)

            # 移動平均計算 (rollingは比較的高速)
            data["SMA_S"] = data["Close"].rolling(int(sma_s)).mean()
            data["SMA_L"] = data["Close"].rolling(int(sma_l)).mean()

            # RSI計算 (ベクトル化) - 期間は固定(14)とするかパラメータ化するか
            # ここでは簡易RSI計算実装（Ta-Libなしで高速化）
            delta = data["Close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
            rs = gain / loss
            data["RSI"] = 100 - (100 / (1 + rs))
            data = data.fillna(0)

            # 2. シグナル生成 (ベクトル化)
            # Buy condition: SMA_S > SMA_L AND RSI < threshold
            buy_cond = (data["SMA_S"] > data["SMA_L"]) & (data["RSI"] < params.get("rsi_buy_threshold", 30))

            # Sell condition: SMA_S < SMA_L OR RSI > threshold
            sell_cond = (data["SMA_S"] < data["SMA_L"]) | (data["RSI"] > params.get("rsi_sell_threshold", 70))

            data["Signal"] = 0
            data.loc[buy_cond, "Signal"] = 1
            data.loc[sell_cond, "Signal"] = -1

            # ポジション保持ロジック (ベクトル化は難しい部分だが、shiftで簡易実装)
            # Signalが1のとき保有開始、-1のとき解消。
            # cumsumを使って現在のポジション状態を計算するのは単純すぎ（ドテンになる）
            # ここでは「翌日のリターン」にシグナルを掛ける簡易バックテストとする

            # ポジション: 直近の非ゼロシグナルを採用 (ffill) - 最初のシグナルが現れる前は0
            data["Position"] = data["Signal"].replace(0, np.nan).fillna(method="ffill").fillna(0)

            # 3. リターン計算
            data["Market_Ret"] = data["Close"].pct_change()
            data["Strategy_Ret"] = data["Market_Ret"] * data["Position"].shift(
                1
            )  # 前日のポジションで翌日のリターンを得る

            # コスト控除 (簡易: 0.1%)
            # 取引回数: Positionが変化した回数
            trades = data["Position"].diff().abs() > 0
            cost = trades * 0.001
            data["Strategy_Ret"] = data["Strategy_Ret"] - cost

            data["Wealth"] = (1 + data["Strategy_Ret"]).cumprod()

            # 4. パフォーマンス指標
            total_return = data["Wealth"].iloc[-1] - 1

            # Sharpe Ratio
            daily_ret = data["Strategy_Ret"].mean()
            daily_vol = data["Strategy_Ret"].std()

            if daily_vol == 0:
                sharpe = 0
            else:
                sharpe = (daily_ret / daily_vol) * np.sqrt(252)  # 年率換算

            return {
                "total_return": total_return,
                "sharpe_ratio": sharpe,
                "trades": trades.sum(),
            }

        except Exception:
            # logger.error(f"Backtest error: {e}")
            return {"total_return": -1.0, "sharpe_ratio": -1.0}


# シングルトン

_backtester = None


def get_vector_backtester() -> VectorizedBacktester:
    global _backtester
    if _backtester is None:
        _backtester = VectorizedBacktester()
    return _backtester
