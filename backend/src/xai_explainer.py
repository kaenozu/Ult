"""
説明可能なAI (XAI) モル

- SHAP値の導入
- 注目度可視化
- LIMEによるローカル説明
"""

import logging
import warnings
from typing import Dict, List, Optional

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
try:
    import shap
except ImportError:
    shap = None

try:
    import tensorflow as tf
    from tensorflow import keras
except ImportError:
    tf = None
    keras = None

try:
    from sklearn.ensemble import RandomForestRegressor
except ImportError:
    RandomForestRegressor = None

# LIMEはオプショナルな依存関係
try:
    import lime
    import lime.lime_tabular

    LIME_AVAILABLE = True
except ImportError:
    LIME_AVAILABLE = False
    lime = None
    # lime.lime_tabular は lime が None の場合はアクセスしないので、ここでは代入しない


warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """SHAPによる説明機能"""

    def __init__(self, model, training_data):
        self.model = model
        self.training_data = training_data
        self.explainer = None

    def prepare_explainer(self):
        """SHAPエクスプラナの準備"""
        try:
            # モデルの種類に応じてSHAPエクスプラナを選択
            if hasattr(self.model, "predict_proba"):
                # 例: sklearn
                self.explainer = shap.Explainer(self.model.predict, self.training_data)
            elif hasattr(self.model, "model") and hasattr(self.model.model, "predict"):
                # 例: keras
                self.explainer = shap.Explainer(self.model.model.predict, self.training_data)
            else:
                # 一般的なpredictメソッドを持つモデル
                self.explainer = shap.Explainer(self.model.predict, self.training_data)
        except Exception as e:
            logger.error(f"SHAP explainer preparation failed: {e}")
            self.explainer = None

    def explain_instance(self, instance: np.ndarray, num_features: int = 10):
        """特定インスタンスのSHAP説明を取得"""
        if self.explainer is None:
            logger.warning("SHAP explainer is not prepared.")
            return {}

        try:
            shap_values = self.explainer(instance)
            # 特徴量名を仮定
            feature_names = [f"Feature_{i}" for i in range(instance.shape[1])]
            # SHAP値から貢献度を抽出
            contributions = {name: float(val) for name, val in zip(feature_names, shap_values.values[0])}
            return contributions
        except Exception as e:
            logger.error(f"Error in SHAP explanation: {e}")
            return {}

    def plot_shap_values(self, instance: np.ndarray, num_features: int = 10) -> None:
        """SHAP値のプロット"""
        if self.explainer is None:
            logger.warning("SHAP explainer is not prepared.")
            return

        try:
            shap_values = self.explainer(instance)
            # プロット
            shap.plots.waterfall(shap_values[0], max_display=num_features)
        except Exception as e:
            logger.error(f"Error plotting SHAP values: {e}")


class GradCAMExplainer:
    """Grad-CAMによる注目度可視化"""

    def __init__(self, model, layer_name: str = None):
        self.model = model
        self.layer_name = layer_name
        # Grad-CAMのための内部モデル構築（TensorFlow/Keras向け）
        if hasattr(model, "model"):
            self.keras_model = model.model
        else:
            self.keras_model = model

    def generate_heatmap(self, input_image: np.ndarray):
        """特定入力に対するGrad-CAMヒートマップを生成"""
        if not hasattr(self.keras_model, "get_layer"):
            logger.warning("Grad-CAM is not supported for this model type.")
            return np.zeros_like(input_image)

        try:
            # 指定レイヤーまたは最後の畳み込み層を取得
            if self.layer_name:
                conv_layer = self.keras_model.get_layer(self.layer_name)
            else:
                # 最後のConv2D層を取得するロジック（例）
                conv_layer = None
                for layer in reversed(self.keras_model.layers):
                    if "conv" in layer.name.lower():
                        conv_layer = layer
                        break

            if conv_layer is None:
                logger.warning("No convolutional layer found for Grad-CAM.")
                return np.zeros_like(input_image)

            # Grad-CAM計算のためのモデル構築
            # 出力層の勾配を取得するためのモデル
            grad_model = tf.keras.models.Model([self.keras_model.inputs], [conv_layer.output, self.keras_model.output])

            with tf.GradientTape() as tape:
                conv_outputs, predictions = grad_model(input_image)
                # 予測値に応じた損失を計算（例: 最大クラス）
                loss = predictions[:, tf.argmax(predictions[0])]

            # 出力層の勾配を計算
            output_grads = tape.gradient(loss, conv_outputs)
            # 空間平均プーリング（Global Average Pooling）
            weights = tf.reduce_mean(output_grads, axis=(1, 2))
            # 特徴マップに重みを乗算し合計
            cam = tf.reduce_sum(weights[:, :, tf.newaxis, tf.newaxis] * conv_outputs, axis=1)
            cam = tf.nn.relu(cam)  # ReLUを適用
            # 正規化
            cam = (cam - tf.reduce_min(cam)) / (tf.reduce_max(cam) - tf.reduce_min(cam))
            # 元の入力画像の大きさにリサイズ（例: input_image.shape[1:3]）
            # tf.image.resizeは画像用のため、時系列データには適用しない
            # 時系列データの場合は、特徴量の時間軸に沿った重みとして解釈する
            # ここでは例として、camを入力の時間軸に合わせる
            # cam = tf.image.resize(cam[..., tf.newaxis], input_image.shape[1:3])[..., 0]
            # 時系列データへの応用は複雑なため、簡略化
            return cam.numpy()
        except Exception as e:
            logger.error(f"Error in Grad-CAM generation: {e}")
            return np.zeros_like(input_image)

    def plot_heatmap(self, input_image: np.ndarray) -> None:
        """Grad-CAMヒートマップのプロット"""
        heatmap = self.generate_heatmap(input_image)
        if heatmap.size == 0:
            logger.warning("Grad-CAM heatmap could not be generated.")
            return

        plt.figure(figsize=(10, 4))
        sns.heatmap(heatmap[0], cmap="viridis", cbar=True)
        plt.title("Grad-CAM Heatmap")
        plt.show()


class LIMEExplainer:
    """LIMEによる説明機能"""

    def __init__(self, model, training_data):
        if not LIME_AVAILABLE:
            raise ImportError("LIME is not available. Please install it to use LIMEExplainer.")
        self.model = model
        self.training_data = training_data
        # LIMEエクスプレイナーの初期化
        self.explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data,
            mode="regression",  # または 'classification'
            feature_names=[f"Feature_{i}" for i in range(training_data.shape[1])],
            random_state=42,
        )

    def explain_instance(self, instance: np.ndarray, num_features: int = 10):
        """特定インスタンスのLIME説明を取得"""
        if not LIME_AVAILABLE:
            logger.warning("LIME is not available.")
            return {}

        try:
            # 予測関数を定義 (LIMEは1次元配列を期待)
            def predict_fn(x):
                # xは (n_samples, n_features) の形であることを期待
                if hasattr(self.model, "predict"):
                    return self.model.predict(x)
                elif hasattr(self.model, "model") and hasattr(self.model.model, "predict"):
                    return self.model.model.predict(x)
                else:
                    raise ValueError("Model does not have a 'predict' method.")

            explanation = self.explainer.explain_instance(
                instance[0], predict_fn, num_features=num_features  # LIMEは1つのインスタンスを期待
            )
            # LIMEの説明から特徴量と寄与度を抽出
            contributions = {exp[0]: exp[1] for exp in explanation.as_list()}
            return contributions
        except Exception as e:
            logger.error(f"Error in LIME explanation: {e}")
            return {}

    def plot_lime_explanation(self, instance: np.ndarray, num_features: int = 10) -> None:
        """LIME説明のプロット"""
        if not LIME_AVAILABLE:
            logger.warning("LIME is not available.")
            return

        try:

            def predict_fn(x):
                if hasattr(self.model, "predict"):
                    return self.model.predict(x)
                elif hasattr(self.model, "model") and hasattr(self.model.model, "predict"):
                    return self.model.model.predict(x)
                else:
                    raise ValueError("Model does not have a 'predict' method.")

            explanation = self.explainer.explain_instance(instance[0], predict_fn, num_features=num_features)
            explanation.show_in_notebook(show_table=True, show_all=False)
        except Exception as e:
            logger.error(f"Error plotting LIME explanation: {e}")


class XAIFramework:
    """XAIの統合フレームワーク"""

    def __init__(self, model, training_data: np.ndarray = None):
        self.model = model
        self.training_data = training_data
        self.shap_explainer = SHAPExplainer(model, training_data) if training_data is not None else None
        self.gradcam_explainer = GradCAMExplainer(model)
        self.lime_explainer = None
        # LIMEはオプショナル
        if LIME_AVAILABLE:
            try:
                self.lime_explainer = LIMEExplainer(self.model, self.training_data)
            except ImportError as e:
                logger.warning(f"LIME not available: {e}")
        else:
            logger.warning("LIME not available (not installed).")

    def explain_prediction(self, X_instance: np.ndarray, method: str = "all") -> Dict:
        """予測の説明を取得"""
        explanations = {}

        # SHAP
        if method in ["shap", "all"] and self.shap_explainer:
            try:
                shap_explanation = self.shap_explainer.explain_instance(X_instance)
                explanations["shap"] = shap_explanation
            except Exception as e:
                logger.warning(f"SHAP explanation failed: {e}")

        # Grad-CAM (画像や時系列特徴量の可視化に有効)
        # if method in ["gradcam", "all"] and self.gradcam_explainer:
        #     try:
        #         gradcam_explanation = self.gradcam_explainer.generate_heatmap(X_instance)
        #         explanations["gradcam"] = gradcam_explanation
        #     except Exception as e:
        #         logger.warning(f"Grad-CAM explanation failed: {e}")

        # LIME
        if method in ["lime", "all"] and self.lime_explainer:
            try:
                lime_explanation = self.lime_explainer.explain_instance(X_instance)
                explanations["lime"] = lime_explanation
            except Exception as e:
                logger.warning(f"LIME explanation failed: {e}")

        return explanations

    def generate_report(self, explanations: Dict, feature_names: List[str] = None) -> str:
        """説明のレポートを生成"""
        report = []

        if "shap" in explanations:
            report.append("SHAP Feature Contribution:")
            shap_explanation = explanations["shap"]
            sorted_shap = sorted(shap_explanation.items(), key=lambda x: abs(x[1]), reverse=True)
            for feature, contribution in sorted_shap[:5]:  # 上位5件
                report.append(f"  {feature}: {contribution:.4f}")

        if "lime" in explanations:
            report.append("LIME Feature Contribution:")
            lime_explanation = explanations["lime"]
            sorted_lime = sorted(lime_explanation.items(), key=lambda x: abs(x[1]), reverse=True)
            for feature, contribution in sorted_lime[:5]:  # 上位5件
                report.append(f"  {feature}: {contribution:.4f}")

        # Grad-CAMの場合はヒートマップを表示（テキストレポートには不向き）
        # if "gradcam" in explanations:
        #     report.append("Grad-CAM heatmap is available for visualization.")

        return "\n".join(report)

    def visualize_explanation(self, X_instance: np.ndarray, method: str = "shap"):
        """説明の可視化"""
        if method == "shap" and self.shap_explainer:
            self.shap_explainer.plot_shap_values(X_instance)
        elif method == "lime" and self.lime_explainer:
            self.lime_explainer.plot_lime_explanation(X_instance)
        elif method == "gradcam":
            self.gradcam_explainer.plot_heatmap(X_instance)
        else:
            logger.warning(f"Visualization method '{method}' not supported or not available.")


# 使用例 (mainブロック)
if __name__ == "__main__":
    # 例: 仮のモデルとトレーニングデータ
    # model = SomeModel()
    # training_data = np.random.random((100, 10))
    # xai = XAIFramework(model, training_data)
    # instance = np.random.random((1, 10))
    # explanations = xai.explain_prediction(instance, method="all")
    # report = xai.generate_report(explanations)
    # print(report)
    pass
