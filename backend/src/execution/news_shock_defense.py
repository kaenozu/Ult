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

    DECAY_FACTOR = 0.95 # Score decay per check if no new shock
    
    def __init__(self):
        self.current_shock_score = 0.0
        self.last_shock_event = None

    def analyze_current_market(self):
        """
        Fetches latest news and updates shock score.
        """
        from src.news_aggregator import get_news_aggregator
        aggregator = get_news_aggregator()
        news_items = aggregator.fetch_rss_news(limit=10)
        
        # Reset score slightly (decay)
        self.current_shock_score *= self.DECAY_FACTOR
        
        shock = self.detect_shock_events(news_items)
        if shock:
            # Immediate Maximum Shock
            self.current_shock_score = 1.0
            self.last_shock_event = shock
            return shock
            
        return None

    def get_shock_status(self) -> Dict[str, Any]:
        """Returns current shock status for UI/API"""
        level = "NORMAL"
        if self.current_shock_score > 0.8:
            level = "CRITICAL"
        elif self.current_shock_score > 0.4:
            level = "WARNING"
            
        return {
            "level": level,
            "score": round(self.current_shock_score, 2),
            "latest_event": self.last_shock_event
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
