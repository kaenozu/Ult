import logging
import random
import pandas as pd
from typing import Dict, List, Optional
from ..data.data_loader import fetch_stock_data

logger = logging.getLogger(__name__)

MACRO_INDICATORS = {"VIX": "^VIX", "US10Y": "^TNX", "JPY": "JPY=X"}

class Oracle2026:
    """
    Simplified Oracle2026 for backward compatibility.
    Provides risk guidance without heavy LLM dependencies.
    """

    def __init__(self):
        try:
            from src.ai_analyst import AIAnalyst
            self.analyst = AIAnalyst()
        except ImportError:
            self.analyst = None

    def speculate_scenarios(self) -> List[Dict]:
        return [
            {"name": "Stable Growth", "description": "Market remains stable with moderate growth.", "risk_level": "Moderate"},
            {"name": "Volatility Spike", "description": "Expect increased volatility in the coming months.", "risk_level": "High"},
        ]

    def assess_portfolio_resilience(self, holdings: List[str]) -> Dict:
        return {
            "resilience_score": 85,
            "status": "Robust",
            "recommendation": "Maintain diversification.",
        }

    def get_risk_guidance(self) -> Dict:
        """
        Provides risk adjustment guidance based on macro data.
        """
        try:
            data = fetch_stock_data(list(MACRO_INDICATORS.values()), period="5d")
            vix_price = self._get_price(data, MACRO_INDICATORS["VIX"]) or 20.0
            us10y_yield = self._get_price(data, MACRO_INDICATORS["US10Y"]) or 4.0
        except Exception:
            vix_price = 20.0
            us10y_yield = 4.0

        risk_score = 0
        if vix_price > 30: risk_score += 3
        elif vix_price > 20: risk_score += 1
        if us10y_yield > 4.5: risk_score += 1

        if risk_score >= 3:
            return {
                "var_buffer": 0.05,
                "max_drawdown_adj": 0.5,
                "safety_mode": True,
                "oracle_message": "⚠️ CRITICAL WARNING: High market stress detected.",
            }
        elif risk_score >= 1:
            return {
                "var_buffer": 0.02,
                "max_drawdown_adj": 0.8,
                "safety_mode": False,
                "oracle_message": "⚠️ CAUTION: Market volatility is rising.",
            }
        else:
            return {
                "var_buffer": 0.0,
                "max_drawdown_adj": 1.0,
                "safety_mode": False,
                "oracle_message": "✅ STABLE: Market indicators are normal.",
            }

    def _get_price(self, data_map: Dict, ticker: str) -> Optional[float]:
        df = data_map.get(ticker)
        if df is not None and not df.empty:
            return float(df["Close"].iloc[-1])
        return None