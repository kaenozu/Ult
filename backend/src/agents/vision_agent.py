from typing import Dict, Any, Optional
import logging
import pandas as pd
from src.evolution.chart_vision import ChartVisionEngine

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisionAgent:
    """
    The Eyes of God: Connects Visual Analysis to Consensus.
    Role: Provides a Vision Score (-1.0 to 1.0) based on Chart Patterns.
    Wraps: ChartVisionEngine (Gemini 1.5 Flash).
    """
    def __init__(self):
        self.engine = ChartVisionEngine()
        if not self.engine.has_vision:
            logger.warning("VisionAgent initialized but Gemini API Key is missing. Vision will be disabled.")

    def analyze(self, ticker: str, df: pd.DataFrame) -> float:
        """
        Analyze the chart visually and return a sentiment score.
        
        Args:
            ticker: Ticker symbol
            df: OHLC DataFrame
            
        Returns:
            float: Vision Score (-1.0 to 1.0). Returns 0.0 if vision unavailable or error.
        """
        if not self.engine.has_vision:
            return 0.0

        try:
            # 1. Generate & Analyze Image
            # Note: This calls Gemini (External API), so it has latency (~2-5s).
            result = self.engine.analyze_chart_vision(df, ticker)
            
            if not result:
                return 0.0
                
            # 2. Parse Verdict to Score
            verdict = result.get("verdict", "NEUTRAL").upper()
            
            score = 0.0
            if verdict == "BULLISH":
                score = 1.0
            elif verdict == "BEARISH":
                score = -1.0
            elif verdict == "NEUTRAL":
                score = 0.0
            else:
                logger.warning(f"Unknown vision verdict for {ticker}: {verdict}")
                
            # Optional: We could parse 'support/resistance' to refine score, 
            # but for now we stick to the main verdict.
            
            logger.info(f"VisionAgent Analysis for {ticker}: {verdict} -> {score}")
            return score

        except Exception as e:
            logger.error(f"VisionAgent analysis failed for {ticker}: {e}")
            return 0.0

    def get_mock_score(self, ticker: str) -> float:
        """Mock score for quick testing without API calls."""
        if ticker == "7203.T":
            return 0.8 # Bullish
        elif ticker == "9984.T":
            return -0.5 # Bearish
        return 0.0
