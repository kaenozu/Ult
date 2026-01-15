"""
Prediction Cache - 予測キャッシュ
同じ銘柄の予測を一定時間キャッシュして高速化
"""

import hashlib
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class PredictionCache:
    """予測結果キャッシュ"""

    def __init__(self, ttl_minutes: int = 30):
        self.cache: Dict[str, Dict] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self.stats = {"hits": 0, "misses": 0}

    def _make_key(self, ticker: str, days_ahead: int, data_hash: str) -> str:
        """キャッシュキーを生成"""
        return f"{ticker}_{days_ahead}_{data_hash}"

    def _hash_data(self, df) -> str:
        """データフレームのハッシュを計算"""
        try:
            # 最後の日付と終値でハッシュ
            last_date = str(df.index[-1])
            last_close = float(df["Close"].iloc[-1])
            content = f"{last_date}_{last_close:.2f}"
            return hashlib.md5(content.encode()).hexdigest()[:8]
        except Exception:
            return datetime.now().strftime("%Y%m%d%H%M")

    def get(self, ticker: str, days_ahead: int, df) -> Optional[Dict]:
        """キャッシュから予測を取得"""
        data_hash = self._hash_data(df)
        key = self._make_key(ticker, days_ahead, data_hash)

        if key in self.cache:
            entry = self.cache[key]
            if datetime.now() - entry["timestamp"] < self.ttl:
                self.stats["hits"] += 1
                logger.debug(f"Cache hit for {ticker}")
                return entry["prediction"]
            else:
                # 期限切れ
                del self.cache[key]

        self.stats["misses"] += 1
        return None

    def set(self, ticker: str, days_ahead: int, df, prediction: Dict):
        """予測をキャッシュに保存"""
        data_hash = self._hash_data(df)
        key = self._make_key(ticker, days_ahead, data_hash)

        self.cache[key] = {"prediction": prediction, "timestamp": datetime.now()}

        # キャッシュサイズ制限（最大100件）
        if len(self.cache) > 100:
            self._cleanup()

    def _cleanup(self):
        """古いエントリを削除"""
        now = datetime.now()
        expired = [k for k, v in self.cache.items() if now - v["timestamp"] > self.ttl]
        for k in expired:
            del self.cache[k]

        # まだ多い場合は古い順に削除
        if len(self.cache) > 80:
            sorted_entries = sorted(self.cache.items(), key=lambda x: x[1]["timestamp"])
            for k, _ in sorted_entries[:20]:
                del self.cache[k]

    def invalidate(self, ticker: str = None):
        """キャッシュを無効化"""
        if ticker:
            # 特定銘柄のキャッシュを削除
            keys_to_delete = [k for k in self.cache if k.startswith(f"{ticker}_")]
            for k in keys_to_delete:
                del self.cache[k]
        else:
            # 全削除
            self.cache.clear()

    def get_stats(self) -> Dict:
        """キャッシュ統計を取得"""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = self.stats["hits"] / total if total > 0 else 0

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": hit_rate,
            "cache_size": len(self.cache),
        }


# シングルトン
_cache = None


def get_prediction_cache() -> PredictionCache:
    global _cache
    if _cache is None:
        _cache = PredictionCache(ttl_minutes=30)
    return _cache


def cached_prediction(func):
    """予測関数用のキャッシュデコレータ"""

    @wraps(func)
    def wrapper(self, df, days_ahead=5, ticker=None, *args, **kwargs):
        if ticker:
            cache = get_prediction_cache()

            # キャッシュチェック
            cached = cache.get(ticker, days_ahead, df)
            if cached:
                return cached

            # 予測実行
            result = func(self, df, days_ahead, ticker, *args, **kwargs)

            # キャッシュ保存
            if "error" not in result:
                cache.set(ticker, days_ahead, df, result)

            return result
        else:
            return func(self, df, days_ahead, ticker, *args, **kwargs)

    return wrapper
