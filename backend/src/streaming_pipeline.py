"""
ストリーミング予測パイプライン

リアルタイムデータを受け取り、特徴量を更新して予測を実行します。
"""

import logging
from typing import Any, Dict, List

import pandas as pd

from src.features import add_advanced_features
from src.realtime_alerts import get_alert_manager
from src.strategies import AttentionLSTMStrategy, GRUStrategy, LightGBMStrategy

logger = logging.getLogger(__name__)


class StreamingPipeline:
    """
    ストリーミング予測パイプライン

    リアルタイムデータ -> 特徴量更新 -> モデル推論 -> シグナル判定 -> アラート
    の流れを制御します。
    """

    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.strategies = {}
        self.alert_manager = get_alert_manager()
        self.historical_data: Dict[str, pd.DataFrame] = {}
        self.is_initialized = False

    def initialize(self, tickers: List[str], lookback_days: int = 60):
        """
        パイプラインの初期化

        Args:
            tickers: 監視対象ティッカー
            lookback_days: 履歴データの期間
        """
        logger.info("Initializing streaming pipeline...")

        # 1. 戦略のロード（学習済みモデルがあればロード、なければ新規作成）
        self._load_strategies()

        # 2. 履歴データのロード（特徴量計算用）
        from src.data_loader import fetch_stock_data

        # 期間を少し長めに取ってテクニカル指標の計算に必要な期間を確保
        period = f"{lookback_days + 30}d"
        data = fetch_stock_data(tickers, period=period)

        for ticker, df in data.items():
            if not df.empty:
                # 特徴量を事前に計算しておく
                df_feat = add_advanced_features(df)
                self.historical_data[ticker] = df_feat
                logger.info(f"Loaded historical data for {ticker}: {len(df)} rows")

        self.is_initialized = True
        logger.info("Pipeline initialized")

    def _load_strategies(self):
        """戦略のロード"""
        # ここでは簡易的に戦略インスタンスを作成
        # 本来は学習済みモデルをファイルからロードすべき
        self.strategies = {
            "LightGBM": LightGBMStrategy(),
            "GRU": GRUStrategy(),
            "AttentionLSTM": AttentionLSTMStrategy(),
        }

        # 学習済みフラグを立てる（デモ用、実際はロード時に判定）
        # 注意: 実際には学習データでtrain()を呼ぶか、save/loadの実装が必要

    def process_update(self, updated_data: Dict[str, pd.DataFrame]):
        """
        データ更新時の処理

        Args:
            updated_data: {ticker: new_dataframe}
        """
        if not self.is_initialized:
            logger.warning("Pipeline not initialized")
            return

        results = {}

        for ticker, new_df in updated_data.items():
            if ticker not in self.historical_data:
                continue

            try:
                # 1. データの統合
                # 最新の1行だけが来る想定だが、念のためマージ
                current_df = self.historical_data[ticker]

                # インデックス（日時）で結合・更新
                # update()はインデックスが一致する場合のみ更新するので、
                # 新しい行を追加するためにconcatを使用
                combined_df = pd.concat([current_df, new_df])

                # 重複削除（indexの重複を削除、最新を残す）
                combined_df = combined_df[~combined_df.index.duplicated(keep="last")]

                # ソート
                combined_df = combined_df.sort_index()

                # 履歴データを更新（メモリ節約のため一定期間で切り詰めも検討すべき）
                self.historical_data[ticker] = combined_df

                # 2. 特徴量の再計算
                # 増分更新は複雑なので、直近データに対して再計算を行う
                # 計算時間を短縮するため、直近N行のみを使用しても良いが、
                # 移動平均などが狂うので、ある程度の期間が必要

                # ここでは簡易的に全再計算（最適化の余地あり）
                df_feat = add_advanced_features(combined_df)
                self.historical_data[ticker] = df_feat

                # 3. 推論実行
                prediction_results = self._run_inference(ticker, df_feat)
                results[ticker] = prediction_results

                # 4. アラートチェック
                self._check_alerts(ticker, prediction_results, new_df.iloc[-1])

            except Exception as e:
                logger.error(f"Error processing update for {ticker}: {e}")

        return results

    def _run_inference(self, ticker: str, df: pd.DataFrame) -> Dict[str, Any]:
        """推論を実行"""
        predictions = {}
        signals = {}

        for name, strategy in self.strategies.items():
            try:
                # シグナル生成
                signal = strategy.generate_signal(df)
                signals[name] = signal

                # 信頼度取得（もしあれば）
                confidence = 0.0
                if hasattr(strategy, "get_confidence"):
                    confidence = strategy.get_confidence()

                predictions[name] = {"signal": signal, "confidence": confidence}

            except Exception as e:
                logger.error(f"Error in strategy {name} for {ticker}: {e}")

        # アンサンブル（多数決）
        buy_count = sum(1 for p in predictions.values() if p["signal"] == "BUY")
        sell_count = sum(1 for p in predictions.values() if p["signal"] == "SELL")
        total = len(predictions)

        final_signal = "HOLD"
        if buy_count > total / 2:
            final_signal = "BUY"
        elif sell_count > total / 2:
            final_signal = "SELL"

        return {
            "timestamp": df.index[-1],
            "final_signal": final_signal,
            "details": predictions,
            "buy_votes": buy_count,
            "sell_votes": sell_count,
        }

    def _check_alerts(self, ticker: str, predictions: Dict[str, Any], latest_row: pd.Series):
        """アラート条件をチェック"""

        # 判定用データ作成
        alert_data = {
            "ticker": ticker,
            "current_price": latest_row["Close"],
            "signal": predictions["final_signal"],
            "confidence": max([p["confidence"] for p in predictions["details"].values()] or [0]),
            "timestamp": predictions["timestamp"],
        }

        # 価格変動率（もし計算済みなら）
        if "price_change_pct" in latest_row:
            alert_data["price_change_pct"] = latest_row["price_change_pct"]

        # AlertManagerにチェック依頼
        self.alert_manager.check_conditions(alert_data)


# シングルトン
_pipeline = None


def get_streaming_pipeline() -> StreamingPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = StreamingPipeline()
    return _pipeline
