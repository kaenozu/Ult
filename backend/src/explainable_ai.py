"""
Explainable AI (XAI) Module
Uses SHAP (SHapley Additive exPlanations) to explain model predictions.
"""

import logging

import numpy as np
import shap

logger = logging.getLogger(__name__)


class ModelExplainer:
    def __init__(self):
        pass

    def explain_lgbm_prediction(self, model, X_train, X_latest, feature_names):
        """
        LightGBMモデルの予測根拠を説明する

        Args:
            model: 学習済みLightGBMモデル
            X_train: 学習に使用したデータ（SHAPのベースライン計算用）
            X_latest: 説明したい最新のデータ点（1行分の配列）
            feature_names: 特徴量の名前リスト

        Returns:
            dict: SHAP値と解釈結果
        """
        try:
            # X_latestがリストの場合、DataFrameかnumpy配列に変換
            if isinstance(X_latest, list):
                X_latest = np.array(X_latest)

            # SHAP Explainerの作成
            explainer = shap.TreeExplainer(model)

            # SHAP値の計算
            shap_values = explainer.shap_values(X_latest)

            # リスト（多クラス分類など）の場合、最初のクラスを使用
            if isinstance(shap_values, list):
                shap_values = shap_values[0]

            # numpy配列であることを確認
            if not isinstance(shap_values, np.ndarray):
                shap_values = np.array(shap_values)

            # 形状チェック: (1, n_features) または (n_features,)
            if len(shap_values.shape) > 1:
                shap_values = shap_values[-1]  # 最新のデータ点

            # 期待値（ベースライン）
            expected_value = explainer.expected_value
            if isinstance(expected_value, list) or isinstance(expected_value, np.ndarray):
                if hasattr(expected_value, "__iter__") and len(expected_value) > 0:
                    expected_value = expected_value[0]
                else:
                    # fallback for 0-d array
                    expected_value = float(expected_value)

            # 結果の整形
            explanation = []
            for name, value, shap_val in zip(feature_names, X_latest[0], shap_values):
                impact = "POSITIVE" if shap_val > 0 else "NEGATIVE"
                importance = abs(shap_val)

                explanation.append(
                    {
                        "feature": name,
                        "value": float(value),
                        "shap_value": float(shap_val),
                        "impact": impact,
                        "importance": float(importance),
                    }
                )

            # 重要度順にソート
            explanation.sort(key=lambda x: x["importance"], reverse=True)

            return {
                "base_value": float(expected_value),
                "prediction": float(expected_value + sum(shap_values)),
                "features": explanation,
            }

        except Exception as e:
            logger.error(f"SHAP analysis error: {e}")
            return {"error": str(e)}
