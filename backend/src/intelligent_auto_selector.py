"""
Intelligent Auto Selector - 最善の予測を自動選択
全モデルの予測結果を分析し、最も信頼性の高い結果を自動選択するシステム
"""

import logging
from datetime import datetime
from typing import Dict

import pandas as pd

logger = logging.getLogger(__name__)


class IntelligentAutoSelector:
    """
    最善の予測を自動選択するインテリジェントシステム

    以下の要素を統合して最適な判断を下します:
        pass
    1. アンサンブル予測（5モデル）
    2. 強化学習シグナル
    3. FinBERTセンチメント
    4. オンライン学習による適応
    5. メタ学習による最適化
    """

    def __init__(self):
        self.ensemble_predictor = None
        self.online_lgbm = None
        self.meta_optimizer = None
        self._initialize()

    def _initialize(self):
        """各コンポーネントを初期化"""
        try:
            from src.enhanced_ensemble_predictor import EnhancedEnsemblePredictor

            self.ensemble_predictor = EnhancedEnsemblePredictor()
            logger.info("EnhancedEnsemblePredictor initialized with advanced models + RL + FinBERT")
        except Exception as e:
            logger.error(f"Failed to init EnsemblePredictor: {e}")

        try:
            from src.online_lgbm import get_online_lgbm

            self.online_lgbm = get_online_lgbm()
            logger.info("Online Learning LightGBM initialized")
        except Exception as e:
            logger.warning(f"Online Learning not available: {e}")

        try:
            from src.meta_optimizer import get_meta_optimizer

            self.meta_optimizer = get_meta_optimizer()
            logger.info("Meta Optimizer initialized")
        except Exception as e:
            logger.warning(f"Meta Optimizer not available: {e}")

        # Phase 50: Performance enhancers
        try:
            from src.prediction_cache import get_prediction_cache

            self.cache = get_prediction_cache()
            logger.info("Prediction Cache initialized (30min TTL)")
        except Exception as e:
            self.cache = None
            logger.warning(f"Prediction Cache not available: {e}")

        try:
            from src.ensemble_weight_optimizer import get_weight_optimizer

            self.weight_optimizer = get_weight_optimizer()
            logger.info("Ensemble Weight Optimizer initialized")
        except Exception as e:
            self.weight_optimizer = None
            logger.warning(f"Weight Optimizer not available: {e}")

        try:
            from src.batch_inference import get_batch_engine

            self.batch_engine = get_batch_engine()
            logger.info("Batch Inference Engine initialized")
        except Exception as e:
            self.batch_engine = None
            logger.warning(f"Batch Engine not available: {e}")

        # Phase 51: Advanced enhancements
        try:
            from src.external_data import get_external_data

            self.external_data = get_external_data()
            logger.info("External Data Provider initialized")
        except Exception:
            self.external_data = None

        try:
            from src.lazy_loader import get_lazy_loader

            self.lazy_loader = get_lazy_loader()
            logger.info("Lazy Model Loader initialized (6 models registered)")
        except Exception:
            self.lazy_loader = None

        try:
            from src.persistent_cache import get_persistent_cache

            self.persistent_cache = get_persistent_cache()
            logger.info("Persistent Cache (SQLite) initialized")
        except Exception:
            self.persistent_cache = None

        try:
            from src.multi_task_learner import get_multi_task_predictor

            self.multi_task = get_multi_task_predictor()
            logger.info("Multi-Task Predictor initialized")
        except Exception:
            self.multi_task = None

    def get_best_prediction(self, df: pd.DataFrame, ticker: str, days_ahead: int = 5) -> Dict:
        """
        最善の予測を取得

        全モデルの結果を分析し、信頼性スコアに基づいて最善の予測を選択します。

        Args:
            df: 価格データ
            ticker: 銘柄コード
            days_ahead: 予測日数

        Returns:
            最善の予測結果
        """
        try:
            # Phase 50: キャッシュチェック
            if self.cache:
                cached = self.cache.get(ticker, days_ahead, df)
                if cached:
                    logger.debug(f"Cache hit for {ticker}")
                    return cached

            # 1. オンライン学習でモデルを更新（必要に応じて）
            if self.online_lgbm:
                self.online_lgbm.update_if_needed(df)

            # 2. メタ学習で最適化（必要に応じて）
            if self.meta_optimizer:
                self.meta_optimizer.optimize_if_needed(df)

            # 3. アンサンブル予測を実行
            if not self.ensemble_predictor:
                return {"error": "Ensemble predictor not available"}

            result = self.ensemble_predictor.predict_trajectory(df=df, days_ahead=days_ahead, ticker=ticker)

            if "error" in result:
                return result

            # 4. 信頼性スコアを計算
            confidence_score = self._calculate_confidence(result)

            # 5. 結果に追加情報を付与
            result["auto_selector"] = {
                "confidence_score": confidence_score,
                "confidence_level": self._get_confidence_level(confidence_score),
                "recommendation": self._get_recommendation(result, confidence_score),
                "model_agreement": self._check_model_agreement(result),
                "timestamp": datetime.now().isoformat(),
            }

            # Phase 50: キャッシュに保存
            if self.cache and "error" not in result:
                self.cache.set(ticker, days_ahead, df, result)

            return result

        except Exception as e:
            logger.error(f"Auto selector error: {e}")
            return {"error": str(e)}

    def _calculate_confidence(self, result: Dict) -> float:
        """
        総合信頼性スコアを計算 (0.0 ~ 1.0)
        """
        score = 0.5  # ベーススコア

        details = result.get("details", {})

        # 1. モデル合意度 (+0.2)
        trend_votes = details.get("trend_votes", {})
        max_votes = max(trend_votes.values()) if trend_votes else 0
        total_votes = sum(trend_votes.values()) if trend_votes else 1
        agreement = max_votes / total_votes if total_votes > 0 else 0
        score += agreement * 0.2

        # 2. RL信号の信頼度 (+0.1)
        rl_signal = details.get("rl_signal", {})
        if rl_signal and rl_signal.get("status") != "error":
            rl_confidence = rl_signal.get("confidence", 0)
            score += rl_confidence * 0.1

        # 3. センチメント一致 (+0.1)
        sentiment = details.get("sentiment", {})
        if sentiment and sentiment.get("status") == "ok":
            sent_score = sentiment.get("score", 0)
            trend = result.get("trend", "FLAT")

            # トレンドとセンチメントが一致していれば加点
            if (trend == "UP" and sent_score > 0) or (trend == "DOWN" and sent_score < 0):
                score += 0.1

        # 4. 変化率の妥当性 (+0.1)
        change_pct = abs(result.get("change_pct", 0))
        if 0.5 < change_pct < 10:  # 0.5%~10%の変化は妥当
            score += 0.1

        return min(max(score, 0.0), 1.0)

    def _get_confidence_level(self, score: float) -> str:
        """信頼度レベルを文字列で返す"""
        if score >= 0.8:
            return "非常に高い"
        elif score >= 0.6:
            return "高い"
        elif score >= 0.4:
            return "中程度"
        else:
            return "低い"

    def _get_recommendation(self, result: Dict, confidence: float) -> str:
        """推奨アクションを生成"""
        trend = result.get("trend", "FLAT")
        change_pct = result.get("change_pct", 0)

        if confidence >= 0.7:
            if trend == "UP" and change_pct > 2:
                return "強い買いシグナル - 積極的なエントリー推奨"
            elif trend == "UP":
                return "買いシグナル - エントリー検討"
            elif trend == "DOWN" and change_pct < -2:
                return "強い売りシグナル - ポジション解消推奨"
            elif trend == "DOWN":
                return "売りシグナル - ポジション縮小検討"
            else:
                return "様子見 - 明確なトレンドなし"
        elif confidence >= 0.5:
            if trend == "UP":
                return "やや買い優勢 - 少額でのエントリー検討"
            elif trend == "DOWN":
                return "やや売り優勢 - リスク管理を意識"
            else:
                return "中立 - 追加情報待ち"
        else:
            return "低信頼度 - 取引見送り推奨"

    def _check_model_agreement(self, result: Dict) -> Dict:
        """各モデルの合意状況を確認"""
        details = result.get("details", {})

        models = {
            "LSTM": details.get("lstm_trend", "N/A"),
            "LightGBM": details.get("lgbm_trend", "N/A"),
            "Prophet": details.get("prophet_trend", "N/A"),
            "SMA": details.get("sma_trend", "N/A"),
            "Transformer": details.get("transformer_trend", "N/A"),
        }

        # RL信号も追加
        rl_signal = details.get("rl_signal", {})
        if rl_signal and "action" in rl_signal:
            action = rl_signal.get("action", "HOLD")
            models["RL (DQN)"] = "UP" if action == "BUY" else "DOWN" if action == "SELL" else "FLAT"

        # 合意度計算
        trends = [t for t in models.values() if t != "N/A"]
        if trends:
            from collections import Counter

            counts = Counter(trends)
            majority_trend, majority_count = counts.most_common(1)[0]
            agreement_rate = majority_count / len(trends)
        else:
            majority_trend = "UNKNOWN"
            agreement_rate = 0

        return {
            "models": models,
            "majority_trend": majority_trend,
            "agreement_rate": agreement_rate,
        }

    def get_trading_signal(self, df: pd.DataFrame, ticker: str, current_position: int = 0) -> Dict:
        """
        取引シグナルを生成

        Args:
            df: 価格データ
            ticker: 銘柄コード
            current_position: 現在のポジション (0: なし, 1: ロング)

        Returns:
            取引シグナル
        """
        prediction = self.get_best_prediction(df, ticker)

        if "error" in prediction:
            return {"action": "HOLD", "error": prediction["error"]}

        auto_info = prediction.get("auto_selector", {})
        confidence = auto_info.get("confidence_score", 0)
        trend = prediction.get("trend", "FLAT")

        # 取引判断
        action = "HOLD"
        reason = ""

        if confidence >= 0.6:
            if trend == "UP" and current_position == 0:
                action = "BUY"
                reason = f"上昇トレンド予測 (信頼度: {confidence:.0%})"
            elif trend == "DOWN" and current_position == 1:
                action = "SELL"
                reason = f"下落トレンド予測 (信頼度: {confidence:.0%})"
            else:
                reason = f"現在のポジションを維持 (信頼度: {confidence:.0%})"
        else:
            reason = f"信頼度が低いため取引見送り ({confidence:.0%})"

        return {
            "action": action,
            "reason": reason,
            "confidence": confidence,
            "trend": trend,
            "prediction": prediction,
        }


# シングルトンインスタンス
_auto_selector = None


def get_auto_selector() -> IntelligentAutoSelector:
    global _auto_selector
    if _auto_selector is None:
        _auto_selector = IntelligentAutoSelector()
    return _auto_selector


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    from src.data_loader import fetch_stock_data

    # テスト
    selector = get_auto_selector()

    data_map = fetch_stock_data(["7203.T"], period="1y")
    df = data_map.get("7203.T")

    if df is not None:
        result = selector.get_best_prediction(df, "7203.T")

        print("=" * 60)
        print("Intelligent Auto Selector Result")
        print("=" * 60)
        print(f"Trend: {result.get('trend')}")
        print(f"Change: {result.get('change_pct', 0):+.2f}%")

        auto_info = result.get("auto_selector", {})
        print(f"Confidence: {auto_info.get('confidence_score', 0):.0%}")
        print(f"Level: {auto_info.get('confidence_level')}")
        print(f"Recommendation: {auto_info.get('recommendation')}")

        agreement = auto_info.get("model_agreement", {})
        print(f"Model Agreement: {agreement.get('agreement_rate', 0):.0%}")
