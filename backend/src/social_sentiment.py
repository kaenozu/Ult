"""
Social Sentiment Engine - 社会心理分析
Reddit, RSSフィードから投資家の「熱量(Hype)」を測定する
"""

import logging
from collections import Counter
from typing import Dict

import feedparser

logger = logging.getLogger(__name__)


class SocialSentimentEngine:
    """ソーシャルセンチメント分析エンジン"""

    # Reddit RSS Feeds
    REDDIT_FEEDS = {
        "WallStreetBets": "https://www.reddit.com/r/wallstreetbets/.rss",
        "Investing": "https://www.reddit.com/r/investing/.rss",
        "Stocks": "https://www.reddit.com/r/stocks/.rss",
        "CryptoCurrency": "https://www.reddit.com/r/CryptoCurrency/.rss",
    }

    # 簡易キーワードマッピング
    KEYWORDS = {
        "NVDA": ["NVDA", "Nvidia"],
        "TSLA": ["TSLA", "Tesla", "Musk"],
        "AAPL": ["AAPL", "Apple"],
        "BTC": ["BTC", "Bitcoin"],
        "ETH": ["ETH", "Ethereum"],
        "GME": ["GME", "GameStop"],
    }

    def __init__(self):
        pass

    def analyze_hype(self) -> Dict[str, int]:
        """
        Hypeスコア（言及数）を計測
        """
        mention_counts = Counter()

        for source, url in self.REDDIT_FEEDS.items():
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries:
                    text = (entry.title + " " + entry.get("summary", "")).lower()

                    for ticker, keywords in self.KEYWORDS.items():
                        for kw in keywords:
                            if kw.lower() in text:
                                mention_counts[ticker] += 1
                                break  # 1記事で複数ヒットしても1カウント
            except Exception as e:
                logger.warning(f"Reddit RSS fetch error {source}: {e}")

        return dict(mention_counts)

    def get_market_mood(self) -> str:
        """
        市場全体のムードを簡易判定
        """
        # 単純なポジティブ/ネガティブワードカウント（本来はLLM推奨だが高速化のため簡易実装）
        return "MIXED"  # Placeholder


# シングルトン
_social_engine = None


def get_social_engine() -> SocialSentimentEngine:
    global _social_engine
    if _social_engine is None:
        _social_engine = SocialSentimentEngine()
    return _social_engine
