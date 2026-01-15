import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class NewsShockDefense:
    """
    Monitors news headlines for high-impact 'Shock' words.
    Triggers immediate emergency actions.
    """

    CRITICAL_KEYWORDS = {
        "WAR": ["戦争", "開戦", "空爆", "侵攻", "WAR", "INVASION"],
        "ECONOMIC_SHOCK": [
            "暴落",
            "連鎖倒産",
            "デフォルト",
            "CRASH",
            "BANKRUPTCY",
            "DEFAULT",
        ],
        "PANDEMIC": [
            "パンデミック",
            "緊急事態宣言",
            "ロックダウン",
            "PANDEMIC",
            "LOCKDOWN",
        ],
        "POLICY_SHOCK": [
            "想定外の利上げ",
            "緊急利上げ",
            "財務相辞任",
            "UNEXPECTED RATE HIKE",
        ],
    }

    def detect_shock_events(self, news_items: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
        """
        Scans a list of news items for critical keywords.
        Returns the first detected shock event if found.
        """
        for item in news_items:
            title = item.get("title", "").upper()
            summary = item.get("summary", "").upper()
            content = title + " " + summary

            for category, keywords in self.CRITICAL_KEYWORDS.items():
                for kw in keywords:
                    if kw.upper() in content:
                        logger.critical(f"🔥 SHOCK EVENT DETECTED [{category}]: {title}")
                        return {
                            "category": category,
                            "keyword": kw,
                            "title": title,
                            "timestamp": item.get("published", "Now"),
                        }
        return None

    def get_emergency_action(self, shock_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determines what to do based on the shock event.
        """
        category = shock_event["category"]

        if category in ["WAR", "ECONOMIC_SHOCK"]:
            return {
                "action": "PARTIAL_LIQUIDATE",
                "percentage": 50,
                "reason": f"Emergency Liquidation triggered by {category}: {shock_event['title'][:50]}...",
            }
        else:
            return {
                "action": "TIGHTEN_STOP_LOSS",
                "stop_pct": 2.0,
                "reason": f"Risk Mitigation triggered by {category}: {shock_event['title'][:50]}...",
            }
