import pandas as pd
from typing import Dict, Any, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskAgent:
    """
    The Guardian: Monitors Market Risk (VIX, Volatility).
    Role: Provides a Risk Score and Veto power to the Consensus Engine.
    """
    def __init__(self, vix_threshold: float = 30.0, atr_percent_threshold: float = 0.03):
        self.vix_threshold = vix_threshold
        self.atr_percent_threshold = atr_percent_threshold

    def analyze(self, df: pd.DataFrame, external_data: Optional[Dict[str, pd.DataFrame]] = None) -> Dict[str, Any]:
        """
        Analyze market conditions and return risk assessment.
        """
        risk_score = 0.0
        is_veto = False
        reasons = []

        # 1. Check VIX (if available)
        current_vix = 0.0
        if external_data and "VIX" in external_data:
            vix_df = external_data["VIX"]
            if not vix_df.empty:
                current_vix = vix_df["Close"].iloc[-1]
                
                # Normalize VIX score (0-100 scale mapping to 0.0-1.0)
                # VIX 10 = 0.0, VIX 20 = 0.3, VIX 30 = 0.8, VIX 50 = 1.0
                risk_score += min(1.0, max(0.0, (current_vix - 10) / 40.0))
                
                if current_vix > self.vix_threshold:
                    matches = True
                    reasons.append(f"VIX High ({current_vix:.1f} > {self.vix_threshold})")
                    # If VIX is extremely high, consider veto
                    if current_vix > 40:
                        is_veto = True
                        reasons.append("VIX Critical! Force Wait.")
        
        # 2. Check Asset Volatility (ATR %)
        if not df.empty and len(df) > 14:
            # Simple ATR calculation
            high = df["High"]
            low = df["Low"]
            close = df["Close"]
            tr = pd.concat([high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()], axis=1).max(axis=1)
            atr = tr.rolling(window=14).mean().iloc[-1]
            price = close.iloc[-1]
            
            atr_pct = atr / price if price > 0 else 0
            
            # Add to risk score based on ATR
            # ATR 1% = 0.1, ATR 3% = 0.5, ATR 5% = 1.0
            atr_risk = min(1.0, max(0.0, (atr_pct - 0.01) / 0.04))
            risk_score = max(risk_score, atr_risk) # Take higher of VIX or ATR risk
            
            if atr_pct > self.atr_percent_threshold:
                reasons.append(f"Asset Voltility High (ATR {atr_pct*100:.1f}%)")
                
        # 3. Final Decision
        # Ensure score is 0.0 - 1.0
        risk_score = min(1.0, max(0.0, risk_score))
        
        # Veto Logic
        if risk_score > 0.8:
            is_veto = True
            reasons.append("Risk Score Critical provided Veto.")

        return {
            "risk_score": round(risk_score, 2),
            "is_veto": is_veto,
            "vix": round(current_vix, 2),
            "reasons": reasons
        }
