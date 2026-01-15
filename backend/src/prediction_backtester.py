"""
予測バックテストエンジン
過去データで予測の精度を検証し、各モデルのパフォーマンスを評価します。
"""

import logging
import traceback
from datetime import timedelta
from typing import Dict, List

import numpy as np
import pandas as pd

from .data_loader import fetch_fundamental_data, fetch_stock_data

try:
    from .enhanced_ensemble_predictor import EnhancedEnsemblePredictor
except ImportError:
    EnhancedEnsemblePredictor = None

logger = logging.getLogger(__name__)


class PredictionBacktester:
    def __init__(self):
        self.predictor = EnhancedEnsemblePredictor()

    def run_backtest(self, ticker: str, start_date: str, end_date: str, prediction_days: int = 5, fast_mode: bool = False) -> Dict:
        """
        指定期間で予測のバックテストを実行

        Args:
            ticker: ティッカーシンボル
            start_date: バックテスト開始日 (YYYY-MM-DD)
            end_date: バックテスト終了日 (YYYY-MM-DD)
            prediction_days: 予測日数
            fast_mode: 高速モード（Scout Mode）を使用するかどうか

        Returns:
            バックテスト結果の辞書
        """
        try:
            logger.info(f"Starting backtest for {ticker}: {start_date} to {end_date} (Fast Mode: {fast_mode})")

            # データ取得
            data_map = fetch_stock_data([ticker], period="2y")
            df = data_map.get(ticker)

            if df is None or df.empty:
                return {"error": f"データ取得失敗: {ticker}"}
            
            if isinstance(df, tuple):
                logger.warning(f"Data for {ticker} is a tuple, taking first element")
                df = df[0]

            # ファンダメンタルズ取得（通常モードまたはFastモードでも一応取得、重ければスキップ可）
            # Scoutモードならファンダメンタルズ取得をスキップして高速化
            fundamentals = None
            if not fast_mode:
                fundamentals = fetch_fundamental_data(ticker)

            # 日付範囲をフィルタ
            start_dt = pd.to_datetime(start_date).tz_localize(None)
            end_dt = pd.to_datetime(end_date).tz_localize(None)

            # インデックスを確実にナイーブにする
            if df.index.tz is not None:
                df.index = df.index.tz_localize(None)

            # バックテスト期間内の各日で予測を実行
            predictions = []

            # 予測を行う日付リストを生成（週次でサンプリング）
            test_dates = pd.date_range(start=start_dt, end=end_dt, freq="W")

            for test_date in test_dates:
                try:
                    test_date_naive = test_date.tz_localize(None) if test_date.tz else test_date
                    logger.info(f"Processing backtest loop for test_date: {test_date_naive}")

                    historical_data = df[df.index < test_date_naive]
                    logger.info(f"Historical data size: {len(historical_data)}")

                    if len(historical_data) < 50:
                        logger.warning(
                            f"Insufficient historical data for {test_date_naive}: {len(historical_data)} rows. Skipping."
                        )
                        continue

                    # 予測実行
                    # 予測実行
                    if fast_mode:
                        result = self._predict_scout(historical_data, prediction_days)
                    else:
                        result = self.predictor.predict_trajectory(
                            historical_data,
                            days_ahead=prediction_days,
                            ticker=ticker,
                            fundamentals=fundamentals,
                        )

                    if "error" in result:
                        logger.warning(f"Prediction failed for {test_date_naive}: {result['error']}")
                        continue

                    # 実際の結果を取得
                    future_date = test_date_naive + timedelta(days=prediction_days)
                    future_data = df[(df.index >= test_date_naive) & (df.index <= future_date)]

                    logger.info(f"Future data size (for validation): {len(future_data)} (Goal: {prediction_days})")
                    
                    # Debug types
                    # logger.info(f"Type of future_data: {type(future_data)}")
                    # logger.info(f"Type of future_data['Close']: {type(future_data.get('Close'))}")

                    if len(future_data) < prediction_days:
                        logger.warning(f"Insufficient future data for validation at {test_date_naive}. Skipping.")
                        continue

                    # 予測値と実際の値を記録
                    predicted_price = result["predictions"][-1]
                    
                    # Safe access
                    try:
                        if isinstance(future_data, tuple):
                             logger.error(f"future_data is a tuple! {future_data}")
                             future_data = future_data[0]
                        
                        actual_price_obj = future_data["Close"]
                        if isinstance(actual_price_obj, tuple):
                             logger.error(f"future_data['Close'] is a tuple! {actual_price_obj}")
                             actual_price = actual_price_obj[0].iloc[-1]
                        else:
                             actual_price = actual_price_obj.iloc[-1]
                             
                        current_price_obj = historical_data["Close"]
                        if isinstance(current_price_obj, tuple):
                             logger.error(f"historical_data['Close'] is a tuple! {current_price_obj}")
                             current_price = current_price_obj[0].iloc[-1]
                        else:
                             current_price = current_price_obj.iloc[-1]
                             
                    except Exception as e:
                        logger.error(f"Error accessing prices: {e}. future_data type: {type(future_data)}")
                        raise e

                    predicted_change_pct = (predicted_price - current_price) / current_price * 100
                    actual_change_pct = (actual_price - current_price) / current_price * 100

                    predictions.append(
                        {
                            "date": test_date_naive,
                            "current_price": current_price,
                            "predicted_price": predicted_price,
                            "actual_price": actual_price,
                            "predicted_change_pct": predicted_change_pct,
                            "actual_change_pct": actual_change_pct,
                            "predicted_trend": result["trend"],
                            "actual_trend": (
                                "UP" if actual_change_pct > 1 else "DOWN" if actual_change_pct < -1 else "FLAT"
                            ),
                            "models_used": result["details"].get("models_used", []),
                            "trend_votes": result["details"].get("trend_votes", {}),
                            "fundamental_score": (
                                result["details"].get("fundamental", {}).get("score", None)
                                if result["details"].get("fundamental")
                                else None
                            ),
                        }
                    )
                except Exception as e:
                    logger.error(f"Error in backtest loop for {test_date}: {e}")
                    logger.error(traceback.format_exc())
                    continue

            if not predictions:
                return {"error": "有効な予測データがありません"}

            # 精度指標の計算
            metrics = self._calculate_metrics(predictions)

            # 株価データを辞書リストに変換
            historical_prices = df[["Open", "High", "Low", "Close"]].reset_index()
            historical_prices.columns = ["date", "open", "high", "low", "close"]
            historical_prices["date"] = historical_prices["date"].dt.strftime("%Y-%m-%d")
            historical_data = historical_prices.to_dict("records")

            return {
                "ticker": ticker,
                "start_date": start_date,
                "end_date": end_date,
                "prediction_days": prediction_days,
                "total_predictions": len(predictions),
                "predictions": predictions,
                "metrics": metrics,
                "historical_data": historical_data,
            }

        except Exception as e:
            logger.error(f"Backtest error: {e}")
            import traceback

            traceback.print_exc()
            return {"error": str(e)}

    def _predict_scout(self, data: pd.DataFrame, days_ahead: int) -> Dict:
        """
        Scout Mode: 高速なテクニカル分析のみによる予測
        """
        # 単純な移動平均とRSIを使用
        # 計算を高速化するため、直近のデータのみで計算
        
        # SMA計算
        close = data["Close"]
        sma5 = close.rolling(window=5).mean().iloc[-1]
        sma20 = close.rolling(window=20).mean().iloc[-1]
        
        # RSI計算 (簡易)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        current_price = close.iloc[-1]
        
        # 簡易ロジック
        sentiment = 0 # -1 to 1
        
        # SMAトレンド
        if sma5 > sma20:
            sentiment += 0.5
        else:
            sentiment -= 0.5
            
        # RSI逆張り/順張り
        if rsi > 70:
            sentiment -= 0.3 # 買われすぎ
        elif rsi < 30:
            sentiment += 0.3 # 売られすぎ
        elif rsi > 50:
            sentiment += 0.1 # モメンタム
        else:
            sentiment -= 0.1
            
        # 予測変動率（かなり単純化）
        # sentiment 1.0 -> +3%
        predicted_change_pct = sentiment * 0.03
        
        predicted_price = current_price * (1 + predicted_change_pct)
        
        trend = "FLAT"
        if predicted_change_pct > 0.01:
            trend = "UP"
        elif predicted_change_pct < -0.01:
            trend = "DOWN"
            
        return {
            "predictions": [predicted_price],
            "predicted_price": predicted_price,
            "predicted_change_pct": predicted_change_pct * 100,
            "trend": trend,
            "confidence": 0.5, # Scoutは自信半分
            "details": {
                "models_used": ["Scout(SMA+RSI)"],
                "trend_votes": {"Scout": trend},
            },
        }

    def _calculate_metrics(self, predictions: List[Dict]) -> Dict:
        """
        予測精度の指標を計算
        """
        # 方向性の正解率（UP/DOWN/FLATが一致したか）
        direction_correct = sum(1 for p in predictions if p["predicted_trend"] == p["actual_trend"])
        direction_accuracy = direction_correct / len(predictions) * 100

        # 平均絶対誤差（MAE）
        mae = np.mean([abs(p["predicted_change_pct"] - p["actual_change_pct"]) for p in predictions])

        # 平均二乗誤差の平方根（RMSE）
        rmse = np.sqrt(np.mean([(p["predicted_change_pct"] - p["actual_change_pct"]) ** 2 for p in predictions]))

        # 予測に従って取引した場合のWin Rate
        # UP予測で実際UP、またはDOWN予測で実際DOWN
        profitable_trades = sum(
            1
            for p in predictions
            if (p["predicted_trend"] == "UP" and p["actual_change_pct"] > 0)
            or (p["predicted_trend"] == "DOWN" and p["actual_change_pct"] < 0)
        )

        # FLAT予測は除外
        tradable_predictions = [p for p in predictions if p["predicted_trend"] != "FLAT"]
        win_rate = (profitable_trades / len(tradable_predictions) * 100) if tradable_predictions else 0

        # 信頼区間（95%）
        errors = [p["predicted_change_pct"] - p["actual_change_pct"] for p in predictions]
        confidence_interval = 1.96 * np.std(errors)

        return {
            "direction_accuracy": direction_accuracy,
            "mae": mae,
            "rmse": rmse,
            "win_rate": win_rate,
            "confidence_interval_95": confidence_interval,
            "total_samples": len(predictions),
            "tradable_samples": len(tradable_predictions),
        }

    def compare_models(self, ticker: str, start_date: str, end_date: str) -> Dict:
        """
        各モデルのパフォーマンスを比較

        注: 現在のEnsemblePredictorは各モデルを個別に実行しているので、
        details から各モデルの予測を取得して評価できます。
        """
        # 実装は複雑になるため、まずは統合アンサンブルのみを評価
        # 将来的には各モデル単体のバックテストも追加可能
        pass
