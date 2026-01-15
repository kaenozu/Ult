"""
リアルタイムデータ取得モジュール

yfinanceを使用して最新の市場データを定期的に取得します。
WebSocketが使用できないため、ポーリング方式を採用しています。
"""

import logging
import threading
import time
from datetime import datetime
from typing import Callable, Dict, List

import pandas as pd
import pytz
import yfinance as yf

logger = logging.getLogger(__name__)


class RealtimeDataLoader:
    """
    リアルタイムデータローダー

    指定されたティッカーの最新データを定期的に取得し、
    登録されたコールバック関数に通知します。
    """

    def __init__(self, tickers: List[str], interval_seconds: int = 60):
        """
        Args:
            tickers: 監視対象のティッカーリスト
            interval_seconds: ポーリング間隔（秒）
        """
        self.tickers = tickers
        self.interval_seconds = interval_seconds
        self.callbacks: List[Callable[[Dict[str, pd.DataFrame]], None]] = []
        self.is_running = False
        self.thread = None
        self.last_update: Dict[str, datetime] = {}
        self.latest_data: Dict[str, pd.DataFrame] = {}

    def add_callback(self, callback: Callable[[Dict[str, pd.DataFrame]], None]):
        """データ更新時のコールバックを追加"""
        self.callbacks.append(callback)

    def start(self):
        """監視を開始"""
        if self.is_running:
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._polling_loop, daemon=True)
        self.thread.start()
        logger.info(f"Realtime monitoring started for {len(self.tickers)} tickers")

    def stop(self):
        """監視を停止"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5.0)
        logger.info("Realtime monitoring stopped")

    def _polling_loop(self):
        """ポーリングループ"""
        while self.is_running:
            try:
                if self._is_market_open():
                    self._fetch_latest_data()
                else:
                    logger.debug("Market is closed, skipping update")

                # 次の更新まで待機
                for _ in range(self.interval_seconds):
                    if not self.is_running:
                        break
                    time.sleep(1)

            except Exception as e:
                logger.error(f"Error in polling loop: {e}")
                time.sleep(5)  # エラー時は少し待機

    def _is_market_open(self) -> bool:
        """
        市場が開いているか判定

        簡易的な判定ロジック：
        - 平日のみ
        - 9:00 - 15:00 (JST)
        ※ 実際には祝日判定や昼休みなども考慮すべきだが、
           yfinanceは閉場時でもデータ取得自体はエラーにならないため、
           ここでは簡易的な判定に留める。
        """
        now = datetime.now(pytz.timezone("Asia/Tokyo"))

        # 土日は休み
        if now.weekday() >= 5:
            return False

        # 時間判定 (9:00 - 15:00)
        # ※ PTSや時間外取引を考慮する場合は拡張が必要
        current_time = now.time()
        start_time = datetime.strptime("09:00", "%H:%M").time()
        end_time = datetime.strptime("15:00", "%H:%M").time()

        # デバッグ用に常にTrueを返すオプション（開発中のみ）
        # return True

        return start_time <= current_time <= end_time

    def _fetch_latest_data(self):
        """最新データを取得"""
        updated_data = {}

        for ticker in self.tickers:
            try:
                # 直近1日の1分足データを取得
                # interval='1m' は過去7日分までしか取得できない
                df = yf.download(ticker, period="1d", interval="1m", progress=False, auto_adjust=True)

                if df.empty:
                    continue

                # 最新の行を取得
                df.iloc[-1]
                latest_time = df.index[-1]

                # タイムゾーン情報を削除して比較
                if hasattr(latest_time, "tz_localize"):
                    latest_time_naive = latest_time.replace(tzinfo=None)
                else:
                    latest_time_naive = latest_time

                # 前回取得時より新しい場合のみ更新
                last_time = self.last_update.get(ticker)

                if last_time is None or latest_time_naive > last_time:
                    self.last_update[ticker] = latest_time_naive
                    self.latest_data[ticker] = df
                    updated_data[ticker] = df
                    logger.debug(f"Updated data for {ticker}: {latest_time}")

            except Exception as e:
                logger.error(f"Error fetching data for {ticker}: {e}")

        # コールバック呼び出し
        if updated_data:
            self._notify_callbacks(updated_data)

    def _notify_callbacks(self, data: Dict[str, pd.DataFrame]):
        """コールバックを実行"""
        for callback in self.callbacks:
            try:
                callback(data)
            except Exception as e:
                logger.error(f"Error in callback: {e}")


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    def on_update(data):
        print(f"Update received: {list(data.keys())}")
        for ticker, df in data.items():
            print(f"{ticker}: {df.index[-1]} - Close: {df['Close'].iloc[-1]}")

    # 日経平均とトヨタ
    loader = RealtimeDataLoader(["^N225", "7203.T"], interval_seconds=10)
    loader.add_callback(on_update)

    print("Starting monitoring... (Press Ctrl+C to stop)")
    loader.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        loader.stop()
