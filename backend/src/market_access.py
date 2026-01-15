"""
Global Market Access - 世界市場アクセス
日本株、米国株、暗号資産、為替への統一アクセスインターフェースを提供
"""

import logging
from datetime import datetime
from typing import Dict

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class GlobalMarketAccess:
    """世界市場データアクセスクラス"""

    # 監視対象アセット定義
    ASSETS = {
        # 日本株 (代表)
        "JP_NIKKEI": "^N225",
        "JP_TOYOTA": "7203.T",
        "JP_SONY": "6758.T",
        # 米国株 (代表)
        "US_SP500": "^GSPC",
        "US_NASDAQ": "^IXIC",
        "US_NVDA": "NVDA",
        "US_ADBE": "ADBE",  # 質問にあったAdobe
        "US_TSLA": "TSLA",
        "US_AAPL": "AAPL",
        # 暗号資産 (24h)
        "CRYPTO_BTC": "BTC-USD",
        "CRYPTO_ETH": "ETH-USD",
        "CRYPTO_SOL": "SOL-USD",
        # 商品・為替
        "COMM_GOLD": "GC=F",
        "FX_USDJPY": "JPY=X",
    }

    def __init__(self):
        pass

    def fetch_global_data(self, period: str = "1y", interval: str = "1d") -> Dict[str, pd.DataFrame]:
        """
        全グローバルアセットのデータを取得
        """
        tickers = list(self.ASSETS.values())
        try:
            # 一括ダウンロード
            data = yf.download(
                tickers,
                period=period,
                interval=interval,
                group_by="ticker",
                auto_adjust=True,
                threads=True,
            )

            result = {}
            for name, ticker in self.ASSETS.items():
                if ticker in data.columns.levels[0]:  # MultiIndex check
                    df = data[ticker].copy()
                elif ticker in data.columns:  # Singleticker check scenario
                    # yfinance behavior differs by version/single tier
                    df = pd.DataFrame(data[ticker])
                else:
                    # 構造によっては data[ticker] で取れる場合とそうでない場合がある
                    # バージョン差異吸収のため、個別にチェック
                    continue

                # 最低限のクリーニング
                df = df.dropna()
                if not df.empty:
                    result[name] = df

            return result
        except Exception as e:
            logger.error(f"Global data fetch error: {e}")
            return {}

    def get_market_status(self) -> Dict[str, bool]:
        """
        各市場が開いているか判定（簡易版）
        ※タイムゾーン考慮が必要だが、ここでは現在時刻と曜日で簡易判定
        """
        now = datetime.now()
        weekday = now.weekday()  # 0=Mon, 6=Sun

        # Crypto: Always Open
        status = {"CRYPTO": True}

        # JP: Mon-Fri 9:00-15:00 JST (簡易)
        is_weekday = 0 <= weekday <= 4
        status["JP"] = is_weekday and (9 <= now.hour < 15)

        # US: Mon-Fri 23:30-06:00 JST (夏時間など厳密には複雑だが簡易定義)
        # 日本時間の夜〜早朝
        status["US"] = is_weekday and (now.hour >= 23 or now.hour < 6)

        return status


# シングルトン
_market_access = None


def get_global_market_access() -> GlobalMarketAccess:
    global _market_access
    if _market_access is None:
        _market_access = GlobalMarketAccess()
    return _market_access
