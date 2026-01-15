"""
MoE Strategy Wrapper
FullyAutomatedTraderからMoEシステムを利用するためのラッパークラス
"""

import logging

import pandas as pd

from src.moe_system import MixtureOfExperts

logger = logging.getLogger(__name__)


class MoEStrategy:
    """MoE戦略ラッパー"""

    def __init__(self):
        self.moe = MixtureOfExperts()
        self.last_decision = {}

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """
        MoEの判断を統合してシグナル系列を返す
        注意: FullyAutomatedTraderは pd.Series を期待しているが、MoEはスポット判断が得意。
        ここでは直近の判断のみを系列の最後に埋め込む形で互換性を保つ。
        """
        if df is None or df.empty:
            return pd.Series()

        try:
            # 1. MoEに判断を仰ぐ（直近）
            # ticker情報は渡せないのでダミー
            decision = self.moe.get_expert_signal(df, "UNKNOWN_TICKER")
            self.last_decision = decision

            # 2. シグナル系列作成
            signals = pd.Series(0, index=df.index)

            action = decision.get("action", "HOLD")
            val = 0
            if action == "BUY":
                val = 1
            elif action == "SELL":
                val = -1

            # 最後の行にシグナルを設定
            signals.iloc[-1] = val

            # デバッグログ
            # logger.info(f"MoE Wrapper Signal: {val} (Expert: {decision.get('expert')})")

            return signals

        except Exception as e:
            logger.error(f"MoE Strategy Wrapper Error: {e}")
            return pd.Series(0, index=df.index)

    def get_last_expert_info(self):
        """直近の専門家判断情報を返す（ログ出力用）"""
        return self.last_decision
