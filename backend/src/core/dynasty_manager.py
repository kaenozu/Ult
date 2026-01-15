import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class DynastyManager:
    """
    Manages long-term (multi-generational) wealth and mission objectives for AGStock.
    Ensures the AI doesn't just trade for daily gains, but for 'Dynastic Wealth'.
    """

    def __init__(self, state_path: str = "data/dynasty_state.json"):
        self.state_path = state_path
        self._load_state()

    def _load_state(self):
        """Load State from file."""
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, "r", encoding="utf-8") as f:
                    self.state = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load dynasty state: {e}")
                self._create_default_state()
        else:
            self._create_default_state()

    def _create_default_state(self):
        """Create Default State."""
        self.state = {
            "established_at": datetime.now().isoformat(),
            "dynasty_name": "Antigravity AGStock Dynasty",
            "legacy_score": 10.0,
            "current_objective": "FOUNDATION_ESTABLISHMENT",
            "milestones": [],
            "generational_assets": {"reserve_ratio": 0.2, "growth_ratio": 0.8},
            "eternal_goals": [
                {"id": "G1", "target": "Capital preservation in crisis", "status": "ACTIVE"},
                {"id": "G2", "target": "Outperform indices by 15%", "status": "ACTIVE"},
            ],
        }
        self._save_state()

    def _save_state(self):
        """Save State to file."""
        try:
            os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
            with open(self.state_path, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=4, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save dynasty state: {e}")

    def evaluate_performance(self, portfolio_metrics: Dict[str, Any]):
        """Evaluate portfolio performance and update legacy score."""
        daily_pnl = portfolio_metrics.get("daily_pnl", 0.0)
        equity = portfolio_metrics.get("total_equity", 0.0)

        # Legacy score mapping
        if daily_pnl > 0:
            self.state["legacy_score"] += 0.5
        elif daily_pnl < 0:
            self.state["legacy_score"] -= 0.2
        self.state["legacy_score"] = round(max(1.0, self.state["legacy_score"]), 2)

        # Milestone tracking
        if equity > 5000000 and self.state["current_objective"] == "FOUNDATION_ESTABLISHMENT":
            self.state["current_objective"] = "EXPANSION_PHASE"
            self.state["milestones"].append(
                {
                    "date": datetime.now().isoformat(),
                    "event": "Equity reached 5M, moved to Expansion Phase.",
                }
            )
        self._save_state()
        logger.info(
            f"👑 [DYNASTY] Objective: {self.state['current_objective']} | Legacy Score: {self.state['legacy_score']}"
        )

    def get_briefing_snippet(self) -> str:
        """Returns a majestic summary for the daily report."""
        obj = self.state.get("current_objective", "UNKNOWN")
        score = self.state.get("legacy_score", 0.0)
        established = datetime.fromisoformat(self.state.get("established_at", datetime.now().isoformat())).strftime(
            "%Y-%m-%d"
        )
        return f"""
【王朝の現状（Dynasty Briefing）】
名称: {self.state.get('dynasty_name', 'Unknown Dynasty')}
開国: {established}
現在のフェーズ: {obj}
叡智の蓄積（Legacy Score）: {score}
王朝は永続的な富の構築に向け、現在の戦略群を監督しています。
"""

    def audit_portfolio_health(self, holdings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ensures holdings align with generational goals.
        Phase 30: Basic check for reserve ratio and concentration.
        """
        if not holdings:
            return {"health_status": "NEW", "audit_alerts": []}
        total_val = sum(h.get("market_value", 0) for h in holdings)
        alerts = []
        for h in holdings:
            if total_val > 0:
                weight = h.get("market_value", 0) / total_val
                if weight > 0.25:  # Over 25% in one ticker is risky for a dynasty
                    alerts.append(f"⚠️ Over-concentration in {h.get('ticker')} ({weight * 100:.1f}%)")
        return {"health_status": "STRONG" if not alerts else "CAUTION", "audit_alerts": alerts}
