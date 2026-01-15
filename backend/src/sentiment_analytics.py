"""
感情分析と代替データの統合モジュール

- SNSとニュースのセンチメント分析
- 衛星画像や検索トレンドの利用
- 取引ボリュームとオーダーブック分析
"""

import logging
import os
import sqlite3
import warnings
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import yfinance as yf
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

from .base_predictor import BasePredictor

warnings.filterwarnings("ignore")


logger = logging.getLogger(__name__)

# データベースの初期化
DB_PATH = "data/sentiment_data.db"


def init_sentiment_db():
    """センチメントデータベースの初期化"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ニュースセンチメントテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS news_sentiment (
            id INTEGER PRIMARY KEY,
            ticker TEXT,
            title TEXT,
            content TEXT,
            source TEXT,
            timestamp DATETIME,
            sentiment_score REAL,
            sentiment_label TEXT
        )
    """
    )

    # SNSセンチメントテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS social_sentiment (
            id INTEGER PRIMARY KEY,
            ticker TEXT,
            text TEXT,
            platform TEXT,
            timestamp DATETIME,
            sentiment_score REAL,
            retweets INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0
        )
    """
    )

    # 検索トレンドテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS search_trends (
            id INTEGER PRIMARY KEY,
            keyword TEXT,
            timestamp DATETIME,
            trend_score REAL
        )
    """
    )

    conn.commit()
    conn.close()


class NewsSentimentAnalyzer:
    """ニュースセンチメントアナライザー"""

    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        self.model = None
        self.vectorizer = None
        self.is_trained = False
        init_sentiment_db()

    def fetch_news(self, ticker: str, days: int = 7) -> List[Dict[str, Any]]:
        """ニュースの取得（簡易的な方法、実際にはAPIを使用）"""
        # yfinanceのニュース機能を使用
        try:
            ticker_obj = yf.Ticker(ticker)
            news_data = ticker_obj.news
            if not news_data:
                return []

            # 指定日数分のニュースをフィルタ
            filtered_news = []
            cutoff_date = datetime.now() - timedelta(days=days)

            for item in news_data:
                pub_date = datetime.fromtimestamp(item.get("providerPublishTime", 0))
                if pub_date >= cutoff_date:
                    filtered_news.append(
                        {
                            "title": item.get("title", ""),
                            "summary": item.get("summary", ""),
                            "publisher": item.get("publisher", ""),
                            "link": item.get("link", ""),
                            "date": pub_date,
                        }
                    )

            return filtered_news
        except Exception as e:
            logger.error(f"Error fetching news for {ticker}: {e}")
            return []

    def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """テキストのセンチメント分析"""
        # TextBlobによる基本分析
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity

        # VADERによる詳細分析
        vader_scores = self.analyzer.polarity_scores(text)

        return {
            "polarity": polarity,
            "vader_compound": vader_scores["compound"],
            "vader_pos": vader_scores["pos"],
            "vader_neu": vader_scores["neu"],
            "vader_neg": vader_scores["neg"],
        }

    def preprocess_news_data(self, news_list: List[Dict]) -> List[Dict]:
        """ニュースデータの前処理"""
        processed_news = []

        for news_item in news_list:
            content = f"{news_item['title']} {news_item['summary']}"
            sentiment = self.analyze_sentiment(content)

            processed_news.append(
                {
                    "ticker": news_item.get("ticker", ""),
                    "title": news_item["title"],
                    "content": content,
                    "source": news_item["publisher"],
                    "timestamp": news_item["date"],
                    "sentiment_score": sentiment["vader_compound"],
                    "sentiment_details": sentiment,
                    "relevance": self._calculate_relevance(content, news_item.get("ticker", "")),
                }
            )

        return processed_news

    def _calculate_relevance(self, text: str, ticker: str) -> float:
        """ニュースの関連性を計算（単純化）"""
        text_lower = text.lower()
        ticker_lower = ticker.lower()

        # 銘柄名が含まれているか、関連語が含まれているか
        relevance = 0

        if ticker_lower.replace(".t", "").replace(".", "") in text_lower:
            relevance += 0.5
        if any(word in text_lower for word in ["earnings", "results", "report", "q1", "q2", "q3", "q4"]):
            relevance += 0.3
        if any(word in text_lower for word in ["buy", "sell", "target", "rating"]):
            relevance += 0.2

        return min(1.0, relevance)

    def store_sentiment_data(self, sentiment_data: List[Dict]):
        """センチメントデータをデータベースに保存"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        for item in sentiment_data:
            cursor.execute(
                """
                INSERT OR REPLACE INTO news_sentiment
                (ticker, title, content, source, timestamp, sentiment_score, sentiment_label)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    item["ticker"],
                    item["title"],
                    item["content"],
                    item["source"],
                    item["timestamp"],
                    item["sentiment_score"],
                    (
                        "positive"
                        if item["sentiment_score"] > 0.1
                        else "negative" if item["sentiment_score"] < -0.1 else "neutral"
                    ),
                ),
            )

        conn.commit()
        conn.close()

    def get_historical_sentiment(self, ticker: str, days: int = 30) -> pd.DataFrame:
        """過去のセンチメントデータを取得"""
        conn = sqlite3.connect(DB_PATH)

        query = """
            SELECT timestamp, sentiment_score, sentiment_label
            FROM news_sentiment
            WHERE ticker = ? AND timestamp >= ?
            ORDER BY timestamp DESC
        """
        cutoff_date = datetime.now() - timedelta(days=days)

        df = pd.read_sql_query(query, conn, params=(ticker, cutoff_date))
        conn.close()

        return df


class SocialMediaSentimentAnalyzer:
    """SNSセンチメントアナライザー"""

    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        init_sentiment_db()

    def fetch_tweets(self, ticker: str, count: int = 50) -> List[Dict[str, Any]]:
        """ツイートの取得（モック実装、実際にはAPIを使用）"""
        # モックデータの生成（実際にはTwitter API等が必要）
        import random

        mock_tweets = []
        for _ in range(count):
            # 銘柄に関連するモックツイートを生成
            sentiment_words = {
                "positive": ["up", "bullish", "buy", "great", "amazing", "strong", "gain", "profit"],
                "negative": ["down", "bearish", "sell", "bad", "terrible", "weak", "loss", "crash"],
                "neutral": ["news", "update", "info", "data", "report", "market", "stock", "trade"],
            }

            sentiment_type = random.choice(["positive", "negative", "neutral"])
            words = random.choices(sentiment_words[sentiment_type], k=random.randint(5, 10))
            trend = "up" if sentiment_type == "positive" else ("down" if sentiment_type == "negative" else "mixed")
            text = f"${ticker} {' '.join(words)} trending {trend}!"

            mock_tweets.append(
                {
                    "text": text,
                    "timestamp": datetime.now() - timedelta(minutes=random.randint(0, 1440)),
                    "retweets": random.randint(0, 1000),
                    "likes": random.randint(0, 5000),
                    "user_followers": random.randint(100, 1000000),
                }
            )

        return mock_tweets

    def analyze_tweet_sentiment(self, tweets: List[Dict]) -> List[Dict]:
        """ツイートのセンチメント分析"""
        analyzed_tweets = []

        for tweet in tweets:
            sentiment = self.analyzer.polarity_scores(tweet["text"])

            # インフルエンスファクター（フォロワー数やエンゲージメント）を考慮
            influence_factor = min(10.0, (tweet["user_followers"] / 100000) * (tweet["retweets"] + tweet["likes"] + 1))
            adjusted_sentiment = sentiment["compound"] * (1 + influence_factor * 0.1)

            analyzed_tweets.append(
                {
                    "text": tweet["text"],
                    "timestamp": tweet["timestamp"],
                    "sentiment_score": adjusted_sentiment,
                    "raw_sentiment": sentiment,
                    "influence_factor": influence_factor,
                    "engagement": tweet["retweets"] + tweet["likes"],
                }
            )

        return analyzed_tweets

    def store_social_data(self, ticker: str, social_data: List[Dict]):
        """SNSデータをデータベースに保存"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        for item in social_data:
            cursor.execute(
                """
                INSERT OR REPLACE INTO social_sentiment
                (ticker, text, platform, timestamp, sentiment_score, retweets, likes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    ticker,
                    item["text"],
                    "Twitter",  # プラットフォーム名
                    item["timestamp"],
                    item["sentiment_score"],
                    item.get("retweets", 0),
                    item.get("likes", 0),
                ),
            )

        conn.commit()
        conn.close()

    def get_social_sentiment_score(self, ticker: str, hours: int = 24) -> Dict[str, float]:
        """SNSセンチメントスコアの取得"""
        conn = sqlite3.connect(DB_PATH)

        query = """
            SELECT sentiment_score, retweets, likes
            FROM social_sentiment
            WHERE ticker = ? AND timestamp >= ?
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)

        df = pd.read_sql_query(query, conn, params=(ticker, cutoff_time))
        conn.close()

        if df.empty:
            return {"average_sentiment": 0.0, "volume_adjusted_sentiment": 0.0, "tweet_count": 0}

        # 平均センチメント
        avg_sentiment = df["sentiment_score"].mean()

        # 出来量調整済みセンチメント（エンゲージメントを重みづけ）
        total_engagement = df["retweets"].sum() + df["likes"].sum()
        if total_engagement > 0:
            volume_adjusted_sentiment = (
                df["sentiment_score"] * (df["retweets"] + df["likes"] + 1)
            ).sum() / total_engagement
        else:
            volume_adjusted_sentiment = avg_sentiment

        return {
            "average_sentiment": avg_sentiment,
            "volume_adjusted_sentiment": volume_adjusted_sentiment,
            "tweet_count": len(df),
            "total_engagement": total_engagement,
        }


class AlternativeDataIntegrator:
    """代替データ統合器"""

    def __init__(self):
        init_sentiment_db()
        self.news_analyzer = NewsSentimentAnalyzer()
        self.social_analyzer = SocialMediaSentimentAnalyzer()

    def fetch_search_trends(self, keywords: List[str]) -> Dict[str, List[Dict]]:
        """検索トレンドの取得（Google Trends APIの代替としてモック実装）"""
        # モック実装：実際には外部APIを使用
        import random

        trends = {}
        for keyword in keywords:
            trend_data = []
            for i in range(30):  # 遱日分のデータ
                trend_data.append(
                    {
                        "date": datetime.now() - timedelta(days=i),
                        "score": random.randint(0, 100),  # 視認性スコア (0-100)
                    }
                )
            trends[keyword] = trend_data

        return trends

    def store_search_trends(self, trends_data: Dict[str, List[Dict]]):
        """検索トレンドをデータベースに保存"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        for keyword, trend_list in trends_data.items():
            for item in trend_list:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO search_trends
                    (keyword, timestamp, trend_score)
                    VALUES (?, ?, ?)
                """,
                    (keyword, item["date"], item["score"]),
                )

        conn.commit()
        conn.close()

    def analyze_order_book_sentiment(self, ticker: str) -> Dict[str, float]:
        """オーダーブックデータからセンチメント分析（モック実装）"""
        # 実際にはリアルタイムオーダーブックAPIが必要
        # ここではダミーデータを使用

        # 想定される指標
        return {
            "buy_volume_ratio": np.random.uniform(0.3, 0.7),
            "sell_volume_ratio": np.random.uniform(0.3, 0.7),
            "bid_ask_spread": np.random.uniform(0.01, 0.1),
            "order_imbalance": np.random.uniform(-0.2, 0.2),
            "large_order_flow": np.random.uniform(-0.1, 0.1),
        }

    def analyze_volume_sentiment(self, ticker: str, period: str = "5d") -> Dict[str, float]:
        """出来高ベースのセンチメント分析"""
        try:
            data = yf.download(ticker, period=period, interval="1d")

            if data.empty:
                return {"volume_momentum": 0.0, "volume_surprise": 0.0, "price_volume_correlation": 0.0}

            # 出来高の急増検出
            avg_volume = data["Volume"].rolling(window=10).mean()
            volume_ratio = data["Volume"] / avg_volume

            # 価格変動との相関
            price_change = data["Close"].pct_change()
            volume_change = data["Volume"].pct_change()
            pv_corr = price_change.corr(volume_change.dropna())

            latest_ratio = volume_ratio.iloc[-1] if len(volume_ratio) > 0 else 1.0
            latest_momentum = (
                data["Volume"].iloc[-5:].mean() / data["Volume"].iloc[-20:-5].mean() if len(data) > 25 else 1.0
            )

            return {
                "volume_momentum": latest_momentum - 1.0,
                "volume_surprise": latest_ratio - 1.0,
                "price_volume_correlation": pv_corr if not np.isnan(pv_corr) else 0.0,
            }
        except Exception as e:
            logger.error(f"Volume sentiment analysis error for {ticker}: {e}")
            return {"volume_momentum": 0.0, "volume_surprise": 0.0, "price_volume_correlation": 0.0}

    def integrate_all_sentiment(self, ticker: str) -> Dict[str, Any]:
        """すべてのセンチメントソースを統合"""
        # ニュースセンチメント
        news_data = self.news_analyzer.fetch_news(ticker, days=3)
        processed_news = self.news_analyzer.preprocess_news_data(news_data)
        self.news_analyzer.store_sentiment_data(processed_news)

        # SNSセンチメント
        tweets = self.social_analyzer.fetch_tweets(ticker, count=20)
        analyzed_tweets = self.social_analyzer.analyze_tweet_sentiment(tweets)
        self.social_analyzer.store_social_data(ticker, analyzed_tweets)

        # 検索トレンド（モック）
        search_trends = self.fetch_search_trends([ticker])
        self.store_search_trends(search_trends)

        # 各種センチメントを統合
        news_sentiment = np.mean([item["sentiment_score"] for item in processed_news]) if processed_news else 0.0
        social_sentiment = self.social_analyzer.get_social_sentiment_score(ticker)
        volume_sentiment = self.analyze_volume_sentiment(ticker)
        order_book_sentiment = self.analyze_order_book_sentiment(ticker)

        # 総合センチメントスコア（重み付き平均）
        weights = {
            "news": 0.3,
            "social": 0.25,
            "volume": 0.2,
            "order_book": 0.15,
            "search": 0.1,  # 検索トレンドは0.1の重み（暫定）
        }

        overall_sentiment = (
            news_sentiment * weights["news"]
            + social_sentiment["volume_adjusted_sentiment"] * weights["social"]
            + volume_sentiment["volume_momentum"] * weights["volume"]
            + order_book_sentiment["order_imbalance"] * weights["order_book"]
            + np.mean([item["score"] for sublist in search_trends.values() for item in sublist])
            / 50.0
            * weights["search"]  # 検索トレンドの正規化
        )

        return {
            "overall_sentiment": overall_sentiment,
            "news_sentiment": news_sentiment,
            "social_sentiment": social_sentiment,
            "volume_sentiment": volume_sentiment,
            "order_book_sentiment": order_book_sentiment,
            "sentiment_strength": abs(overall_sentiment),
            "sentiment_components": {
                "news": news_sentiment * weights["news"],
                "social": social_sentiment["volume_adjusted_sentiment"] * weights["social"],
                "volume": volume_sentiment["volume_momentum"] * weights["volume"],
                "order_book": order_book_sentiment["order_imbalance"] * weights["order_book"],
                "search": np.mean([item["score"] for sublist in search_trends.values() for item in sublist])
                / 50.0
                * weights["search"],
            },
        }

    def get_sentiment_features(self, ticker: str, lookback_days: int = 7) -> Dict[str, float]:
        """センチメント特徴量の取得"""
        integrated_sentiment = self.integrate_all_sentiment(ticker)

        # 時系列センチメント特徴量
        historical_news = self.news_analyzer.get_historical_sentiment(ticker, lookback_days)

        features = {
            "sentiment_score": integrated_sentiment["overall_sentiment"],
            "sentiment_strength": integrated_sentiment["sentiment_strength"],
            "news_sentiment": integrated_sentiment["news_sentiment"],
            "social_sentiment": integrated_sentiment["social_sentiment"]["average_sentiment"],
            "volume_sentiment": integrated_sentiment["volume_sentiment"]["volume_momentum"],
            "order_book_sentiment": integrated_sentiment["order_book_sentiment"]["order_imbalance"],
            "tweet_volume": integrated_sentiment["social_sentiment"]["tweet_count"],
            "engagement_score": integrated_sentiment["social_sentiment"]["total_engagement"],
        }

        # 歴史的傾向
        if not historical_news.empty:
            features["sentiment_trend"] = historical_news["sentiment_score"].diff().mean()
            features["sentiment_volatility"] = historical_news["sentiment_score"].std()
            features["sentiment_momentum"] = (
                (historical_news["sentiment_score"].iloc[-1] - historical_news["sentiment_score"].iloc[-3:].mean())
                if len(historical_news) >= 3
                else 0.0
            )

        return features


class SatelliteImageAnalyzer:
    """衛星画像アナライザー（概念実装）"""

    def __init__(self):
        # 衛星画像解析は高度な処理が必要で、実際にはAPIや専門ツールを使用
        self.enabled = False
        logger.info("Satellite image analysis requires specialized API and is disabled by default")

    def analyze_retail_activity(self, location: str) -> Dict[str, float]:
        """小売業活動の衛星画像分析（モック）"""
        if not self.enabled:
            return {"parking_occupancy": 0.5, "activity_change": 0.0, "confidence": 0.0}

        # 実際には衛星画像APIを使用して解析
        return {
            "parking_occupancy": np.random.uniform(0.2, 0.9),
            "activity_change": np.random.uniform(-0.1, 0.1),
            "confidence": np.random.uniform(0.6, 0.9),
        }

    def analyze_supply_chain(self, area: str) -> Dict[str, float]:
        """サプライチェーンの衛星画像分析（モック）"""
        if not self.enabled:
            return {"shipping_activity": 0.5, "transport_change": 0.0, "confidence": 0.0}

        return {
            "shipping_activity": np.random.uniform(0.3, 0.8),
            "transport_change": np.random.uniform(-0.1, 0.1),
            "confidence": np.random.uniform(0.5, 0.8),
        }


class SentimentEnhancedPredictor(BasePredictor):
    """センチメント強化予測器"""

    def __init__(self, base_predictor=None):
        self.base_predictor = base_predictor
        self.sentiment_integrator = AlternativeDataIntegrator()
        self.satellite_analyzer = SatelliteImageAnalyzer()
        self.sentiment_score = 0
        self.tokenizer = None
        self.model = None

        # センチメント重みパラメータ
        self.sentiment_influence_weight = 0.2  # センチメントが予測に与える影響度

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X):
        """標準的な予測インターフェース"""
        # Xがデータフレームの場合は値を抽出
        if isinstance(X, pd.DataFrame):
            X = X.values

        # 銘柄名が不明な場合はデフォルトを使用
        ticker = "INDEX"

        # 予測の実行（単一の入力またはバッチに対応）
        if X.ndim == 1:
            X = X.reshape(1, -1)

        results = []
        for i in range(len(X)):
            res = self.predict_with_sentiment(ticker, X[i])
            # sentiment_adjusted_prediction の最初の値（翌日予測）を返す
            results.append(res["sentiment_adjusted_prediction"][0])

        return np.array(results)

    def predict_with_sentiment(self, ticker: str, base_features: np.ndarray) -> Dict[str, Any]:
        """センチメント情報を統合した予測"""
        # 基本的な数値予測
        base_prediction = (
            self.base_predictor.predict(base_features) if hasattr(self.base_predictor, "predict") else [0.01] * 5
        )  # 5日分の予測

        # センチメント分析
        sentiment_features = self.sentiment_integrator.get_sentiment_features(ticker)
        overall_sentiment = sentiment_features["sentiment_score"]

        # センチメントに基づく補正
        sentiment_adjusted_prediction = []
        for i, pred in enumerate(base_prediction):
            # センチメントの影響を加える（時間とともに減少）
            adjustment_factor = (
                self.sentiment_influence_weight * overall_sentiment * (1.0 - 0.1 * i)
            )  # 時間とともに影響を小さく
            adjusted_value = pred * (1 + adjustment_factor)
            sentiment_adjusted_prediction.append(adjusted_value)

        return {
            "base_prediction": base_prediction,
            "sentiment_adjusted_prediction": sentiment_adjusted_prediction,
            "sentiment_features": sentiment_features,
            "sentiment_impact": overall_sentiment * self.sentiment_influence_weight,
            "prediction_confidence": min(1.0, 0.8 + abs(overall_sentiment) * 0.2),  # センチメントが強いほど自信度が増す
        }

    def get_sentiment_impact_analysis(self, ticker: str) -> Dict[str, Any]:
        """センチメントの影響分析"""
        return self.sentiment_integrator.integrate_all_sentiment(ticker)


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # モック予測器
    class MockPredictor:
        def predict(self, X):
            return [0.02, 0.015, 0.01, 0.008, 0.012]  # 5日分の予測 (2%, 1.5%, 1%, 0.8%, 1.2%)

    mock_predictor = MockPredictor()

    # センチメント強化予測器のテスト
    sentiment_predictor = SentimentEnhancedPredictor(mock_predictor)

    # 特徴量のダミー（実際には価格データ等から計算）
    dummy_features = np.random.random((1, 10))

    result = sentiment_predictor.predict_with_sentiment("7203.T", dummy_features)

    print(f"Base prediction: {result['base_prediction']}")
    print(f"Sentiment adjusted prediction: {result['sentiment_adjusted_prediction']}")
    print(f"Sentiment features: {result['sentiment_features']}")
    print(f"Sentiment impact: {result['sentiment_impact']}")
    print(f"Prediction confidence: {result['prediction_confidence']}")

    # センチメント影響分析
    impact_analysis = sentiment_predictor.get_sentiment_impact_analysis("7203.T")
    print(f"Sentiment impact analysis: {impact_analysis}")

    print("Sentiment analysis and alternative data integration components test completed.")
