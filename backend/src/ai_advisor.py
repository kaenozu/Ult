
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AIAdvisor:
    """
    Expert System that provides investment advice based on Market Regime and Portfolio composition.
    Deterministic "AI" logic for high reliability and speed.
    """

    def analyze_portfolio(self, portfolio: Dict[str, Any], regime: str) -> Dict[str, Any]:
        """
        Generates advice based on the intersection of Regime and Portfolio Status.
        """
        
        advice = {
            "title": "AI市場分析",
            "message": "市場は安定しています。",
            "action": "HOLD (維持)",
            "confidence": 0.8,
            "rebalance_suggested": False
        }

        # extracting portfolio metrics
        total_equity = portfolio.get("total_equity", 0)
        cash_ratio = portfolio.get("cash", 0) / total_equity if total_equity > 0 else 1.0
        
        # Logic Matrix
        if regime == "trending_up":
            if cash_ratio > 0.4:
                advice["message"] = "上昇トレンドを検知しましたが、現金比率が高すぎます。機会損失を防ぐため投資比率を引き上げてください。"
                advice["action"] = "BUY (買い増し)"
                advice["rebalance_suggested"] = True
            else:
                advice["message"] = "上昇トレンド継続中。ポートフォリオは最適な状態です。利益を伸ばしましょう。"
                advice["action"] = "HOLD (維持)"
        
        elif regime == "trending_down":
            if cash_ratio < 0.3:
                advice["message"] = "下落トレンド入りしました。リスクが高いため、現金比率を高めるかヘッジを検討してください。"
                advice["action"] = "SELL (売却)"
                advice["rebalance_suggested"] = True
            else:
                advice["message"] = "下落トレンド継続中。現在の高い現金比率は守備的で適切な判断です。"
                advice["action"] = "WAIT (様子見)"

        elif regime == "high_volatility" or regime == "CRASH (市場崩壊警報)":
            advice["title"] = "⚠️ リスク警告"
            advice["message"] = "極めて高いボラティリティを検知。直ちにポジションを縮小し、現金を確保してください。"
            advice["action"] = "DEFENSE (守備)"
            advice["rebalance_suggested"] = True
            advice["confidence"] = 0.95
        
        elif regime == "low_volatility" or regime == "ranging":
             advice["message"] = "市場はレンジ相場です。平均回帰戦略やインカムゲイン狙いが有効です。"
             advice["action"] = "RANGE (レンジ)"

        return advice

ai_advisor = AIAdvisor()
