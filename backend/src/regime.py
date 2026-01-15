import logging
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class RegimeDetector:
    """
    市場レジーム（環境状態）を検知するクラス。
    K-Meansクラスタリングを用いて、マクロ経済指標から市場を分類する。
    """

    def __init__(self, n_regimes: int = 3, lookback_window: int = 60):
        """
        Args:
            n_regimes: レジームの数（デフォルト3：安定、不安定、暴落警戒）
            lookback_window: 特徴量計算に使用する期間（日数）
        """
        self.n_regimes = n_regimes
        self.lookback_window = lookback_window
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=n_regimes, random_state=42, n_init=10)
        self.is_fitted = False

        # レジームラベル（クラスタ番号→意味付け）
        self.regime_labels = {
            0: "安定上昇 (Stable Bull)",
            1: "不安定 (Volatile)",
            2: "暴落警戒 (Risk-Off)",
        }

    def calculate_features(self, macro_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        マクロデータから特徴量を計算する。

        Features:
            - VIXレベル（恐怖指数）
            - VIX変化率（急騰しているか）
            - S&P500のトレンド（SMA(50)からの乖離率）
            - イールドカーブ（10Y - 2Y）
            - 金価格の変化率（リスクオフ時に上昇）

        Args:
            macro_data: fetch_macro_dataの戻り値

        Returns:
            特徴量のDataFrame
        """

        # 各指標を取得
        vix_df = macro_data.get("VIX")
        sp500_df = macro_data.get("SP500")
        us10y_df = macro_data.get("US10Y")
        us02y_df = macro_data.get("US02Y")
        gold_df = macro_data.get("GOLD")

        if vix_df is None or sp500_df is None:
            logger.warning("VIX or SP500 data is missing. Cannot calculate regime features.")
            return pd.DataFrame()

        # データを日付で整列
        all_dates = vix_df.index.intersection(sp500_df.index)
        if len(all_dates) < self.lookback_window:
            logger.warning(
                f"Insufficient data for regime detection. Need {self.lookback_window} days, got {len(all_dates)}"
            )
            return pd.DataFrame()

        # 1. VIXレベル
        vix_close = vix_df.loc[all_dates, "Close"]

        # 2. VIX変化率（5日移動平均との比率）
        vix_ma5 = vix_close.rolling(5).mean()
        vix_change_ratio = vix_close / vix_ma5

        # 3. S&P500のトレンド（50日SMAからの乖離率）
        sp500_close = sp500_df.loc[all_dates, "Close"]
        sp500_sma50 = sp500_close.rolling(50).mean()
        sp500_trend = (sp500_close - sp500_sma50) / sp500_sma50

        # 4. イールドカーブ（10Y - 2Y）
        if us10y_df is not None and us02y_df is not None:
            common_dates = all_dates.intersection(us10y_df.index).intersection(us02y_df.index)
            if len(common_dates) > 0:
                yield_curve = us10y_df.loc[common_dates, "Close"] - us02y_df.loc[common_dates, "Close"]
                # Reindex to match all_dates
                yield_curve = yield_curve.reindex(all_dates, method="ffill")
            else:
                yield_curve = pd.Series(0, index=all_dates)
        else:
            yield_curve = pd.Series(0, index=all_dates)

        # 5. 金価格の変化率（10日）
        if gold_df is not None:
            common_dates = all_dates.intersection(gold_df.index)
            if len(common_dates) > 0:
                gold_close = gold_df.loc[common_dates, "Close"]
                gold_return = gold_close.pct_change(10)
                gold_return = gold_return.reindex(all_dates, method="ffill")
            else:
                gold_return = pd.Series(0, index=all_dates)
        else:
            gold_return = pd.Series(0, index=all_dates)

        # 特徴量をDataFrameに統合
        features_df = pd.DataFrame(
            {
                "vix_level": vix_close,
                "vix_change_ratio": vix_change_ratio,
                "sp500_trend": sp500_trend,
                "yield_curve": yield_curve,
                "gold_return": gold_return,
            },
            index=all_dates,
        )

        features_df.dropna(inplace=True)

        return features_df

    def fit(self, macro_data: Dict[str, pd.DataFrame]) -> "RegimeDetector":
        """
        過去データを使ってK-Meansモデルを訓練する。

        Args:
            macro_data: マクロ経済データ

        Returns:
            self
        """
        features_df = self.calculate_features(macro_data)

        if features_df.empty:
            logger.error("Cannot fit regime detector: no features calculated.")
            return self

        # 標準化
        scaled_features = self.scaler.fit_transform(features_df.values)

        # K-Meansでクラスタリング
        self.kmeans.fit(scaled_features)

        self.is_fitted = True
        logger.info(f"RegimeDetector fitted with {len(features_df)} samples.")

        # クラスタセンターを分析してラベルを自動付与
        self._assign_regime_labels()

        return self

    def _assign_regime_labels(self):
        """
        クラスタセンターの特性に基づいて、各クラスタに意味のあるラベルを付与する。

        仮定:
            - VIXが高い → 暴落警戒
            - VIXが低く、SP500トレンドが正 → 安定上昇
            - その他 → 不安定
        """
        centers = self.kmeans.cluster_centers_

        # 特徴量の順序: vix_level, vix_change_ratio, sp500_trend, yield_curve, gold_return
        vix_levels = centers[:, 0]  # Scaled VIX level
        centers[:, 2]  # Scaled SP500 trend

        # クラスタをVIXレベルでソート
        sorted_indices = np.argsort(vix_levels)

        # 低VIX → 安定、中VIX → 不安定、高VIX → 暴落警戒
        new_labels = {}
        new_labels[sorted_indices[0]] = "安定上昇 (Stable Bull)"
        new_labels[sorted_indices[-1]] = "暴落警戒 (Risk-Off)"

        # 中間のクラスタ
        for i in sorted_indices[1:-1]:
            new_labels[i] = "不安定 (Volatile)"

        self.regime_labels = new_labels

    def predict_current_regime(self, macro_data: Dict[str, pd.DataFrame]) -> Tuple[int, str, Dict]:
        """
        現在の市場レジームを予測する。

        Args:
            macro_data: マクロ経済データ

        Returns:
            (cluster_id, regime_label, feature_values)
        """
        if not self.is_fitted:
            logger.warning("RegimeDetector is not fitted. Fitting now...")
            self.fit(macro_data)

        features_df = self.calculate_features(macro_data)

        if features_df.empty:
            return 0, "Unknown", {}

        # 最新の特徴量を取得
        latest_features = features_df.iloc[-1:].values

        # 標準化
        scaled_features = self.scaler.transform(latest_features)

        # 予測
        cluster_id = self.kmeans.predict(scaled_features)[0]
        regime_label = self.regime_labels.get(cluster_id, f"Regime {cluster_id}")

        # 特徴量の値を辞書で返す
        feature_values = features_df.iloc[-1].to_dict()

        return int(cluster_id), regime_label, feature_values

    def get_regime_history(self, macro_data: Dict[str, pd.DataFrame], days: int = 90) -> pd.DataFrame:
        """
        過去のレジーム履歴を取得する。

        Args:
            macro_data: マクロ経済データ
            days: 取得する日数

        Returns:
            日付ごとのレジームを含むDataFrame
        """
        if not self.is_fitted:
            self.fit(macro_data)

        features_df = self.calculate_features(macro_data)

        if features_df.empty:
            return pd.DataFrame()

        # 最近N日分を取得
        recent_features = features_df.tail(days)

        # 標準化
        scaled_features = self.scaler.transform(recent_features.values)

        # 予測
        regime_ids = self.kmeans.predict(scaled_features)
        regime_names = [self.regime_labels.get(rid, f"Regime {rid}") for rid in regime_ids]

        history_df = pd.DataFrame(
            {
                "date": recent_features.index,
                "regime_id": regime_ids,
                "regime_name": regime_names,
                "vix_level": recent_features["vix_level"].values,
                "sp500_trend": recent_features["sp500_trend"].values,
            }
        )

        return history_df
