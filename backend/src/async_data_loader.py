"""
非同期データローダー

asyncioとaiohttpを使用して、複数銘柄のデータを並列取得します。
Streamlitの同期的な実行環境でも使用できるよう、同期ラッパー関数も提供します。
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import aiohttp
import nest_asyncio
import pandas as pd
import yfinance as yf

from src.data_manager import DataManager

# Streamlit環境でもasyncioを使えるようにする
nest_asyncio.apply()

logger = logging.getLogger(__name__)


class AsyncDataLoader:
    """非同期データローダー"""

    def __init__(self, db_path: str = "stock_data.db"):
        self.db = DataManager(db_path)

    async def fetch_ticker_async(
        self,
        session: aiohttp.ClientSession,
        ticker: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> tuple[str, Optional[pd.DataFrame]]:
        """
        単一銘柄のデータを非同期で取得

        Args:
            session: aiohttp ClientSession
            ticker: 銘柄コード
            period: データ期間

        Returns:
            (ticker, DataFrame) のタプル
        """
        try:
            # 1. キャッシュを確認
            cached_result = self._check_and_return_cache(ticker, period)
            if cached_result:
                return cached_result

            # 2. データをダウンロード
            df = await self._download_and_validate_data(ticker, period, interval)

            # 3. データをDBに保存し、結果を返す
            return self._save_and_return_data(ticker, df)

        except Exception as e:
            logger.error(f"Error fetching {ticker}: {e}")
            return (ticker, None)

    def _check_and_return_cache(self, ticker: str, period: str) -> Optional[tuple[str, pd.DataFrame]]:
        """DBのキャッシュを確認し、最新であれば返す"""
        # まずDBキャッシュをチェック
        end_date = datetime.now()
        start_date = self._parse_period(period, end_date)

        cached_df = self.db.load_data(ticker, start_date=start_date.strftime("%Y-%m-%d"))

        # キャッシュが最新かチェック（DataFrameであることを確認）
        if isinstance(cached_df, pd.DataFrame) and not cached_df.empty:
            try:
                latest_cached = pd.to_datetime(cached_df.index[-1]).date()
                if latest_cached >= (datetime.now() - timedelta(days=1)).date():
                    logger.info(f"Using cached data for {ticker}")
                    return (ticker, cached_df)
            except Exception as e:
                logger.warning(f"Error checking cache date for {ticker}: {e}")
        return None

    async def _download_and_validate_data(self, ticker: str, period: str, interval: str) -> Optional[pd.DataFrame]:
        """yfinanceからデータをダウンロードし、型をチェックする"""
        # yfinanceは同期的なので、executor内で実行
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, self._download_yfinance, ticker, period, interval)

        # ダウンロード結果の型チェック
        if not isinstance(df, pd.DataFrame):
            if df is not None:
                logger.error(f"Downloaded non-DataFrame for {ticker}: {type(df)}")
            return None
        return df

    def _save_and_return_data(self, ticker: str, df: Optional[pd.DataFrame]) -> tuple[str, Optional[pd.DataFrame]]:
        """データをDBに保存し、(ticker, df)を返す"""
        if df is not None and not df.empty:
            # DBに保存
            try:
                self.db.save_data(df, ticker)
                logger.info(f"Downloaded and cached data for {ticker}")
            except Exception as e:
                logger.error(f"Error saving data for {ticker}: {e}")
            return (ticker, df)
        else:
            logger.warning(f"No data retrieved for {ticker}")
            return (ticker, None)

    def _download_yfinance(self, ticker: str, period: str, interval: str = "1d") -> Optional[pd.DataFrame]:
        """yfinanceでデータをダウンロード（同期処理）"""
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period=period, interval=interval)

            # DataFrameでない場合はログに記録
            if not isinstance(df, pd.DataFrame):
                logger.error(f"yfinance returned non-DataFrame for {ticker}: {type(df)}")
                return None

            if df.empty:
                logger.warning(f"Empty DataFrame for {ticker}")
                return None

            # カラム名を統一
            df = df.rename(
                columns={
                    "Open": "Open",
                    "High": "High",
                    "Low": "Low",
                    "Close": "Close",
                    "Volume": "Volume",
                }
            )

            # 不要なカラムを削除
            keep_cols = ["Open", "High", "Low", "Close", "Volume"]
            df = df[[col for col in keep_cols if col in df.columns]]

            logger.info(f"Successfully downloaded {len(df)} rows for {ticker}")
            return df

        except Exception as e:
            logger.error(f"yfinance error for {ticker}: {e}", exc_info=True)
            return None

    def _parse_period(self, period: str, end_date: datetime) -> datetime:
        """期間文字列をdatetimeに変換"""
        period_map = {
            "1d": timedelta(days=1),
            "5d": timedelta(days=5),
            "1mo": timedelta(days=30),
            "3mo": timedelta(days=90),
            "6mo": timedelta(days=180),
            "1y": timedelta(days=365),
            "2y": timedelta(days=730),
            "5y": timedelta(days=1825),
            "10y": timedelta(days=3650),
        }

        delta = period_map.get(period, timedelta(days=365))
        return end_date - delta

    async def fetch_multiple_async(
        self,
        tickers: List[str],
        period: str = "1y",
        interval: str = "1d",
        max_concurrent: int = 10,
    ) -> Dict[str, pd.DataFrame]:
        """
        複数銘柄のデータを並列取得

        Args:
            tickers: 銘柄コードのリスト
            period: データ期間
            max_concurrent: 最大同時接続数

        Returns:
            {ticker: DataFrame} の辞書
        """
        # Semaphoreで同時接続数を制限
        semaphore = asyncio.Semaphore(max_concurrent)

        async def fetch_with_semaphore(session, ticker):
            async with semaphore:
                return await self.fetch_ticker_async(session, ticker, period, interval)

        # aiohttp sessionを作成
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # 全銘柄を並列取得
            tasks = [fetch_with_semaphore(session, ticker) for ticker in tickers]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # 結果を辞書に変換
        data_map = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Task failed with exception: {result}")
                continue
            ticker, df = result
            if df is not None:
                data_map[ticker] = df

        logger.info(f"Successfully fetched {len(data_map)}/{len(tickers)} tickers")
        return data_map

    def fetch_multiple_sync(
        self,
        tickers: List[str],
        period: str = "1y",
        interval: str = "1d",
        max_concurrent: int = 10,
    ) -> Dict[str, pd.DataFrame]:
        """
        複数銘柄のデータを並列取得（同期ラッパー）

        Streamlitなどの同期環境から呼び出し可能

        Args:
            tickers: 銘柄コードのリスト
            period: データ期間
            max_concurrent: 最大同時接続数

        Returns:
            {ticker: DataFrame} の辞書
        """
        try:
            # イベントループを取得または作成
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            # 非同期関数を実行
            return loop.run_until_complete(self.fetch_multiple_async(tickers, period, interval, max_concurrent))
        except Exception as e:
            logger.error(f"Error in sync wrapper: {e}")
            # フォールバック: 従来の同期処理
            return self._fetch_multiple_fallback(tickers, period)

    def _fetch_multiple_fallback(self, tickers: List[str], period: str) -> Dict[str, pd.DataFrame]:
        """フォールバック: 同期的に順次取得"""
        logger.warning("Falling back to synchronous data fetching")
        data_map = {}

        for ticker in tickers:
            try:
                end_date = datetime.now()
                start_date = self._parse_period(period, end_date)

                # DBから読み込み
                cached_df = self.db.load_data(ticker, start_date=start_date.strftime("%Y-%m-%d"))

                if isinstance(cached_df, pd.DataFrame) and not cached_df.empty:
                    try:
                        latest_cached = pd.to_datetime(cached_df.index[-1]).date()
                        if latest_cached >= (datetime.now() - timedelta(days=1)).date():
                            data_map[ticker] = cached_df
                            continue
                    except Exception as e:
                        logger.warning(f"Error checking cache for {ticker}: {e}")

                # ダウンロード
                df = self._download_yfinance(ticker, period)
                if df is not None and not df.empty:
                    self.db.save_data(df, ticker)
                    data_map[ticker] = df

            except Exception as e:
                logger.error(f"Error fetching {ticker}: {e}")
                continue

        return data_map


# グローバルインスタンス
_async_loader = None


def get_async_loader() -> AsyncDataLoader:
    """AsyncDataLoaderのシングルトンインスタンスを取得"""
    global _async_loader
    if _async_loader is None:
        _async_loader = AsyncDataLoader()
    return _async_loader


def fetch_stock_data_async(tickers: List[str], period: str = "1y", max_concurrent: int = 10) -> Dict[str, pd.DataFrame]:
    """
    複数銘柄のデータを非同期で並列取得（エントリーポイント）

    この関数はStreamlitから直接呼び出せる同期関数です。
    内部で非同期処理を実行し、データを並列取得します。

    Args:
        tickers: 銘柄コードのリスト
        period: データ期間 (例: "1y", "2y", "5y")
        max_concurrent: 最大同時接続数（デフォルト: 10）

    Returns:
        {ticker: DataFrame} の辞書

    Example:
        >>> data = fetch_stock_data_async(["AAPL", "GOOGL", "MSFT"], period="1y")
        >>> print(f"Got data for {len(data)} tickers")
    """
    loader = get_async_loader()
    return loader.fetch_multiple_sync(tickers, period, max_concurrent)


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    test_tickers = ["7203.T", "9984.T", "6758.T", "8306.T", "9432.T"]

    print(f"Testing async data loading for {len(test_tickers)} tickers...")
    import time

    start = time.time()
    data = fetch_stock_data_async(test_tickers, period="1y", max_concurrent=5)
    elapsed = time.time() - start

    print("\nResults:")
    print(f"  Fetched: {len(data)}/{len(test_tickers)} tickers")
    print(f"  Time: {elapsed:.2f} seconds")
    print(f"  Average: {elapsed / len(test_tickers):.2f} sec/ticker")

    for ticker, df in data.items():
        if df is not None:
            print(f"  {ticker}: {len(df)} rows, latest: {df.index[-1]}")
