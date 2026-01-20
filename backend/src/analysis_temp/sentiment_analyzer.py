"""
Sentiment Analysis Integration for Stock Prediction
株価予測のためのセンチメント分析統合
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
import requests
import re
from datetime import datetime, timedelta

# Try to import required libraries
try:
    from textblob import TextBlob
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch

    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """センチメント分析器"""

    def __init__(self):
        self.financial_keywords = [
            "利益",
            "損失",
            "増益",
            "減収",
            "黒字",
            "配当",
            "増資",
            "買収",
            "業績",
            "売上",
            "売却",
            "投資",
            "金融",
            "銀行",
            "経済",
            "金利",
            "株価",
            "市場",
            "為替",
            "日銀",
            "短観",
            "景気",
            "インフレ",
            "成長",
            "減速",
            "回復",
            "リストラ",
            "債務",
            "財務",
            "決算",
            "予想",
            "上方修正",
            "下方修正",
            "達成",
            "未達",
            "超過",
            "改善",
        ]

        self.tech_keywords = [
            "AI",
            "人工知能",
            "半導体",
            "IT",
            "ソフトウェア",
            "テクノロジー",
            "クラウド",
            "データ",
            "5G",
            "通信",
            "ネットワーク",
            "サイバー",
            "ロボティクス",
            "EV",
            "電気自動車",
            "再生可能エネルギー",
            "バイオ",
            "製薬",
            "医療",
            "ヘルスケア",
            "ロボット",
        ]

        self.sentiment_cache = {}

    def analyze_text_sentiment(self, text: str) -> Dict:
        """テキスト感情分析"""
        if not text or len(text.strip()) == 0:
            return {
                "sentiment": 0.0,
                "confidence": 0.0,
                "polarity": "neutral",
                "financial_relevance": 0.0,
                "tech_relevance": 0.0,
            }

        try:
            if NLP_AVAILABLE:
                # TextBlobによる分析
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity  # -1 to 1
                subjectivity = blob.sentiment.subjectivity  # 0 to 1

                # 金融関連スコア
                financial_score = 0
                for keyword in self.financial_keywords:
                    if keyword in text:
                        financial_score += 1

                # テクノロジースコア
                tech_score = 0
                for keyword in self.tech_keywords:
                    if keyword in text:
                        tech_score += 1

                return {
                    "sentiment": polarity,
                    "confidence": subjectivity,
                    "polarity": self._classify_polarity(polarity),
                    "financial_relevance": min(financial_score / 5, 1.0),
                    "tech_relevance": min(tech_score / 5, 1.0),
                }
            else:
                # 簡単なキーワードベース分析
                positive_words = [
                    "上昇",
                    "好調",
                    "改善",
                    "増加",
                    "成功",
                    "成長",
                    "追伸",
                ]
                negative_words = [
                    "下落",
                    "悪化",
                    "減少",
                    "失敗",
                    "低迷",
                    "後退",
                    "縮小",
                ]

                positive_count = sum(1 for word in positive_words if word in text)
                negative_count = sum(1 for word in negative_words if word in text)

                if positive_count > negative_count:
                    polarity = 0.5
                    polarity_label = "positive"
                elif negative_count > positive_count:
                    polarity = -0.5
                    polarity_label = "negative"
                else:
                    polarity = 0.0
                    polarity_label = "neutral"

                return {
                    "sentiment": polarity,
                    "confidence": 0.5,
                    "polarity": polarity_label,
                    "financial_relevance": 0.3,  # デフォルト値
                    "tech_relevance": 0.2,
                }

        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            return {
                "sentiment": 0.0,
                "confidence": 0.0,
                "polarity": "neutral",
                "financial_relevance": 0.0,
                "tech_relevance": 0.0,
            }

    def _classify_polarity(self, polarity: float) -> str:
        """極性分類"""
        if polarity > 0.1:
            return "positive"
        elif polarity < -0.1:
            return "negative"
        else:
            return "neutral"

    def analyze_news_headlines(self, ticker: str, max_articles: int = 10) -> List[Dict]:
        """ニュースヘッドライン分析"""
        try:
            # Yahoo Finance Japanからニュース取得（シミュレーション）
            search_url = f"https://news.google.com/rss/search?q={ticker}+株価&hl=ja&gl=jp&ceid=JP:ja"

            # 実際には金融ニュースAPIを使用する必要がある
            # ここではシミュレーションデータを生成
            sample_headlines = self._generate_sample_headlines(ticker, max_articles)

            results = []
            for i, headline in enumerate(sample_headlines):
                sentiment = self.analyze_text_sentiment(headline["title"])

                results.append(
                    {
                        "timestamp": headline["timestamp"],
                        "title": headline["title"],
                        "sentiment": sentiment["sentiment"],
                        "polarity": sentiment["polarity"],
                        "financial_relevance": sentiment["financial_relevance"],
                        "tech_relevance": sentiment["tech_relevance"],
                        "source": headline["source"],
                    }
                )

            return results

        except Exception as e:
            logger.error(f"News analysis error for {ticker}: {e}")
            return []

    def _generate_sample_headlines(self, ticker: str, max_articles: int) -> List[Dict]:
        """サンプルヘッドライン生成"""
        company_names = {
            "7203": "トヨタ自動車",
            "6758": "ソニーグループ",
            "9984": "ソフトバンク",
        }

        company_name = company_names.get(ticker, f"銘柄{ticker}")

        # サンプルニュースを生成
        sample_news = [
            f"{company_name}、新技術開発で期待高まる",
            f"{company_name}、決算予想を上方修正",
            f"{company_name}、市場の不透明感から売り",
            f"{company_name}、競合他社との提携発表",
            f"{company_name}、原材料高騰で懸念",
            f"{company_name}、新興業で成長戦略を発表",
            f"{company_name}、業績好調で株価上昇",
            f"{company_name}、海外市場で販売拡大",
            f"{company_name}、環境対応で評判向上",
        ]

        headlines = []
        base_time = datetime.now() - timedelta(hours=24)

        for i, title in enumerate(sample_news[:max_articles]):
            headlines.append(
                {
                    "timestamp": base_time + timedelta(hours=i),
                    "title": title,
                    "source": "サンプルデータ",
                }
            )

        return headlines

    def calculate_sentiment_indicators(self, sentiment_data: List[Dict], time_window_hours: int = 24) -> Dict:
        """センチメント指標計算"""
        if not sentiment_data:
            return {
                "sentiment_score": 0.0,
                "polarity_distribution": {"positive": 0, "negative": 0, "neutral": 0},
                "trend": "stable",
                "volatility": 0.0,
                "financial_relevance_avg": 0.0,
                "tech_relevance_avg": 0.0,
            }

        # 時間ウィンドウ内のデータ抽出
        cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
        recent_data = [data for data in sentiment_data if data["timestamp"] > cutoff_time]

        if len(recent_data) == 0:
            return self._get_empty_sentiment_indicators()

        # 感情スコア計算
        sentiment_scores = [data["sentiment"] for data in recent_data]
        sentiment_score = np.mean(sentiment_scores)

        # 極性分布
        polarity_counts = {}
        for data in recent_data:
            polarity = data["polarity"]
            polarity_counts[polarity] = polarity_counts.get(polarity, 0) + 1

        total = len(recent_data)
        polarity_distribution = {
            "positive": polarity_counts.get("positive", 0) / total,
            "negative": polarity_counts.get("negative", 0) / total,
            "neutral": polarity_counts.get("neutral", 0) / total,
        }

        # トレンド判定
        if len(sentiment_scores) > 1:
            recent_half = sentiment_scores[len(sentiment_scores) // 2 :]
            early_half = sentiment_scores[: len(sentiment_scores) // 2]

            if np.mean(recent_half) > np.mean(early_half) + 0.1:
                trend = "improving"
            elif np.mean(recent_half) < np.mean(early_half) - 0.1:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        # ボラティリティ
        volatility = np.std(sentiment_scores) if len(sentiment_scores) > 1 else 0.0

        # 関連性平均
        financial_relevance = np.mean([data["financial_relevance"] for data in recent_data])
        tech_relevance = np.mean([data["tech_relevance"] for data in recent_data])

        return {
            "sentiment_score": sentiment_score,
            "polarity_distribution": polarity_distribution,
            "trend": trend,
            "volatility": volatility,
            "financial_relevance_avg": financial_relevance,
            "tech_relevance_avg": tech_relevance,
            "data_points": len(recent_data),
        }

    def _get_empty_sentiment_indicators(self) -> Dict:
        """空のセンチメント指標"""
        return {
            "sentiment_score": 0.0,
            "polarity_distribution": {"positive": 0, "negative": 0, "neutral": 1},
            "trend": "stable",
            "volatility": 0.0,
            "financial_relevance_avg": 0.0,
            "tech_relevance_avg": 0.0,
            "data_points": 0,
        }

    def get_sentiment_features(self, sentiment_indicators: Dict) -> List[float]:
        """センチメント特徴量生成"""
        return [
            sentiment_indicators["sentiment_score"],
            sentiment_indicators.get("polarity_distribution", {}).get("positive", 0),
            sentiment_indicators.get("polarity_distribution", {}).get("negative", 0),
            1 if sentiment_indicators["trend"] == "improving" else 0,
            -1 if sentiment_indicators["trend"] == "declining" else 0,
            sentiment_indicators["volatility"],
            sentiment_indicators["financial_relevance_avg"],
            sentiment_indicators["tech_relevance_avg"],
        ]


def test_sentiment_analysis():
    """センチメント分析テスト"""
    logger.info("センチメント分析システムテスト開始")

    if not NLP_AVAILABLE:
        print("ERROR: 必要なライブラリが利用できません")
        print("インストールコマンド:")
        print("pip install textblob transformers torch")
        return None

    # センチメント分析器
    analyzer = SentimentAnalyzer()

    # テストデータ
    test_texts = [
        "トヨタ自動車、業績好調で期待高まる",
        "ソフトバンク、決算予想を下方修正",
        "半導体メーカー、AI開発で成長加速",
        "日銀短観、景気回復の兆し",
        "為替変動、輸出企業に影響",
        "市場全体、不透明感から売り優勢",
        "テクノロジー株価上昇の牽引役に環境関連、新規制業への懸念広がる",
    ]

    print("センチメント分析テスト:")
    print("-" * 50)

    for text in test_texts:
        result = analyzer.analyze_text_sentiment(text)
        print(f"テキスト: {text[:50]}...")
        print(f"  感情スコア: {result['sentiment']:.3f}")
        print(f"  分類: {result['polarity']}")
        print(f"  金融関連性: {result['financial_relevance']:.3f}")
        print(f"  テクノロジー関連性: {result['tech_relevance']:.3f}")
        print()

    # ニュース分析シミュレーション
    ticker = "7203.T"
    print(f"\n{ticker} ニュース分析シミュレーション:")
    print("-" * 50)

    news_data = analyzer.analyze_news_headlines(ticker, max_articles=10)
    indicators = analyzer.calculate_sentiment_indicators(news_data)

    print(f"センチメントスコア: {indicators['sentiment_score']:.3f}")
    print(f"ポジティブ分布: {indicators['polarity_distribution']}")
    print(f"トレンド: {indicators['trend']}")
    print(f"ボラティリティ: {indicators['volatility']:.3f}")

    # 特徴量生成
    sentiment_features = analyzer.get_sentiment_features(indicators)
    print(f"生成された特徴量: {len(sentiment_features)}")
    print(f"特徴量: {[f'{f:.3f}' for f in sentiment_features]}")

    print(f"\nセンチメント分析システム準備完了")
    return {
        "analyzer": analyzer,
        "test_results": test_texts,
        "news_data": news_data,
        "indicators": indicators,
        "sentiment_features": sentiment_features,
    }


if __name__ == "__main__":
    result = test_sentiment_analysis()

    if result:
        print(f"\n✅ センチメント分析システムの準備が完了しました")
        print("株価予測との統合が可能になりました")
    else:
        print("\n❌ センチメント分析システムの準備に失敗しました")
