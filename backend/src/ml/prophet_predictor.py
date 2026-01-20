"""
Prophet予測モデル
Facebook開発の時系列予測モデル
トレンドと季節性を自動的に分離
"""

import logging

import numpy as np
import pandas as pd
try:
    from prophet import Prophet
except ImportError:
    Prophet = None

from .base_predictor import BasePredictor

logger = logging.getLogger(__name__)


class ProphetPredictor(BasePredictor):
    def __init__(self):
        self.model = None

    def prepare_model(self, data):
        """モデルの準備"""
        # Prophetは学習時にデータが必要なため、ここでは何もしないか、初期化のみ

    def fit(self, X, y):
        """モデルの学習"""
        # yがSeriesであることを期待（日付インデックス付き）
        if not isinstance(y, (pd.Series, pd.DataFrame)):
            # インデックスがない場合は、現在時刻から遡って仮の日付を付与するか、エラー
            # ここではXのインデックスを使用試行
            if hasattr(X, "index"):
                ds = X.index
            else:
                # fallback
                ds = pd.date_range(end=pd.Timestamp.now(), periods=len(y), freq="D")
            y_values = y
        else:
            ds = y.index
            y_values = y.values

        prophet_df = pd.DataFrame({"ds": ds, "y": y_values})

        self.model = Prophet(daily_seasonality=False, weekly_seasonality=False, yearly_seasonality=False)

        import io
        import sys

        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            self.model.fit(prophet_df)
        except Exception as e:
            logger.warning(f"Prophet fit failed: {e}")
        finally:
            sys.stdout = old_stdout

    def predict(self, X):
        """予測実行"""
        if self.model is None:
            return np.zeros(len(X))

        # Xの期間に対して予測
        if hasattr(X, "index"):
            dates = X.index
        else:
            # fallback: 未来予測と仮定してモデルの最後の学習日から延長？
            # ここでは単純に学習できませんでしたとして0を返すか、
            # Xの行数分の未来を作成するか。
            # Standard predict(X, y) usage implies X contains inputs.
            # Prophet relies on 'ds'.
            return np.zeros(len(X))

        future = pd.DataFrame({"ds": dates})
        forecast = self.model.predict(future)
        return forecast["yhat"].values

    def predict_point(self, current_features):
        """単一点予測"""
        # current_features is (1, n_features)
        # We need a date.
        # Assuming current_features is a DataFrame/Series with name?
        # Or numpy?
        # If numpy, we can't guess date.
        return 0.0

    def predict_trajectory(self, df: pd.DataFrame, days_ahead: int = 5) -> dict:
        """
        Prophetで価格推移を予測
        """
        try:
            if df is None or df.empty or len(df) < 30:
                return {"error": f"データ不足 (データ数: {len(df) if df is not None else 0})"}

            # 1. Prophet用にデータを整形
            # Prophet requires 'ds' (datetime) and 'y' (value) columns
            prophet_df = pd.DataFrame({"ds": df.index, "y": df["Close"].values})

            # 2. モデルの学習
            # ログ出力を抑制
            self.model = Prophet(
                daily_seasonality=False,
                weekly_seasonality=False,
                yearly_seasonality=False,
            )

            # Prophet内部のログを抑制
            import io
            import sys

            old_stdout = sys.stdout
            sys.stdout = io.StringIO()

            try:
                self.model.fit(prophet_df)
            finally:
                sys.stdout = old_stdout

            # 3. 未来予測
            future = self.model.make_future_dataframe(periods=days_ahead)
            forecast = self.model.predict(future)

            # 直近days_ahead件の予測を取得
            predictions = forecast["yhat"].tail(days_ahead).tolist()

            # 4. 結果の整形
            current_price = df["Close"].iloc[-1]
            peak_price = max(predictions)
            peak_day_idx = predictions.index(peak_price)

            trend = "FLAT"
            if predictions[-1] > current_price * 1.01:
                trend = "UP"
            elif predictions[-1] < current_price * 0.99:
                trend = "DOWN"

            return {
                "current_price": current_price,
                "predictions": predictions,
                "peak_price": peak_price,
                "peak_day": peak_day_idx + 1,
                "trend": trend,
                "change_pct": (predictions[-1] - current_price) / current_price * 100,
            }

        except Exception as e:
            logger.error(f"Prophet prediction error: {e}")
            return {"error": str(e)}
