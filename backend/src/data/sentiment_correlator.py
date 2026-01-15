import logging
import statistics
from typing import Dict, Any
from src.news_collector import NewsCollector
from src.social_sentiment import SocialSentimentEngine
from src.bert_sentiment import BERTSentimentAnalyzer

logger = logging.getLogger(__name__)


class SentimentCorrelator:
    """
    Compares professional news sentiment with social media 'hype'
    to detect market overheating or contrarian opportunities.
    """

    def __init__(self):
        self.news_collector = NewsCollector()
        self.social_engine = SocialSentimentEngine()
        self.analyzer = BERTSentimentAnalyzer()

    def get_correlation_report(self, ticker: str) -> Dict[str, Any]:
        """
        Analyzes the divergence between News and Social indicators.
        """
        # 1. Get News Sentiment
        news = self.news_collector.fetch_news_for_ticker(ticker, limit=10)
        news_scores = []
        for n in news:
            res = self.analyzer.analyze(n["title"])
            news_scores.append(res["score"])

        avg_news_sentiment = statistics.mean(news_scores) if news_scores else 0.0

        # 2. Get Social Hype (using existing engine)
        hype_data = self.social_engine.analyze_hype()
        # Find matches in hype data (SocialSentimentEngine uses generic keys)
        ticker_base = ticker.split(".")[0]  # e.g., 7203.T -> 7203
        hype_score = hype_data.get(ticker_base, 0)

        # 3. Calculate Divergence
        # Higher divergence = Social Hype is much higher than pro news sentiment
        # (Conceptual formula)
        divergence = 0.0
        if hype_score > 5 and avg_news_sentiment < 0.2:
            divergence = (hype_score / 10.0) - avg_news_sentiment

        status = "NORMAL"
        if divergence > 0.8:
            status = "OVERHEATED"  # SNS is crazy, News is neutral/bearish
        elif divergence < -0.5 and avg_news_sentiment > 0.5:
            status = "SKEPTICISM"  # Pro News is great, but SNS hasn't noticed yet (Buy opportunity?)

        return {
            "ticker": ticker,
            "avg_news_sentiment": round(avg_news_sentiment, 2),
            "social_hype_count": hype_score,
            "divergence": round(divergence, 2),
            "status": status,
            "recommendation": (
                "CAUTION" if status == "OVERHEATED" else "OPPORTUNITY" if status == "SKEPTICISM" else "NONE"
            ),
        }
