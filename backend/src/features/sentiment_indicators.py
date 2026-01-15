"""市場感情指標統合モジュール

Fear & Greed Index, Put/Call Ratio, VIX先物カーブを取得・分析
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional, Tuple

import requests
import yfinance as yf

logger = logging.getLogger(__name__)


class MarketSentiment(Enum):
    """市場センチメントレベル"""

    EXTREME_FEAR = "Extreme Fear"
    FEAR = "Fear"
    NEUTRAL = "Neutral"
    GREED = "Greed"
    EXTREME_GREED = "Extreme Greed"


@dataclass
class SentimentData:
    """センチメントデータコンテナ"""

    fear_greed_index: Optional[float] = None
    fear_greed_label: Optional[str] = None
    vix_current: Optional[float] = None
    vix_ma20: Optional[float] = None
    vix_percentile: Optional[float] = None
    put_call_ratio: Optional[float] = None
    vix_term_structure: Optional[str] = None  # "contango" or "backwardation"
    overall_sentiment: Optional[MarketSentiment] = None
    timestamp: Optional[datetime] = None


class SentimentIndicators:
    """市場感情指標統合クラス"""

    # CNN Fear & Greed API (非公式)
    FEAR_GREED_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"

    # VIX関連シンボル
    VIX_SYMBOLS = {
        "spot": "^VIX",
        "futures_1m": "VX=F",  # 第1限月
        "futures_2m": "VXc2",  # 第2限月
    }

    # Put/Call Ratio関連
    PCR_SYMBOL = "^PCALL"  # CBOE Total Put/Call Ratio

    def __init__(self, cache_ttl_minutes: int = 15):
        """初期化

        Args:
            cache_ttl_minutes: キャッシュ有効期間（分）
        """
        self.cache_ttl = timedelta(minutes=cache_ttl_minutes)
        self._cache: Optional[SentimentData] = None
        self._cache_timestamp: Optional[datetime] = None

    def get_sentiment(self, force_refresh: bool = False) -> SentimentData:
        """統合センチメントデータを取得

        Args:
            force_refresh: キャッシュを無視して再取得

        Returns:
            SentimentDataオブジェクト
        """
        if not force_refresh and self._is_cache_valid():
            return self._cache

        data = SentimentData(timestamp=datetime.now())

        # 1. Fear & Greed Index
        fg_value, fg_label = self._fetch_fear_greed()
        data.fear_greed_index = fg_value
        data.fear_greed_label = fg_label

        # 2. VIXデータ
        vix_data = self._fetch_vix_data()
        data.vix_current = vix_data.get("current")
        data.vix_ma20 = vix_data.get("ma20")
        data.vix_percentile = vix_data.get("percentile")
        data.vix_term_structure = vix_data.get("term_structure")

        # 3. Put/Call Ratio
        data.put_call_ratio = self._fetch_put_call_ratio()

        # 4. 統合センチメント判定
        data.overall_sentiment = self._calculate_overall_sentiment(data)

        # キャッシュ更新
        self._cache = data
        self._cache_timestamp = datetime.now()

        return data

    def _is_cache_valid(self) -> bool:
        """キャッシュ有効性チェック"""
        if self._cache is None or self._cache_timestamp is None:
            return False
        return datetime.now() - self._cache_timestamp < self.cache_ttl

    def _fetch_fear_greed(self) -> Tuple[Optional[float], Optional[str]]:
        """СNN Fear & Greed Indexを取得"""
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            response = requests.get(self.FEAR_GREED_URL, headers=headers, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if "fear_and_greed" in data:
                    fg = data["fear_and_greed"]
                    value = fg.get("score", fg.get("value"))
                    label = fg.get("rating", fg.get("label", ""))
                    return float(value) if value else None, label
        except Exception as e:
            logger.warning(f"Fear & Greed fetch failed: {e}")

        return None, None

    def _fetch_vix_data(self) -> Dict[str, Any]:
        """VIX関連データを取得"""
        result = {}

        try:
            # スポットVIX
            vix = yf.Ticker(self.VIX_SYMBOLS["spot"])
            hist = vix.history(period="6mo")

            if not hist.empty:
                result["current"] = float(hist["Close"].iloc[-1])
                result["ma20"] = float(hist["Close"].rolling(20).mean().iloc[-1])

                # パーセンタイル計算（6ヶ月間での位置）
                current = result["current"]
                percentile = (hist["Close"] < current).mean() * 100
                result["percentile"] = float(percentile)

            # VIX先物カーブ（コンタンゴ/バックワーデーション）
            try:
                vx1 = yf.Ticker(self.VIX_SYMBOLS["futures_1m"])
                vx1_hist = vx1.history(period="5d")

                if not vx1_hist.empty and result.get("current"):
                    futures_price = float(vx1_hist["Close"].iloc[-1])
                    spot_price = result["current"]

                    if futures_price > spot_price * 1.02:
                        result["term_structure"] = "contango"
                    elif futures_price < spot_price * 0.98:
                        result["term_structure"] = "backwardation"
                    else:
                        result["term_structure"] = "flat"
            except Exception:
                result["term_structure"] = None

        except Exception as e:
            logger.warning(f"VIX fetch failed: {e}")

        return result

    def _fetch_put_call_ratio(self) -> Optional[float]:
        """Put/Call Ratioを取得"""
        try:
            # Yahoo Financeから取得試行
            pcr = yf.Ticker(self.PCR_SYMBOL)
            hist = pcr.history(period="5d")

            if not hist.empty:
                return float(hist["Close"].iloc[-1])
        except Exception:
            pass

        # フォールバック: VIXベースの推定値
        try:
            vix = yf.Ticker("^VIX")
            hist = vix.history(period="5d")
            if not hist.empty:
                vix_val = float(hist["Close"].iloc[-1])
                # VIXからPCRを推定（簡易近似）
                estimated_pcr = 0.7 + (vix_val - 15) * 0.02
                return max(0.5, min(1.5, estimated_pcr))
        except Exception:
            pass

        return None

    def _calculate_overall_sentiment(self, data: SentimentData) -> MarketSentiment:
        """統合センチメントを算出"""
        scores = []

        # Fear & Greedスコア (0-100)
        if data.fear_greed_index is not None:
            scores.append(data.fear_greed_index)

        # VIXベーススコア (高VIX = 恐怖)
        if data.vix_current is not None:
            # VIX 10-40 を 100-0 にマッピング
            vix_score = max(0, min(100, 100 - (data.vix_current - 10) * 3.33))
            scores.append(vix_score)

        # PCRベーススコア (高PCR = 恐怖)
        if data.put_call_ratio is not None:
            # PCR 0.5-1.5 を 100-0 にマッピング
            pcr_score = max(0, min(100, 100 - (data.put_call_ratio - 0.5) * 100))
            scores.append(pcr_score)

        if not scores:
            return MarketSentiment.NEUTRAL

        avg_score = sum(scores) / len(scores)

        if avg_score <= 20:
            return MarketSentiment.EXTREME_FEAR
        elif avg_score <= 40:
            return MarketSentiment.FEAR
        elif avg_score <= 60:
            return MarketSentiment.NEUTRAL
        elif avg_score <= 80:
            return MarketSentiment.GREED
        else:
            return MarketSentiment.EXTREME_GREED

    def get_trading_recommendation(self) -> Dict[str, Any]:
        """センチメントに基づく取引推奨を取得"""
        data = self.get_sentiment()

        recommendations = {
            MarketSentiment.EXTREME_FEAR: {
                "action": "BUY_AGGRESSIVE",
                "position_multiplier": 1.5,
                "reason": "極度の恐怖は買い時。逆張り推奨。",
            },
            MarketSentiment.FEAR: {
                "action": "BUY",
                "position_multiplier": 1.2,
                "reason": "恐怖局面。慈重な買い増し推奨。",
            },
            MarketSentiment.NEUTRAL: {
                "action": "HOLD",
                "position_multiplier": 1.0,
                "reason": "中立局面。通常のポジション維持。",
            },
            MarketSentiment.GREED: {
                "action": "REDUCE",
                "position_multiplier": 0.8,
                "reason": "買気過熱。ポジション縮小推奨。",
            },
            MarketSentiment.EXTREME_GREED: {
                "action": "SELL_PARTIAL",
                "position_multiplier": 0.5,
                "reason": "極度の買気。大幅なポジション縮小推奨。",
            },
        }

        sentiment = data.overall_sentiment or MarketSentiment.NEUTRAL
        rec = recommendations.get(sentiment, recommendations[MarketSentiment.NEUTRAL])

        return {
            "sentiment_data": {
                "fear_greed_index": data.fear_greed_index,
                "fear_greed_label": data.fear_greed_label,
                "vix_current": data.vix_current,
                "vix_percentile": data.vix_percentile,
                "put_call_ratio": data.put_call_ratio,
                "vix_term_structure": data.vix_term_structure,
                "overall_sentiment": sentiment.value,
            },
            "recommendation": rec,
            "timestamp": data.timestamp.isoformat() if data.timestamp else None,
        }


# シングルトン
_sentiment_instance: Optional[SentimentIndicators] = None


def get_sentiment_indicators() -> SentimentIndicators:
    """シングルトンインスタンスを取得"""
    global _sentiment_instance
    if _sentiment_instance is None:
        _sentiment_instance = SentimentIndicators()
    return _sentiment_instance
