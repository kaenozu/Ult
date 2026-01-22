import logging
import pandas as pd
from typing import Dict, Any
from .data_loader import fetch_external_data

logger = logging.getLogger(__name__)

class MacroLoader:
    def __init__(self):
        pass

    def fetch_macro_data(self, period="3mo") -> Dict[str, Any]:
        """
        Fetch macro indicators and calculate a macro score.
        Returns a dict with 'macro_score', 'vix', 'raw_data', etc.
        """
        data = fetch_external_data(period=period)

        # Calculate Macro Score (0-100)
        # Higher is better (Growth/Stable). Lower is worse (Fear/Recession).

        # Base 100
        # VIX > 20: -20
        # VIX > 30: -40
        # VIX > 40: -60

        calc_score = 100
        vix_val = 15.0

        try:
            vix_df = data.get("VIX")
            if vix_df is not None and not vix_df.empty:
                vix_val = float(vix_df["Close"].iloc[-1])
                if vix_val > 40: calc_score -= 60
                elif vix_val > 30: calc_score -= 40
                elif vix_val > 20: calc_score -= 20
                elif vix_val < 15: calc_score += 0

            # US10Y Logic (Optional)
            us10y_df = data.get("US10Y")
            if us10y_df is not None and not us10y_df.empty:
                us10y = float(us10y_df["Close"].iloc[-1])
                # If yields are super high (>5%), maybe penalize?
                if us10y > 5.0:
                    calc_score -= 10

            score = max(0, min(100, calc_score))

        except Exception as e:
            logger.error(f"Error calculating macro score: {e}")
            score = 50
            vix_val = 20.0

        result = {
            "macro_score": score,
            "vix": {
                "value": vix_val
            },
            "raw_data": data
        }
        return result
