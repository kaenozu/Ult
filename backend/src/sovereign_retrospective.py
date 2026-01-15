import logging
import sqlite3
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class SovereignRetrospective:
    """
    Sovereign Retrospective: 過去の取引パフォーマンスを分析し、
    失敗パターン（ドローダウンの原因など）を特定して、次世代エージェントへの報酬関数に反映させる。
    """

    def __init__(self, db_path: str = "data/agstock.db"):
        self.db_path = db_path
        self.insights = {}

    def analyze_2025_failures(self) -> Dict:
        """2025年の取引ログを分析し、主な損失原因を特定する。"""
        try:
            conn = sqlite3.connect(self.db_path)
            # 2025年の負けトレードを抽出
            query = """
                SELECT * FROM trade_logs 
                WHERE pnl < 0 
                AND timestamp LIKE '2025-%'
            """
            failed_trades = pd.read_sql_query(query, conn)
            conn.close()

            if failed_trades.empty:
                logger.info("No failed trades found for 2025 retrospective.")
                return {"status": "Impeccable", "penalty_multiplier": 1.0}

            # 失敗パターンの分析（簡易版）
            # 例: 損切りが遅れた（PnLが非常に大きい負の値）
            deep_losses = failed_trades[failed_trades["pnl"] < failed_trades["pnl"].mean()]

            # ボラティリティとの相関（本来は yfinance 等で当時のボラを見るが、ここではシミュレーション）
            num_deep_losses = len(deep_losses)

            # 報酬関数のバイアス係数を動的に決定
            # 負けトレードが多いほど、負の報酬（ペナルティ）を強化する
            penalty_multiplier = 1.0 + (num_deep_losses * 0.05)

            self.insights = {
                "failed_trade_count": len(failed_trades),
                "deep_loss_count": num_deep_losses,
                "penalty_multiplier": min(penalty_multiplier, 2.5),  # 最大2.5倍まで
                "focus_area": "Stop-loss Tightening" if num_deep_losses > 5 else "Market Regime Adaptation",
            }

            logger.info(f"Sovereign Retrospective complete: {self.insights}")
            return self.insights

        except Exception as e:
            logger.error(f"Error during retrospective analysis: {e}")
            return {"penalty_multiplier": 1.0, "status": "Error"}

    def get_reward_bias(self, state_info: Dict) -> float:
        """
        特定の状態（例: 高ボラティリティ）において、
        過去の失敗に基づいた追加の報酬/ペナルティを計算する。
        """
        if not self.insights:
            self.analyze_2025_failures()

        bias = 0.0
        # 過去に大きな損失を出している場合、含み損(PnL)に対するペナルティを倍増させる
        if self.insights.get("penalty_multiplier", 1.0) > 1.2:
            current_pnl = state_info.get("pnl_ratio", 0.0)
            if current_pnl < -0.02:  # 2%以上の含み損
                bias -= abs(current_pnl) * self.insights["penalty_multiplier"]

        return bias
