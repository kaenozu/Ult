"""
External Data Integration - 外部データ統合
経済指標、為替、金利などの外部データを取得
"""

import logging
from datetime import timedelta
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ExternalDataProvider:
    """外部データプロバイダー"""

    def __init__(self):
        self.cache = {}
        self.cache_ttl = timedelta(hours=1)

    def get_economic_indicators(self) -> Dict:
        """
        経済指標を取得

        Returns:
            経済指標の辞書
        """
        try:
            import yfinance as yf

            indicators = {}

            # 為替レート
            usdjpy = yf.Ticker("USDJPY=X")
            hist = usdjpy.history(period="5d")
            if not hist.empty:
                indicators["usdjpy"] = {
                    "current": hist["Close"].iloc[-1],
                    "change_1d": (hist["Close"].iloc[-1] / hist["Close"].iloc[-2] - 1) * 100 if len(hist) > 1 else 0,
                }

            # 米国10年国債利回り
            tnx = yf.Ticker("^TNX")
            hist = tnx.history(period="5d")
            if not hist.empty:
                indicators["us_10yr_yield"] = {
                    "current": hist["Close"].iloc[-1],
                    "change_1d": hist["Close"].iloc[-1] - hist["Close"].iloc[-2] if len(hist) > 1 else 0,
                }

            # VIX（恐怖指数）
            vix = yf.Ticker("^VIX")
            hist = vix.history(period="5d")
            if not hist.empty:
                indicators["vix"] = {
                    "current": hist["Close"].iloc[-1],
                    "level": (
                        "high" if hist["Close"].iloc[-1] > 25 else "normal" if hist["Close"].iloc[-1] > 15 else "low"
                    ),
                }

            # 金価格
            gold = yf.Ticker("GC=F")
            hist = gold.history(period="5d")
            if not hist.empty:
                indicators["gold"] = {
                    "current": hist["Close"].iloc[-1],
                    "change_1d": (hist["Close"].iloc[-1] / hist["Close"].iloc[-2] - 1) * 100 if len(hist) > 1 else 0,
                }

            # 原油価格
            oil = yf.Ticker("CL=F")
            hist = oil.history(period="5d")
            if not hist.empty:
                indicators["oil"] = {
                    "current": hist["Close"].iloc[-1],
                    "change_1d": (hist["Close"].iloc[-1] / hist["Close"].iloc[-2] - 1) * 100 if len(hist) > 1 else 0,
                }

            return indicators

        except Exception as e:
            logger.error(f"Economic indicators error: {e}")
            return {}

    def get_market_sentiment_score(self) -> float:
        """
        市場全体のセンチメントスコアを計算

        Returns:
            -1.0 (極度の弱気) ~ 1.0 (極度の強気)
        """
        try:
            indicators = self.get_economic_indicators()

            score = 0.0

            # VIXスコア
            vix = indicators.get("vix", {})
            if vix:
                level = vix.get("level", "normal")
                if level == "low":
                    score += 0.3
                elif level == "high":
                    score -= 0.3

            # 為替スコア（円安は株高）
            usdjpy = indicators.get("usdjpy", {})
            if usdjpy:
                change = usdjpy.get("change_1d", 0)
                score += np.clip(change * 0.1, -0.2, 0.2)

            # 金利スコア（金利上昇は株安）
            yield_data = indicators.get("us_10yr_yield", {})
            if yield_data:
                change = yield_data.get("change_1d", 0)
                score -= np.clip(change * 0.1, -0.2, 0.2)

            return np.clip(score, -1.0, 1.0)

        except Exception as e:
            logger.error(f"Sentiment score error: {e}")
            return 0.0

    def get_macro_features(self) -> pd.DataFrame:
        """
        マクロ経済特徴量をDataFrameで返す

        Returns:
            マクロ特徴量のDataFrame
        """
        indicators = self.get_economic_indicators()

        features = {
            "usdjpy": indicators.get("usdjpy", {}).get("current", 150),
            "vix": indicators.get("vix", {}).get("current", 20),
            "us_10yr": indicators.get("us_10yr_yield", {}).get("current", 4.0),
            "gold": indicators.get("gold", {}).get("current", 2000),
            "oil": indicators.get("oil", {}).get("current", 80),
            "market_sentiment": self.get_market_sentiment_score(),
        }

        return pd.DataFrame([features])


# シングルトン
_provider = None


def get_external_data() -> ExternalDataProvider:
    global _provider
    if _provider is None:
        _provider = ExternalDataProvider()
    return _provider
