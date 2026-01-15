"""
Consensus Engine for DAO-Ready Trading
複数ノードや複数戦略のシグナルから合意を形成するエンジン
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class ConsensusEngine:
    """
    複数ソースからのシグナルを統合し、最終的な意思決定を行う
    """

    def __init__(self, threshold: float = 0.6):
        self.threshold = threshold
        # ソースごとの信頼度ウェイト
        self.source_weights = {
            "local_quantum": 1.0,
            "peer_node_alpha": 0.8,
            "peer_node_beta": 0.7,
            "dao_collective": 1.2
        }

    def aggregate_signals(self, signals_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        異なるソースからのシグナルを統合し、コンセンサスが得られたものだけを抽出する
        """
        if not signals_list:
            return []

        # 銘柄ごとの投票箱
        ballot_box = {}

        for sig in signals_list:
            ticker = sig["ticker"]
            action = sig["action"]
            weight = self.source_weights.get(sig.get("source", "unknown"), 0.5)
            confidence = sig.get("confidence", 0.5)
            
            if ticker not in ballot_box:
                ballot_box[ticker] = {"BUY": 0.0, "SELL": 0.0, "details": []}
            
            vote_score = weight * confidence
            ballot_box[ticker][action] += vote_score
            ballot_box[ticker]["details"].append(sig)

        consensus_signals = []
        for ticker, votes in ballot_box.items():
            total_buy = votes["BUY"]
            total_sell = votes["SELL"]
            
            # コンセンサス判定 (BUY)
            if total_buy > self.threshold and total_buy > total_sell:
                # 代表的なシグナルを選択して詳細を引き継ぐ
                base_sig = max(votes["details"], key=lambda x: x.get("confidence", 0))
                consensus_sig = base_sig.copy()
                consensus_sig["confidence"] = min(1.0, total_buy / sum(self.source_weights.values()))
                consensus_sig["reason"] = f"DAO Consensus Reached (Score: {total_buy:.2f})"
                consensus_signals.append(consensus_sig)
                logger.info(f"✅ Consensus reached for {ticker}: BUY (Score: {total_buy:.2f})")
            
            # コンセンサス判定 (SELL)
            elif total_sell > self.threshold and total_sell > total_buy:
                base_sig = max(votes["details"], key=lambda x: x.get("confidence", 0))
                consensus_sig = base_sig.copy()
                consensus_sig["confidence"] = min(1.0, total_sell / sum(self.source_weights.values()))
                consensus_sig["reason"] = f"DAO Consensus Reached (Score: {total_sell:.2f})"
                consensus_signals.append(consensus_sig)
                logger.info(f"✅ Consensus reached for {ticker}: SELL (Score: {total_sell:.2f})")

        return consensus_signals
