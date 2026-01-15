"""
リアルタイムデータ処理と予測更新モジュール

- ストリーミングアーキテクチャ
- イベントドリブン予測
- エッジ計算での推論
"""

import asyncio
import logging
import os
import queue
import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import pandas as pd
import tensorflow as tf
import yfinance as yf


logger = logging.getLogger(__name__)


class RealTimeDataManager:
    """リアルタイムデータバッファ"""

    def __init__(self, buffer_size: int = 1000):
        self.buffer_size = buffer_size
        # 銘柄ごとのデータを保持
        self.data_buffers: Dict[str, deque] = defaultdict(lambda: deque(maxlen=buffer_size))
        self.timestamps: Dict[str, deque] = defaultdict(lambda: deque(maxlen=buffer_size))
        self.latest_data: Dict[str, Dict] = {}
        self.lock = threading.Lock()

    def add_data(self, ticker: str, data: Dict, timestamp: Optional[datetime] = None):
        """データをバッファに追加"""
        if timestamp is None:
            timestamp = datetime.now()

        with self.lock:
            self.data_buffers[ticker].append(data)
            self.timestamps[ticker].append(timestamp)
            self.latest_data[ticker] = data

    def get_latest(self, ticker: str) -> Optional[Dict]:
        """最新データを取得"""
        with self.lock:
            return self.latest_data.get(ticker)

    def get_window(self, ticker: str, window_size: int) -> List[Dict]:
        """指定サイズの窓データを取得"""
        with self.lock:
            buffer = self.data_buffers[ticker]
            if len(buffer) >= window_size:
                return list(buffer)[-window_size:]
            else:
                return list(buffer)

    def get_buffer_size(self, ticker: str) -> int:
        """バッファサイズを取得"""
        with self.lock:
            return len(self.data_buffers[ticker])


class MarketDataStream:
    """市場データストリームハンドラー"""

    def __init__(self, tickers: List[str], update_interval: float = 1.0):
        self.tickers = tickers
        self.update_interval = update_interval
        self.data_buffer = None  # RealTimeDataBuffer not available
        self.is_streaming = False
        self.stream_thread = None
        self.callbacks = []

    def add_callback(self, callback: Callable[[str, Dict], None]):
        """コールバック関数を追加"""
        self.callbacks.append(callback)

    def start_streaming(self):
        """ストリーミングの開始"""
        if self.is_streaming:
            return

        self.is_streaming = True
        self.stream_thread = threading.Thread(target=self._stream_data, daemon=True)
        self.stream_thread.start()
        logger.info(f"Started market data streaming for {len(self.tickers)} tickers")

    def stop_streaming(self):
        """ストリーミングの停止"""
        self.is_streaming = False
        if self.stream_thread:
            self.stream_thread.join()
        logger.info("Stopped market data streaming")

    def _stream_data(self):
        """データ取得と配信"""
        while self.is_streaming:
            try:
                # 一括でデータを取得
                for ticker in self.tickers:
                    try:
                        # yfinance APIを使用して最新データを取得
                        ticker_obj = yf.Ticker(ticker)
                        hist = ticker_obj.history(period="1d", interval="1m")
                        if not hist.empty:
                            latest = hist.iloc[-1]
                            data = {
                                "Open": latest["Open"],
                                "High": latest["High"],
                                "Low": latest["Low"],
                                "Close": latest["Close"],
                                "Volume": latest["Volume"],
                                "Timestamp": hist.index[-1],
                            }
                            # データバッファに追加
                            self.data_buffer.add_data(ticker, data)

                            # コールバックの実行
                            for callback in self.callbacks:
                                try:
                                    callback(ticker, data)
                                except Exception as e:
                                    logger.error(f"Callback error for {ticker}: {e}")
                    except Exception as e:
                        logger.error(f"Error fetching data for {ticker}: {e}")

                time.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                time.sleep(self.update_interval)  # エラーでも一時停止


class EventDrivenPredictor:
    """イベントドリブン予測器"""

    def __init__(self, base_predictor: Any):
        self.base_predictor = base_predictor
        self.event_queue = queue.Queue()
        self.is_running = False
        self.worker_thread = None

        # 重要なイベントを検出するためのルール
        self.event_detection_rules = [
            self._detect_earnings_announcement,
            self._detect_macro_release,
            self._detect_price_spike,
            self._detect_volume_spike,
        ]

    def start_event_processing(self):
        """イベント処理の開始"""
        if self.is_running:
            return

        self.is_running = True
        self.worker_thread = threading.Thread(target=self._process_events, daemon=True)
        self.worker_thread.start()
        logger.info("Started event-driven prediction processor")

    def stop_event_processing(self):
        """イベント処理の停止"""
        self.is_running = False
        if self.worker_thread:
            self.worker_thread.join()
        logger.info("Stopped event-driven prediction processor")

    def _process_events(self):
        """イベントキューの処理"""
        while self.is_running:
            try:
                if not self.event_queue.empty():
                    event = self.event_queue.get(timeout=1)
                    self._handle_event(event)
                else:
                    time.sleep(0.1)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Event processing error: {e}")

    def push_event(self, event_data: Dict):
        """イベントをプッシュ"""
        self.event_queue.put(event_data)

    def _detect_earnings_announcement(self, data: Dict) -> Optional[Dict]:
        """業績発表イベントの検出"""
        # 単純化：価格が急変した場合に業績発表と仮定
        if "Close_prev" in data and "Close" in data:
            change_pct = abs((data["Close"] - data["Close_prev"]) / data["Close_prev"])
            if change_pct > 0.05:  # 5%以上の変化
                return {
                    "type": "earnings_spike",
                    "magnitude": change_pct,
                    "timestamp": data.get("Timestamp", datetime.now()),
                }
        return None

    def _detect_macro_release(self, data: Dict) -> Optional[Dict]:
        """マクロ経済指標発表イベントの検出"""
        # 例: 予測値との差が大きい場合
        # 実際には外部の経済カレンダーAPIと連携する
        return None  # ダミー

    def _detect_price_spike(self, data: Dict) -> Optional[Dict]:
        """価格スパイクの検出"""
        if "Close" in data and "MA_20" in data:  # 移動平均からの乖離
            deviation = abs((data["Close"] - data["MA_20"]) / data["MA_20"])
            if deviation > 0.03:  # 3%以上乖離
                return {
                    "type": "price_spike",
                    "magnitude": deviation,
                    "timestamp": data.get("Timestamp", datetime.now()),
                }
        return None

    def _detect_volume_spike(self, data: Dict) -> Optional[Dict]:
        """出来高スパイクの検出"""
        if "Volume" in data and "Volume_MA_20" in data:
            if data["Volume_MA_20"] > 0:
                ratio = data["Volume"] / data["Volume_MA_20"]
                if ratio > 2.0:  # 平均出来高の2倍以上
                    return {
                        "type": "volume_spike",
                        "magnitude": ratio,
                        "timestamp": data.get("Timestamp", datetime.now()),
                    }
        return None

    def check_events(self, ticker: str, current_data: Dict, previous_data: Optional[Dict] = None):
        """イベントのチェックと検出"""
        # 価格変化を計算
        if previous_data and "Close" in current_data and "Close" in previous_data:
            current_data["Close_prev"] = previous_data["Close"]

        # すべての検出ルールを適用
        detected_events = []
        for rule in self.event_detection_rules:
            try:
                event = rule(current_data)
                if event:
                    detected_events.append(event)
                    # イベントをキューに追加
                    self.push_event({"ticker": ticker, "event": event, "data": current_data})
            except Exception as e:
                logger.error(f"Event detection rule error: {e}")

        return detected_events

    def _handle_event(self, event: Dict):
        """イベントの処理"""
        ticker = event["ticker"]
        event_info = event["event"]
        data = event["data"]

        logger.info(f"Processing event for {ticker}: {event_info['type']} (magnitude: {event_info['magnitude']:.3f})")

        # イベントに基づいて予測モデルを更新または再実行
        try:
            # 特徴量エンジニアリングをイベントに応じて調整
            enhanced_features = self._add_event_features(data, event_info)

            # 予測を再実行
            prediction = self.base_predictor.predict([enhanced_features])  # 仮の実装

            logger.info(f"Updated prediction for {ticker} due to event: {prediction}")
        except Exception as e:
            logger.error(f"Error handling event for {ticker}: {e}")

    def _add_event_features(self, data: Dict, event: Dict) -> Dict:
        """イベントベースの特徴量を追加"""
        enhanced_data = data.copy()

        # イベント特徴量を追加
        event_type = event["type"]
        enhanced_data[f"event_{event_type}"] = event["magnitude"]
        enhanced_data["event_timestamp"] = event["timestamp"]

        return enhanced_data


class EdgeInferenceEngine:
    """エッジ推論エンジン"""

    def __init__(self, model: Any, optimization_level: str = "medium"):
        self.model = model
        self.optimization_level = optimization_level
        self.model_path = "models/edge_model.tflite" if optimization_level == "high" else "models/edge_model.h5"
        self.is_quantized = optimization_level in ["medium", "high"]
        self.executor = ThreadPoolExecutor(max_workers=2)

        # 最適化の適用
        self._apply_optimizations()

    def _apply_optimizations(self):
        """モデルの最適化を適用"""
        if self.is_quantized and hasattr(self.model, "predict"):
            # 量子化モデルに変換
            try:
                converter = tf.lite.TFLiteConverter.from_keras_model(self.model)
                converter.optimizations = [tf.lite.Optimize.DEFAULT]
                if self.optimization_level == "high":
                    # フルインター量子化
                    converter.representative_dataset = self._representative_data_gen
                self.tflite_model = converter.convert()

                # モデルをファイルに保存
                os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
                with open(self.model_path, "wb") as f:
                    f.write(self.tflite_model)

                logger.info("Model quantized and saved for edge inference")
            except Exception as e:
                logger.warning(f"Model quantization failed: {e}")
                self.is_quantized = False  # 失敗した場合は通常のモデルを使用

    def _representative_data_gen(self):
        """量子化用の代表データ生成"""
        # ダミーデータを生成（実際には実際のデータで置き換える）
        for _ in range(100):
            yield [np.random.random((1, 10)).astype(np.float32)]  # 例として入力形状を仮定

    def predict(self, X: np.ndarray) -> np.ndarray:
        """推論の実行"""
        if self.is_quantized:
            # TFLiteモデルを使用
            try:
                if not hasattr(self, "interpreter"):
                    self.interpreter = tf.lite.Interpreter(model_path=self.model_path)
                    self.interpreter.allocate_tensors()

                input_details = self.interpreter.get_input_details()
                output_details = self.interpreter.get_output_details()

                # 入力データを設定
                X = X.astype(np.float32)
                self.interpreter.set_tensor(input_details[0]["index"], X)

                # 推論実行
                self.interpreter.invoke()

                # 結果を取得
                output = self.interpreter.get_tensor(output_details[0]["index"])
                return output
            except Exception as e:
                logger.error(f"TFLite inference failed: {e}")
                # フールバックとして通常の推論を使用
                return self.model.predict(X)
        else:
            # 通常の推論
            return self.model.predict(X)

    def predict_async(self, X: np.ndarray) -> asyncio.Future:
        """非同期推論"""
        loop = asyncio.get_event_loop()
        return loop.run_in_executor(self.executor, self.predict, X)


class RealTimePredictionUpdater:
    """リアルタイム予測更新器"""

    def __init__(
        self,
        predictor: Any,
        data_stream: MarketDataStream,
        update_frequency: str = "1min",  # 'tick', '1min', '5min', '15min'
    ):
        self.predictor = predictor
        self.data_stream = data_stream
        self.update_frequency = update_frequency
        self.last_update_times = {}
        self.predictions_cache = {}
        self.is_active = False
        self.update_thread = None

        # イベントドリブン予測器の統合
        self.event_predictor = EventDrivenPredictor(predictor)
        self.data_stream.add_callback(self._on_data_update)

    def start_updates(self):
        """更新の開始"""
        if self.is_active:
            return

        self.is_active = True
        self.event_predictor.start_event_processing()
        self.data_stream.start_streaming()

        # 更新スレッドの開始
        self.update_thread = threading.Thread(target=self._run_updates, daemon=True)
        self.update_thread.start()
        logger.info(f"Started real-time prediction updates with frequency {self.update_frequency}")

    def stop_updates(self):
        """更新の停止"""
        self.is_active = False
        self.event_predictor.stop_event_processing()
        self.data_stream.stop_streaming()
        if self.update_thread:
            self.update_thread.join()
        logger.info("Stopped real-time prediction updates")

    def _on_data_update(self, ticker: str, data: Dict):
        """データ更新時のコールバック"""
        # 前回のデータを保存（イベント検出用）
        if ticker in self.last_update_times:
            previous_data = self.data_stream.data_buffer.get_latest(ticker)
            self.event_predictor.check_events(ticker, data, previous_data)

        # 更新時間の記録
        self.last_update_times[ticker] = datetime.now()

    def _should_update(self, ticker: str) -> bool:
        """更新が必要か判定"""
        if ticker not in self.last_update_times:
            return True

        last_update = self.last_update_times[ticker]
        now = datetime.now()

        # 更新頻度に基づいて判定
        if self.update_frequency == "tick":
            return True
        elif self.update_frequency == "1min":
            return (now - last_update).seconds >= 60
        elif self.update_frequency == "5min":
            return (now - last_update).seconds >= 300
        elif self.update_frequency == "15min":
            return (now - last_update).seconds >= 900
        else:
            return False

    def _run_updates(self):
        """更新スレッドで実行"""
        while self.is_active:
            try:
                # すべての銘柄について更新チェック
                for ticker in self.data_stream.tickers:
                    if self._should_update(ticker):
                        self._update_prediction(ticker)

                time.sleep(1)  # 1秒ごとにチェック
            except Exception as e:
                logger.error(f"Update error: {e}")
                time.sleep(5)  # エラー時は少し長めに待機

    def _update_prediction(self, ticker: str):
        """特定の銘柄の予測を更新"""
        try:
            # バッファから最新のデータを取得
            latest_data = self.data_stream.data_buffer.get_latest(ticker)
            if latest_data is None:
                return

            # 特徴量の準備（簡略化）
            features = self._prepare_features(latest_data)

            # 予測の実行
            prediction = (
                self.predictor.predict([features]) if hasattr(self.predictor, "predict") else [0.0] * 5
            )  # ダミー

            # キャッシュに保存
            self.predictions_cache[ticker] = {
                "prediction": prediction,
                "timestamp": datetime.now(),
                "features_used": features,
            }

            logger.info(f"Updated prediction for {ticker}")

        except Exception as e:
            logger.error(f"Prediction update error for {ticker}: {e}")

    def _prepare_features(self, data: Dict) -> List[float]:
        """特徴量の準備"""
        features = []

        # 価格関連
        if "Close" in data:
            features.append(data["Close"])
        if "Open" in data:
            features.append(data["Open"])
        if "High" in data:
            features.append(data["High"])
        if "Low" in data:
            features.append(data["Low"])

        # 出来高関連
        if "Volume" in data:
            features.append(data["Volume"])

        # 技術指標（簡略化）
        if "MA_5" not in data:
            # 移動平均の計算（例）
            features.append(data.get("Close", 0))
        else:
            features.append(data["MA_5"])

        # 长さを揃える（必要に応じてパディング）
        while len(features) < 10:  # 例として10次元に統一
            features.append(0.0)

        return features[:10]  # 10次元に固定

    def get_latest_prediction(self, ticker: str) -> Optional[Dict]:
        """最新の予測を取得"""
        return self.predictions_cache.get(ticker)


class RealTimeAnalyticsPipeline:
    """リアルタイム分析パイプラインの統合クラス"""

    def __init__(self, base_predictor: Any = None):
        self.base_predictor = base_predictor
        self.data_stream = None
        self.event_predictor = None
        self.edge_engine = None
        self.updater = None

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X: np.ndarray) -> np.ndarray:
        """標準的な予測インターフェース (X: 特徴量行列)"""
        # Xがデータフレームの場合は値を抽出
        if isinstance(X, pd.DataFrame):
            X = X.values

        # 予測の実行（単一の入力またはバッチに対応）
        if X.ndim == 1:
            X = X.reshape(1, -1)

        results = []
        for i in range(len(X)):
            # updaterがあればそこから最新予測を取得
            ticker = "INDEX"
            if self.updater:
                res = self.updater.get_latest_prediction(ticker)
                if res and "prediction" in res:
                    results.append(res["prediction"][0])
                else:
                    results.append(0.01)
            else:
                results.append(0.01)

        return np.array(results)

    def setup_pipeline(
        self, tickers: List[str], update_frequency: str = "1min", optimization_level: str = "medium"
    ) -> "RealTimeAnalyticsPipeline":
        """パイプラインの設定"""
        # データストリームの設定
        self.data_stream = MarketDataStream(tickers, update_interval=1.0)

        # イベントドリブン予測器
        self.event_predictor = EventDrivenPredictor(self.base_predictor)

        # エッジ推論エンジン
        self.edge_engine = EdgeInferenceEngine(self.base_predictor, optimization_level)

        # リアルタイム更新器
        self.updater = RealTimePredictionUpdater(self.edge_engine, self.data_stream, update_frequency)

        return self

    def start_pipeline(self):
        """パイプラインの開始"""
        if self.updater:
            self.updater.start_updates()
        logger.info("Real-time analytics pipeline started")

    def stop_pipeline(self):
        """パイプラインの停止"""
        if self.updater:
            self.updater.stop_updates()
        logger.info("Real-time analytics pipeline stopped")

    def get_prediction(self, ticker: str) -> Optional[Dict]:
        """特定銘柄の最新予測を取得"""
        if self.updater:
            return self.updater.get_latest_prediction(ticker)
        return None

    def get_system_status(self) -> Dict[str, Any]:
        """システム状態を取得"""
        return {
            "data_stream_active": self.data_stream.is_streaming if self.data_stream else False,
            "event_predictor_active": self.event_predictor.is_running if self.event_predictor else False,
            "updater_active": self.updater.is_active if self.updater else False,
            "cached_predictions": len(self.updater.predictions_cache) if self.updater else 0,
            "buffer_sizes": (
                {
                    ticker: self.data_stream.data_buffer.get_buffer_size(ticker) if self.data_stream else 0
                    for ticker in (self.data_stream.tickers if self.data_stream else [])
                }
                if self.data_stream
                else {}
            ),
        }


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # ダミー予測器
    class DummyPredictor:
        def predict(self, X):
            return [0.1, 0.15, 0.2, 0.18, 0.22]  # 5日分の予測

    dummy_predictor = DummyPredictor()

    # リアルタイム分析パイプラインのテスト
    pipeline = RealTimeAnalyticsPipeline(dummy_predictor)
    pipeline.setup_pipeline(["7203.T", "AAPL", "BTC-USD"], update_frequency="1min")

    # パイプラインの開始
    pipeline.start_pipeline()

    # 数秒待機
    time.sleep(5)

    # 状態の確認
    status = pipeline.get_system_status()
    print(f"System status: {status}")

    # 予測の取得
    pred = pipeline.get_prediction("7203.T")
    print(f"Latest prediction for 7203.T: {pred}")

    # パイプラインの停止
    pipeline.stop_pipeline()

    print("Real-time processing components test completed.")
