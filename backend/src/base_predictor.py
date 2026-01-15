from abc import ABC, abstractmethod
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BasePredictor(ABC):
    """
    全ての予測モデルの基底クラス。
    共通インターフェースを強制し、パイプラインの一貫性を保つ。
    """

    @abstractmethod
    def prepare_model(self, X: pd.DataFrame, y: pd.Series) -> None:
        """
        モデル学習のためのデータ準備（スケーリング、シーケンス作成など）を行う。

        Args:
            X (pd.DataFrame): 特徴量データ
            y (pd.Series): ターゲット変数
        """

    @abstractmethod
    def fit(self, X: pd.DataFrame, y: pd.Series) -> None:
        """
        モデルを学習させる。

        Args:
            X (pd.DataFrame): 特徴量データ（prepare_modelで加工済みであることを想定する場合もあるが、基本はここでも受け取る）
            y (pd.Series): ターゲット変数
        """

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        予測を実行する。

        Args:
            X (pd.DataFrame): 予測用特徴量データ

        Returns:
            np.ndarray: 予測結果の配列
        """

    def predict_point(self, features: np.ndarray) -> float:
        """
        単一時点の特徴量から予測を行う（オプション）。
        実装されていない場合はpredictを呼び出すか、デフォルト値を返す。
        """
        # デフォルト実装: バッチ予測として処理して最初の要素を返す
        try:
            # 2次元配列に変形 (1, n_features)
            if features.ndim == 1:
                features = features.reshape(1, -1)

            # DataFrameに変換（多くのモデルがDataFrameを期待するため）
            # カラム名は不明なため、ダミーまたは予測器側で処理が必要
            # ここではnumpy配列のまま渡すことを想定（多くのpredictメソッドはnumpyも受け付けるようにすべき）
            return float(self.predict(features)[0])
        except Exception as e:
            logger.warning(f"predict_point failed in {self.__class__.__name__}: {e}")
            return 0.0
