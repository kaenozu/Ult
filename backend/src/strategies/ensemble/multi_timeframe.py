import logging

import pandas as pd

from ...multi_timeframe import MultiTimeframeAnalyzer

from ..base import Strategy
from .combined import CombinedStrategy

logger = logging.getLogger(__name__)


class MultiTimeframeStrategy(Strategy):
    """
    マルチタイムフレーム戦略 (Phase 21)

    週足のトレンド（SMA20 > SMA50）をフィルターとして使用し、
    「大きな波（週足）」に乗る形でのみ、「小さな波（日足）」のエントリーを許可します。
    """

    def __init__(self, base_strategy: Strategy = None, trend_period: int = 200) -> None:
        super().__init__("Multi-Timeframe", trend_period)
        # ベース戦略は CombinedStrategy (RSI + BB) をデフォルトとする
        self.base_strategy = base_strategy if base_strategy else CombinedStrategy()
        self.mtf_analyzer = MultiTimeframeAnalyzer()

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty:
            return pd.Series(dtype=int)

        try:
            # 1. ベース戦略（日足）でシグナル生成
            base_signals = self.base_strategy.generate_signals(df)

            # 2. 週足データを生成・分析
            # resample_data は 'W-FRI' (金曜締め) を想定
            weekly_df = self.mtf_analyzer.resample_data(df, "W-FRI")

            if len(weekly_df) < 50:
                logger.warning(f"週足データ不足 ({len(weekly_df)} weeks)。MTFフィルタをスキップします。")
                return base_signals

            # 週足トレンド判定: SMA20 > SMA50 => 上昇トレンド
            weekly_df["SMA_20"] = weekly_df["Close"].rolling(window=20).mean()
            weekly_df["SMA_50"] = weekly_df["Close"].rolling(window=50).mean()

            weekly_df["Weekly_Trend"] = 0
            # 上昇トレンド定義: 短期 > 長期 かつ 価格 > 短期 (強い上昇)
            weekly_df.loc[(weekly_df["SMA_20"] > weekly_df["SMA_50"]), "Weekly_Trend"] = 1
            weekly_df.loc[(weekly_df["SMA_20"] < weekly_df["SMA_50"]), "Weekly_Trend"] = -1

            # 3. 週足トレンドを日足にマッピング (ffill)
            # reindex で日足の日付に合わせ、直前の週足の状態を維持(ffill)
            weekly_trend_map = weekly_df["Weekly_Trend"].reindex(df.index, method="ffill").fillna(0)

            # 4. シグナルフィルタリング
            final_signals = base_signals.copy()

            # BUYフィルタ: 週足が上昇(1)でない場合、BUYシグナル(1)を消去
            final_signals[(final_signals == 1) & (weekly_trend_map != 1)] = 0

            # SELLフィルタ: 週足が下降(-1)でない場合、SELLシグナル(-1)を消去
            # (ただし、利確売りなどは保持したいかもしれないが、ここではトレンドフォローのエントリー制限とする)
            # 純粋なトレンドフォローなら、「下降トレンド中の売りのみ許可」
            final_signals[(final_signals == -1) & (weekly_trend_map != -1)] = 0

            return final_signals

        except Exception as e:
            logger.error(f"MTF Strategy Error: {e}")
            # エラー時は安全のためシグナルなし
            return pd.Series(0, index=df.index)

    def get_signal_explanation(self, signal: int) -> str:
        base_expl = self.base_strategy.get_signal_explanation(signal)
        if signal == 1:
            return f"{base_expl} 【MTF確認済】 週足も上昇トレンドであり、長期的な追い風があります。"
        elif signal == -1:
            return f"{base_expl} 【MTF確認済】 週足も下降トレンドであり、長期的な下落圧力があります。"
        return base_expl
