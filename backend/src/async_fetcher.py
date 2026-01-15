"""
Async Data Fetcher - 非同期データ取得
並列でデータを取得して高速化
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


class AsyncDataFetcher:
    """非同期データ取得"""

    def __init__(self, max_workers: int = 8):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def fetch_multiple_sync(
        self, tickers: List[str], period: str = "1y", interval: str = "1d"
    ) -> Dict[str, pd.DataFrame]:
        """
        複数銘柄を並列で取得（同期版）

        Args:
            tickers: 銘柄リスト
            period: 取得期間
            interval: データ間隔

        Returns:
            {ticker: DataFrame}のマップ
        """
        from concurrent.futures import as_completed

        import yfinance as yf

        results = {}

        def fetch_one(ticker: str) -> tuple:
            try:
                data = yf.download(ticker, period=period, interval=interval, progress=False)
                return (ticker, data)
            except Exception as e:
                logger.warning(f"Failed to fetch {ticker}: {e}")
                return (ticker, pd.DataFrame())

        futures = {self.executor.submit(fetch_one, ticker): ticker for ticker in tickers}

        for future in as_completed(futures):
            ticker = futures[future]
            try:
                result_ticker, data = future.result(timeout=30)
                if not data.empty:
                    results[result_ticker] = data
            except Exception as e:
                logger.warning(f"Future error for {ticker}: {e}")

        logger.info(f"Fetched {len(results)}/{len(tickers)} tickers")
        return results

    async def fetch_multiple_async(self, tickers: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """
        複数銘柄を非同期で取得

        Args:
            tickers: 銘柄リスト
            period: 取得期間

        Returns:
            {ticker: DataFrame}のマップ
        """
        loop = asyncio.get_event_loop()

        async def fetch_one(ticker: str) -> tuple:
            import yfinance as yf

            try:
                data = await loop.run_in_executor(
                    self.executor,
                    lambda: yf.download(ticker, period=period, progress=False),
                )
                return (ticker, data)
            except Exception as e:
                logger.warning(f"Async fetch error for {ticker}: {e}")
                return (ticker, pd.DataFrame())

        tasks = [fetch_one(ticker) for ticker in tickers]
        results_list = await asyncio.gather(*tasks)

        results = {ticker: data for ticker, data in results_list if not data.empty}
        return results

    def fetch_with_cache(
        self, tickers: List[str], period: str = "1y", cache: Optional[Dict] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        キャッシュを活用してデータ取得

        Args:
            tickers: 銘柄リスト
            period: 取得期間
            cache: 既存キャッシュ

        Returns:
            {ticker: DataFrame}のマップ
        """
        if cache is None:
            cache = {}

        # キャッシュにないものだけ取得
        missing = [t for t in tickers if t not in cache]

        if missing:
            new_data = self.fetch_multiple_sync(missing, period)
            cache.update(new_data)

        return {t: cache[t] for t in tickers if t in cache}

    def close(self):
        """リソース解放"""
        self.executor.shutdown(wait=False)


# シングルトン
_fetcher = None


def get_async_fetcher() -> AsyncDataFetcher:
    global _fetcher
    if _fetcher is None:
        _fetcher = AsyncDataFetcher(max_workers=8)
    return _fetcher
