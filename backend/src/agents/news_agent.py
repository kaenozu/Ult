from typing import List, Dict, Any, Optional
import logging
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsAgent:
    """
    The Observer: Monitors News and Sentiment.
    Role: Provides a News Score (-1.0 to 1.0) to the Consensus Engine.
    Engine: VADER (Valence Aware Dictionary and sEntiment Reasoner) - Lightweight Rule-based NLP.
    """
    def __init__(self):
        try:
            self.analyzer = SentimentIntensityAnalyzer()
            logger.info("NewsAgent (VADER) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize VADER: {e}")
            self.analyzer = None

    def analyze_headlines(self, ticker: str, headlines: List[str]) -> float:
        """
        Analyze a list of headlines and return an aggregate sentiment score.
        
        Args:
            ticker: Ticker symbol (used for logging or specific context filtering if needed)
            headlines: List of news headline strings
            
        Returns:
            float: Aggregate sentiment score (-1.0 to 1.0)
        """
        if not self.analyzer:
            logger.warning("VADER analyzer not available. Returning neutral.")
            return 0.0
            
        if not headlines:
            return 0.0

        scores = []
        for headline in headlines:
            # Calculate polarity scores
            # compound score: -1 (most extreme negative) to +1 (most extreme positive)
            vs = self.analyzer.polarity_scores(headline)
            scores.append(vs['compound'])
            
        if not scores:
            return 0.0
            
        # Average sentiment
        # We might want to weight recent news more heavily, but for now simple average.
        avg_score = sum(scores) / len(scores)
        
        # Apply strictness/amplification if needed
        # VADER compound score is already normalized.
        
        logger.info(f"NewsAgent Analysis for {ticker}: {len(headlines)} headlines, Score: {avg_score:.3f}")
        return float(avg_score)

    def get_mock_headlines(self, ticker: str) -> List[str]:
        """Test/Fallback headlines if no real data source."""
        if ticker in ["7203.T", "TM"]:
            return [
                "Toyota global sales reach record high.",
                "New EV battery technology breakthrough announced.",
                "Supply chain issues hamper production in Q2."
            ]
        elif ticker in ["9984.T", "SFTBY"]:
            return [
                "SoftBank Vision Fund reports massive loss.",
                "Analysts downgrade SoftBank amid tech sector slump."
            ]
        else:
            return []
