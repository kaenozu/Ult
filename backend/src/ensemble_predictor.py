"""
高度なアンサンブル予測モジュール

既存のアンサンブル予測に以下の高度な機能を統合:
- 新しい予測モデル（Transformer、AttentionLSTMなど）
- 拡張特徴量エンジニアリング
- ハイパーパラメータ最適化
- 高度なアンサンブル手法（Stacking、動的重み付けなど）
- 学習データ品質向上の前処理
- 継続的学習と概念ドリフト検出
- センチメント分析と代替データ統合
- リートフォリオリスク調整
- XAI説明可能性
- リートリアルタイムデータ処理
- MLOps管理
- シナリオ分析とストレステスト
"""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
try:
    import tensorflow as tf
except ImportError:
    tf = None

from src.advanced_ensemble import create_model_diversity_ensemble
from src.advanced_models import AdvancedModels

# 新しい高度な機能のインポート
try:
    from src.continual_learning import ConceptDriftDetector, ContinualLearningSystem
    from src.data_loader import fetch_external_data
    from src.data_preprocessing import preprocess_for_prediction
    from src.features.enhanced_features import generate_enhanced_features
    from src.fundamental_analyzer import FundamentalAnalyzer
    from src.future_predictor import FuturePredictor
    from src.hyperparameter_optimizer import MultiModelOptimizer
    from src.lgbm_predictor import LGBMPredictor
    from src.mlops_manager import MLopsManager
    from src.multi_asset_analytics import MultiAssetPredictor
    from src.prophet_predictor import ProphetPredictor
    from src.realtime_analytics import RealTimeAnalyticsPipeline
    from src.risk_adjusted_prediction import RiskAdjustedPredictor
    from src.scenario_analyzer import ScenarioBasedPredictor
    from src.sentiment_analytics import SentimentEnhancedPredictor
    from src.transformer_predictor import TransformerPredictor
    from src.xai_explainer import XAIFramework
except ImportError:
    # Set to None for missing modules
    ConceptDriftDetector = None
    ContinualLearningSystem = None
    fetch_external_data = None
    preprocess_for_prediction = None
    generate_enhanced_features = None
    FundamentalAnalyzer = None
    FuturePredictor = None
    MultiModelOptimizer = None
    LGBMPredictor = None
    MLopsManager = None
    MultiAssetPredictor = None
    ProphetPredictor = None
    RealTimeAnalyticsPipeline = None
    RiskAdjustedPredictor = None
    ScenarioBasedPredictor = None
    SentimentEnhancedPredictor = None
    TransformerPredictor = None
    XAIFramework = None

logger = logging.getLogger(__name__)


class EnhancedEnsemblePredictor:
    """高度なアンサンブル予測器（統合されたAI予測システム）"""

    def __init__(self):
        # 既存モデル
        self.lstm_predictor = FuturePredictor()
        self.lgbm_predictor = LGBMPredictor()
        self.prophet_predictor = ProphetPredictor()
        self.fundamental_analyzer = FundamentalAnalyzer()

        # 新しいモデル
        self.transformer_predictor = TransformerPredictor()

        # 基本重み（新実装では動的重み付けが可能）
        self.base_weights = {
            "lstm": 0.20,
            "lgbm": 0.20,
            "prophet": 0.15,
            "transformer": 0.20,  # 新規追加
            "attention_lstm": 0.15,  # 新規追加
            "cnn_lstm": 0.10,  # 新規追加
        }

        # 新しいモデルインスタンス
        self.advanced_models = {}
        self.optimizer = None
        self.ensemble_method = "stacking"  # 'stacking', 'dynamic', 'diversity', 'confidence'

        # 特徴量エンジニアリングの設定
        self.use_enhanced_features = True
        self.use_preprocessing = True

        # 新しい高度な機能の初期化
        self.continual_learning = ContinualLearningSystem(base_model=self.lstm_predictor)
        self.multi_asset_predictor = MultiAssetPredictor()
        self.xai_framework = None  # 後で初期化
        self.realtime_pipeline = None  # 後で初期化
        self.sentiment_predictor = SentimentEnhancedPredictor(self)
        self.risk_predictor = RiskAdjustedPredictor(self)
        self.mlops_manager = MLopsManager()
        self.scenario_predictor = ScenarioBasedPredictor(self)

        # 概念ドリフト検出器
        self.concept_drift_detector = ConceptDriftDetector()

        # 予測履歴（継続的学習用）
        self.prediction_history = []
        self.performance_history = []

        # リートフォリオ最適化用
        self.portfolio_weights = {}

        # センチメントスコアキャッシュ
        self.sentiment_cache = {}

        logger.info("Enhanced Ensemble Predictor initialized with all advanced features")

    def _prepare_advanced_models(self, df: pd.DataFrame, days_ahead: int) -> Dict[str, any]:
        """新しいモデルの準備と学習"""
        models = {}

        try:
            # 前処理と拡張特徴量の適用
            if self.use_preprocessing:
                df_processed, scaler = preprocess_for_prediction(df.copy())
            else:
                df_processed = df.copy()

            external_features: Dict = {}
            try:
                ext = fetch_external_data(period="6mo")
                if ext and isinstance(ext, dict) and ext.get("VIX") is not None:
                    external_features["vix"] = ext["VIX"]
            except Exception:
                external_features = {}

            if self.use_enhanced_features:
                df_features = generate_enhanced_features(df_processed, external_features=external_features)
            else:
                df_features = df_processed

            # 数値カラムのみを抽出
            numeric_cols = df_features.select_dtypes(include=[np.number]).columns.tolist()
            feature_cols = [col for col in numeric_cols if col != "Close"]  # ターゲット以外

            if len(feature_cols) < 1:
                logger.warning("Not enough features for advanced models")
                return models

            # 特徴量とターゲットの準備
            feature_data = df_features[feature_cols].values
            target_data = df_features["Close"].values

            # 過去データからシーケンスを作成
            sequence_length = min(30, len(df_features) // 3)  # 十分なデータがある場合
            if sequence_length < 5:
                logger.warning("Insufficient data for sequence models")
                return models

            X, y = [], []
            for i in range(sequence_length, len(feature_data) - days_ahead + 1):
                X.append(feature_data[i - sequence_length : i])
                y.append(target_data[i + days_ahead - 1])

            if len(X) < 2:  # 少なくとも2つのサンプルが必要
                logger.warning("Not enough samples for model training")
                return models

            X = np.array(X, dtype=np.float32)
            y = np.array(y, dtype=np.float32)

            # AdvancedModelsからモデルを構築
            input_shape = (None, sequence_length, len(feature_cols))

            # Attention LSTM
            try:
                models["attention_lstm"] = AdvancedModels.build_attention_lstm(input_shape, days_ahead)
                # 学習
                models["attention_lstm"].fit(X, y, epochs=10, batch_size=16, verbose=0)
            except Exception as e:
                logger.warning(f"Failed to build Attention LSTM: {e}")

            # CNN-LSTM
            try:
                models["cnn_lstm"] = AdvancedModels.build_cnn_lstm(input_shape, days_ahead)
                # 学習
                models["cnn_lstm"].fit(X, y, epochs=10, batch_size=16, verbose=0)
            except Exception as e:
                logger.warning(f"Failed to build CNN-LSTM: {e}")

            # もう1つのTransformerモデル
            try:
                models["nbeats"] = AdvancedModels.build_nbeats(input_shape, days_ahead)
                # 学習
                models["nbeats"].fit(X, y, epochs=10, batch_size=16, verbose=0)
            except Exception as e:
                logger.warning(f"Failed to build N-BEATS: {e}")

        except Exception as e:
            logger.error(f"Error preparing advanced models: {e}")

        return models

    def select_horizon_by_sharpe(self, performance_log: Optional[pd.DataFrame] = None) -> str:
        """
        直近のパフォーマンス（例: equity/return列）からシャープ比が高いホライズンを選択する簡易ルール。
        """
        if performance_log is None or performance_log.empty:
            return "short"
        perf = performance_log.copy()
        if "return" not in perf.columns:
            return "short"
        perf["roll_mean"] = perf["return"].rolling(30, min_periods=5).mean()
        perf["roll_std"] = perf["return"].rolling(30, min_periods=5).std()
        perf["sharpe"] = perf["roll_mean"] / (perf["roll_std"] + 1e-6) * (252**0.5)
        latest = perf["sharpe"].iloc[-1]
        if latest > 1.0:
            return "mid"  # 5日ホライズンのような中期を優先
        elif latest < 0:
            return "short"  # 守り: 短期
        return "long"

    def predict_trajectory(
        self,
        df: pd.DataFrame,
        days_ahead: int = 5,
        ticker: Optional[str] = None,
        fundamentals: Optional[Dict] = None,
        enable_sentiment: bool = True,
        enable_risk_adjustment: bool = True,
        enable_scenario_analysis: bool = True,
        enable_continual_learning: bool = True,
        enable_xai: bool = True,
    ) -> Dict:
        """
        高度なアンサンブル予測を実行（統合AI予測システム）

        Args:
            df: 価格データ
            days_ahead: 予測日数
            ticker: ティッカーシンボル（ファンダメンタルズ分析用）
            fundamentals: ファンダメンタルズデータ（オプション）
            enable_sentiment: センチメント分析を有効にするか
            enable_risk_adjustment: リートフォリオリスク調整を有効にするか
            enable_scenario_analysis: シナリオ分析を有効にするか
            enable_continual_learning: 継続的学習を有効にするか
            enable_xai: XAI機能を有効にするか
        """
        try:
            # 事前準備
            current_price = df["Close"].iloc[-1]
            prediction_start_time = pd.Timestamp.now()

            # 1. センチメント分析（有効な場合）
            sentiment_features = {}
            if enable_sentiment and ticker:
                sentiment_result = self.sentiment_predictor.predict_with_sentiment(ticker, df.values[-10:])
                sentiment_features = sentiment_result.get("sentiment_features", {})
                sentiment_adjustment = sentiment_result.get("sentiment_impact", 0.0)
                logger.info(f"Sentiment analysis applied for {ticker}, impact: {sentiment_adjustment:.4f}")
            else:
                sentiment_adjustment = 0.0

            # 2. ファンダメンタルズ分析（利用可能な場合）
            fundamental_result = None
            confidence_multiplier = 1.0

            if ticker and fundamentals:
                fundamental_result = self.fundamental_analyzer.analyze(ticker, fundamentals)
                confidence_multiplier = fundamental_result["confidence_multiplier"]
                logger.info(
                    f"{ticker}: ファンダメンタルズ評価={fundamental_result['valuation']}, "
                    f"スコア={fundamental_result['score']}"
                )

            # 3. 各既存モデルで予測を実行
            predictions = {}

            # LSTM予測
            lstm_result = self.lstm_predictor.predict_trajectory(df, days_ahead)
            if "error" not in lstm_result:
                predictions["lstm"] = lstm_result
                logger.info(f"LSTM予測: {lstm_result['trend']} ({lstm_result['change_pct']:+.1f}%)")
            else:
                logger.warning(f"LSTM prediction failed: {lstm_result['error']}")

            # LightGBM予測
            lgbm_result = self.lgbm_predictor.predict_trajectory(df, days_ahead)
            if "error" not in lgbm_result:
                predictions["lgbm"] = lgbm_result
                logger.info(f"LightGBM予測: {lgbm_result['trend']} ({lgbm_result['change_pct']:+.1f}%)")
            else:
                logger.warning(f"LightGBM prediction failed: {lgbm_result['error']}")

            # Prophet予測
            prophet_result = self.prophet_predictor.predict_trajectory(df, days_ahead)
            if "error" not in prophet_result:
                predictions["prophet"] = prophet_result
                logger.info(f"Prophet予測: {prophet_result['trend']} ({prophet_result['change_pct']:+.1f}%)")
            else:
                logger.warning(f"Prophet prediction failed: {prophet_result['error']}")

            # Transformer予測
            transformer_result = self.transformer_predictor.predict_trajectory(df, days_ahead)
            if "error" not in transformer_result:
                predictions["transformer"] = transformer_result
                logger.info(
                    f"Transformer予測: {transformer_result['trend']} ({transformer_result['change_pct']:+.1f}%)"
                )
            else:
                logger.warning(f"Transformer prediction failed: {transformer_result['error']}")

            # 4. 新しい高度なモデルで予測を実行
            advanced_models = self._prepare_advanced_models(df, days_ahead)

            for model_name, model in advanced_models.items():
                try:
                    # 予測の実行
                    recent_data = df.tail(30)[["Open", "High", "Low", "Close", "Volume"]].dropna()
                    if len(recent_data) >= 30:
                        # シーケンスデータの準備
                        X_recent = recent_data.values
                        # 前処理が必要な場合はここで行う

                        # モデル予測
                        pred = model.predict(X_recent.reshape(1, X_recent.shape[0], X_recent.shape[1]))
                        pred_values = pred[0]  # days_aheadの値

                        # 結果をフォーマット
                        predictions[model_name] = {
                            "current_price": current_price,
                            "predictions": pred_values.tolist(),
                            "peak_price": max(pred_values),
                            "trend": (
                                "UP"
                                if pred_values[-1] > current_price * 1.01
                                else "DOWN" if pred_values[-1] < current_price * 0.99 else "FLAT"
                            ),
                            "change_pct": (pred_values[-1] - current_price) / current_price * 100,
                        }

                        logger.info(
                            f"{model_name}予測: {predictions[model_name]['trend']} ({predictions[model_name]['change_pct']:+.1f}%)"
                        )
                except Exception as e:
                    logger.warning(f"{model_name} prediction failed: {e}")

            # 5. ベースライン予測（SMA）
            sma_result = self._predict_sma(df, days_ahead)
            predictions["sma"] = sma_result
            logger.info(f"SMA予測: {sma_result['trend']} ({sma_result['change_pct']:+.1f}%)")

            # 6. 予測が1つもない場合はエラー
            if len(predictions) < 1:
                return {"error": "全てのモデルが予測に失敗しました"}

            # 7. 高度なアンサンブル方法の選択と実施
            if len(predictions) >= 2:  # 2つ以上の予測がある場合
                # アンサンブル用のデータ準備
                available_models = list(predictions.keys())

                # 結果の統合（最初は単純平均）
                # 将来的にはAdvancedEnsembleを使用して高度な統合
                all_preds = []
                for model_name in available_models:
                    all_preds.append(predictions[model_name]["predictions"])

                # 平均を計算
                if all_preds:
                    all_preds = np.array(all_preds)
                    avg_preds = np.mean(all_preds, axis=0)
                else:
                    return {"error": "有効な予測がありません"}
            else:
                # 1つだけ予測がある場合はそれを使用
                model_name = list(predictions.keys())[0]
                avg_preds = np.array(predictions[model_name]["predictions"])

            # 8. センチメント調整
            sentiment_adj_preds = avg_preds + (avg_preds * sentiment_adjustment)

            # 9. ファンダメンタルズで調整
            adjustment_factor = (sentiment_adj_preds - current_price) / current_price
            fundamental_adj_preds = current_price + (adjustment_factor * current_price * confidence_multiplier)

            # 10. リートフォリオリスク調整（有効な場合）
            if enable_risk_adjustment:
                risk_adj_result = self.risk_predictor.predict_with_risk_adjustment(
                    df.values[-20:],  # 最近の価格データ
                    df["Close"].pct_change().dropna().values[-252:],  # 1年分のリターンデータ
                    investment_horizon=days_ahead,
                )

                # リートフォリオリターン調整
                risk_factor = risk_adj_result.get("risk_factor", 1.0)
                risk_adjusted_preds = fundamental_adj_preds * risk_factor

                logger.info(f"Risk-adjusted predictions applied with factor: {risk_factor:.4f}")
            else:
                risk_adjusted_preds = fundamental_adj_preds

            # 11. シナリオ分析（有効な場合）
            scenario_analysis_result = {}
            if enable_scenario_analysis and ticker:
                scenario_result = self.scenario_predictor.predict_with_scenarios(ticker, df, days_ahead)
                scenario_analysis_result = {
                    "scenario_risk_assessment": scenario_result.get("scenario_risk_assessment", {}),
                    "historical_comparisons": scenario_result.get("historical_comparisons", {}),
                }

                # シナリオリスクに基づく追加調整
                scenario_risk_score = scenario_analysis_result["scenario_risk_assessment"].get(
                    "scenario_risk_score", 0.0
                )
                scenario_adjustment = 1.0 - scenario_risk_score * 0.1  # シナリオリスクが高いほど予測を控えめに
                scenario_adjusted_preds = risk_adjusted_preds * scenario_adjustment
            else:
                scenario_adjusted_preds = risk_adjusted_preds

            # 12. 結果の整形
            final_predictions = scenario_adjusted_preds
            peak_price = max(final_predictions)
            peak_day_idx = list(final_predictions).index(peak_price)

            trend = "FLAT"
            if final_predictions[-1] > current_price * 1.01:
                trend = "UP"
            elif final_predictions[-1] < current_price * 0.99:
                trend = "DOWN"

            # 各モデルのトレンド集計
            trend_votes = {"UP": 0, "DOWN": 0, "FLAT": 0}
            for model_result in predictions.values():
                trend_votes[model_result["trend"]] += 1

            # 13. 予測結果の保存（継続的学習用）
            if enable_continual_learning:
                self.prediction_history.append(
                    {
                        "timestamp": prediction_start_time,
                        "ticker": ticker,
                        "expected_direction": trend,
                        "expected_change": (final_predictions[-1] - current_price) / current_price * 100,
                        "actual_outcome": None,  # 実際の結果は後で更新
                        "confidence": 0.8,  # 仮の信頼度
                    }
                )

            # 14. XAI分析（有効な場合）
            xai_explanation = {}
            if enable_xai and len(df) > 0:
                # XAIフレームワークの初期化（初回のみ）
                if self.xai_framework is None:
                    X_train = df[["Open", "High", "Low", "Close", "Volume"]].fillna(0).values[-50:]
                    self.xai_framework = XAIFramework(self, X_train)

                # XAIによる説明
                try:
                    feature_names = ["Open", "High", "Low", "Close", "Volume"]
                    X_instance = df[feature_names].fillna(0).values[-1:].astype(np.float32)
                    xai_explanation = self.xai_framework.explain_prediction(X_instance, "all", feature_names)
                except Exception as xe:
                    logger.warning(f"XAI explanation failed: {xe}")

            # 15. 概念ドリフト検出
            if len(self.performance_history) > 10:
                latest_performance = self.performance_history[-1] if self.performance_history else 0.0
                historical_avg_perf = np.mean(self.performance_history[:-1])

                drift_detected = self.concept_drift_detector.update_and_check(
                    abs(latest_performance - historical_avg_perf)
                )
                if drift_detected:
                    logger.warning(f"Concept drift detected for {ticker}!")
                    # ドリフト検出時の対応
                    # TODO: モデルの再学習や重みの再調整ロジックを追加

            return {
                "current_price": current_price,
                "predictions": final_predictions.tolist(),
                "peak_price": peak_price,
                "peak_day": peak_day_idx + 1,
                "trend": trend,
                "change_pct": (final_predictions[-1] - current_price) / current_price * 100,
                "details": {
                    "models_used": list(predictions.keys()),
                    "trend_votes": trend_votes,
                    "lstm_trend": predictions.get("lstm", {}).get("trend", "N/A"),
                    "lgbm_trend": predictions.get("lgbm", {}).get("trend", "N/A"),
                    "prophet_trend": predictions.get("prophet", {}).get("trend", "N/A"),
                    "transformer_trend": predictions.get("transformer", {}).get("trend", "N/A"),
                    "sma_trend": predictions.get("sma", {}).get("trend", "N/A"),
                    "fundamental": fundamental_result,
                    "enhanced_models_used": [name for name in advanced_models.keys() if name in predictions],
                    "sentiment_analysis": sentiment_features,
                    "scenario_analysis": scenario_analysis_result,
                    "risk_adjustment": risk_adj_result if enable_risk_adjustment else {},
                    "xai_explanation": xai_explanation,
                    "prediction_confidence": 0.8,  # 仮の信頼度（実際にはXAIやリスク指標から計算）
                    "execution_time": (pd.Timestamp.now() - prediction_start_time).total_seconds(),
                },
            }

        except Exception as e:
            logger.error(f"Enhanced Ensemble prediction error: {e}")
            import traceback

            traceback.print_exc()
            return {"error": str(e)}

    def update_prediction_performance(self, ticker: str, actual_return: float):
        """予測性能の更新（継続的学習用）"""
        # 最近の予測を検索して実際の結果と照合
        for prediction in reversed(self.prediction_history):
            if prediction["ticker"] == ticker and prediction["actual_outcome"] is None:
                prediction["actual_outcome"] = actual_return
                # 性能の計算（簡単化）
                expected_return = prediction["expected_change"]
                performance = abs(actual_return - expected_return)  # 差分の絶対値
                self.performance_history.append(performance)

                # 性能履歴を保存（最新100件まで）
                if len(self.performance_history) > 100:
                    self.performance_history = self.performance_history[-100:]

                logger.info(
                    f"Updated prediction performance for {ticker}: Expected={expected_return:.2f}%, Actual={actual_return:.2f}%"
                )
                break

    def get_portfolio_prediction(
        self, tickers_data: Dict[str, pd.DataFrame], weights: Dict[str, float], days_ahead: int = 5
    ) -> Dict[str, Any]:
        """ポートフォリオ全体の予測"""
        portfolio_predictions = {}
        total_weight = sum(weights.values())

        for ticker, df in tickers_data.items():
            weight = weights.get(ticker, 0.0) / total_weight
            if weight <= 0:
                continue

            # 各銘柄の予測
            prediction = self.predict_trajectory(df, days_ahead=days_ahead, ticker=ticker)
            if "error" not in prediction:
                portfolio_predictions[ticker] = {
                    "prediction": prediction,
                    "weight": weight,
                    "weighted_return": prediction["change_pct"] * weight,
                }

        if not portfolio_predictions:
            return {"error": "No valid predictions for portfolio"}

        # ポ合ポートフォリオリターン
        total_weighted_return = sum(item["weighted_return"] for item in portfolio_predictions.values())

        # ポ合リスク（簡略化）
        individual_returns = [item["weighted_return"] for item in portfolio_predictions.values()]
        portfolio_volatility = np.std(individual_returns) if len(individual_returns) > 1 else 0.0

        return {
            "portfolio_return_prediction": total_weighted_return,
            "portfolio_volatility": portfolio_volatility,
            "individual_predictions": portfolio_predictions,
            "tickers_analyzed": list(portfolio_predictions.keys()),
            "prediction_date": pd.Timestamp.now().isoformat(),
        }

    def run_monte_carlo_portfolio_simulation(
        self, tickers_data: Dict[str, pd.DataFrame], weights: Dict[str, float], n_simulations: int = 1000
    ) -> Dict[str, Any]:
        """モンテカルロ法によるポートフォリオシミュレーション"""
        from src.scenario_analyzer import MonteCarloSimulator

        # 各資産のリターンデータを準備
        returns_data = {}
        initial_prices = []
        weights_list = []

        for ticker, df in tickers_data.items():
            if ticker in weights:
                returns_data[ticker] = df["Close"].pct_change().dropna().values
                initial_prices.append(df["Close"].iloc[-1])
                weights_list.append(weights[ticker])

        if not returns_data:
            return {"error": "No valid return data for Monte Carlo simulation"}

        # 総額の重みで正規化
        total_weight = sum(weights_list)
        weights_array = np.array(weights_list) / total_weight

        # 共分散行列の計算
        returns_df = pd.DataFrame(returns_data)
        cov_matrix = returns_df.cov().values
        expected_returns = returns_df.mean().values

        # シミュレーション実行
        simulator = MonteCarloSimulator(n_simulations=n_simulations)
        portfolio_paths, asset_paths = simulator.simulate_portfolio(
            weights=weights_array,
            expected_returns=expected_returns,
            covariance_matrix=cov_matrix,
            initial_prices=np.array(initial_prices),
            time_horizon=1.0,  # 1年
            time_steps=252,
        )

        analysis_result = simulator.analyze_simulation_results(portfolio_paths)

        return {
            "simulation_analysis": analysis_result,
            "simulated_portfolio_paths": portfolio_paths,
            "simulated_asset_paths": asset_paths,
            "simulation_parameters": {"n_simulations": n_simulations, "time_horizon_years": 1.0, "time_steps": 252},
        }

    def start_realtime_monitoring(self, tickers: List[str]):
        """リアルタイム監視の開始"""
        if self.realtime_pipeline is None:
            self.realtime_pipeline = RealTimeAnalyticsPipeline(self)
            self.realtime_pipeline.setup_pipeline(tickers, update_frequency="1min")

        self.realtime_pipeline.start_pipeline()
        logger.info(f"Started real-time monitoring for {len(tickers)} tickers")

    def stop_realtime_monitoring(self):
        """リアルタイム監視の停止"""
        if self.realtime_pipeline:
            self.realtime_pipeline.stop_pipeline()
            logger.info("Stopped real-time monitoring")

    def get_system_status(self) -> Dict[str, Any]:
        """システム全体の状態を取得"""
        return {
            "prediction_history_count": len(self.prediction_history),
            "performance_history_count": len(self.performance_history),
            "sentiment_cache_size": len(self.sentiment_cache),
            "portfolio_weights_count": len(self.portfolio_weights),
            "concept_drift_detector_status": self.concept_drift_detector is not None,
            "mlops_manager_status": self.mlops_manager is not None,
            "xai_framework_initialized": self.xai_framework is not None,
            "realtime_pipeline_active": self.realtime_pipeline.is_active if self.realtime_pipeline else False,
            "latest_prediction_timestamp": (
                self.prediction_history[-1]["timestamp"].isoformat() if self.prediction_history else None
            ),
        }

    def _predict_sma(self, df: pd.DataFrame, days_ahead: int) -> Dict:
        """
        単純移動平均に基づく予測（ベースライン）
        直近のモメンタムを単純に延長する
        """
        current_price = df["Close"].iloc[-1]

        # 直近5日間の平均変化率
        recent_returns = df["Close"].pct_change().tail(5).mean()

        # 変化率が極端にならないようにクリップ (-3% ~ +3%)
        recent_returns = np.clip(recent_returns, -0.03, 0.03)

        predictions = []
        price = current_price

        for _ in range(days_ahead):
            price = price * (1 + recent_returns)
            predictions.append(price)

        trend = "FLAT"
        if predictions[-1] > current_price * 1.01:
            trend = "UP"
        elif predictions[-1] < current_price * 0.99:
            trend = "DOWN"

        return {
            "current_price": current_price,
            "predictions": predictions,
            "peak_price": max(predictions),
            "trend": trend,
            "change_pct": (predictions[-1] - current_price) / current_price * 100,
        }


# 既存のEnsemblePredictorを新しい実装で置き換えるか、エイリアスを設定
EnsemblePredictor = EnhancedEnsemblePredictor
