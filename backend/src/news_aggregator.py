"""
News Aggregator - リアルタイムニュース収集
RSSフィードやWebから市場ニュースを収集し、LLM分析用に整形する
"""

import logging
from datetime import datetime
from typing import Dict, List

import feedparser

logger = logging.getLogger(__name__)


class NewsAggregator:
    """市場ニュース収集クラス"""

    RSS_FEEDS = {
        "yahoo_finance_jp": "https://news.yahoo.co.jp/rss/media/fis/all.xml",
        "nikkei_market": "https://assets.wor.jp/rss/nikkei/market.xml",  # 非公式、安定性注意
        "reuters_jp_business": "http://feeds.reuters.com/reuters/JPBusinessNews",  # URL変わる可能性あり
        "coindesk_jp": "https://www.coindeskjapan.com/feed/",
    }

    def __init__(self):
        self.cached_news = []
        self.last_fetch = None

    def fetch_rss_news(self, limit: int = 20) -> List[Dict]:
        """
        RSSフィードからニュースを取得

        Args:
            limit: 取得件数

        Returns:
            ニュースリスト [{'title', 'link', 'published', 'summary', 'source'}]
        """
        all_news = []

        for source, url in self.RSS_FEEDS.items():
            try:
                feed = feedparser.parse(url)

                for entry in feed.entries[:5]:  # 各ソースから最新5件
                    published = entry.get("published", entry.get("updated", str(datetime.now())))

                    news_item = {
                        "title": entry.title,
                        "link": entry.link,
                        "published": published,
                        "summary": getattr(entry, "summary", ""),
                        "source": source,
                    }
                    all_news.append(news_item)
            except Exception as e:
                logger.warning(f"Error fetching RSS from {source}: {e}")

        # 日付順にソート（簡易実装）
        # 日付フォーマットがバラバラなため、そのままではソート難しいが、一旦そのまま

        self.cached_news = all_news[:limit]
        self.last_fetch = datetime.now()

        return self.cached_news

    def search_news(self, keyword: str) -> List[Dict]:
        """
        キャッシュされたニュースからキーワード検索
        """
        if not self.cached_news:
            self.fetch_rss_news()

        results = []
        for news in self.cached_news:
            if keyword in news["title"] or keyword in news["summary"]:
                results.append(news)

        return results

    def get_market_context(self) -> str:
        """
        LLM入力用の市場コンテキストテキストを生成
        """
        if not self.cached_news:
            self.fetch_rss_news()

        context = "### 最新市場ニュース\n"
        for i, news in enumerate(self.cached_news[:10]):
            context += f"{i + 1}. {news['title']} ({news['source']})\n"

        return context


# シングルトン
_aggregator = None


def get_news_aggregator() -> NewsAggregator:
    global _aggregator
    if _aggregator is None:
        _aggregator = NewsAggregator()
    return _aggregator
