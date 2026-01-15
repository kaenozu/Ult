from typing import Dict

import pandas as pd
import ta
from sklearn.ensemble import RandomForestClassifier

from ..base import Strategy
from ...oracle.oracle_2026 import Oracle2026


class MLStrategy(Strategy):
    def __init__(self, name: str = "AI Random Forest", trend_period: int = 0) -> None:
        super().__init__(name, trend_period)
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.oracle = Oracle2026()
        self.feature_names = ["RSI", "SMA_Ratio", "Volatility", "Ret_1", "Ret_5"]

    def explain_prediction(self, df: pd.DataFrame) -> Dict[str, float]:
        """Return feature importance for the latest prediction"""
        if self.model is None:
            return {}
        try:
            importances = self.model.feature_importances_
            return dict(zip(self.feature_names, importances))
        except Exception:
            return {}

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty or "Close" not in df.columns:
            return pd.Series(dtype=int)

        data = df.copy()

        # 1. Technical Indicators
        data["RSI"] = ta.momentum.RSIIndicator(close=data["Close"], window=14).rsi()
        data["SMA_20"] = data["Close"].rolling(window=20).mean()
        data["SMA_50"] = data["Close"].rolling(window=50).mean()
        data["SMA_Ratio"] = data["SMA_20"] / data["SMA_50"]

        # 2. Volatility
        data["Volatility"] = data["Close"].rolling(window=20).std() / data["Close"]

        # 4. Returns Lag
        data["Ret_1"] = data["Close"].pct_change(1)
        data["Ret_5"] = data["Close"].pct_change(5)

        # Drop NaNs created by indicators
        data.dropna(inplace=True)

        if len(data) < 50:
            return pd.Series(0, index=df.index)

        # --- Target Creation ---
        # Target: 1 if Next Day Return > 0, else 0
        data["Target"] = (data["Close"].shift(-1) > data["Close"]).astype(int)

        # Drop last row (NaN target)
        valid_data = data.iloc[:-1].copy()

        features = self.feature_names
        X = valid_data[features]
        y = valid_data["Target"]

        # --- Train/Test Split ---
        split_idx = int(len(X) * 0.7)

        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train = y.iloc[:split_idx]

        if len(X_train) < 10:
            return pd.Series(0, index=df.index)

        self.model.fit(X_train, y_train)

        # Predict
        # Predict Probabilities instead of classes for finer control
        probs = self.model.predict_proba(X_test)[:, 1]  # Probability of Class 1 (Up)

        # Oracle Risk Check
        guidance = self.oracle.get_risk_guidance()
        if guidance.get("safety_mode", False):
            return pd.Series(0, index=df.index)

        risk_buffer = guidance.get("var_buffer", 0.0)
        threshold = 0.5 + risk_buffer  # Base threshold 0.5 + risk adjustment

        signals = pd.Series(0, index=df.index)
        test_indices = X_test.index

        # Determine signals based on dynamic threshold
        # 1 if prob > threshold, -1 if prob < 1-threshold (optional, keeping simpe for now)
        pred_signals = [1 if p > threshold else -1 if p < (1 - threshold) else 0 for p in probs]

        signals.loc[test_indices] = pred_signals

        return signals

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            msg = "AI（ランダムフォレスト）が上昇を予測しました。"
            guidance = self.oracle.get_risk_guidance()
            if guidance.get("var_buffer", 0.0) > 0:
                msg += " (Oracle警戒: 確信度閾値を引き上げています)"
            return msg
        elif signal == -1:
            return "AI（ランダムフォレスト）が過去のパターンから「下落」を予測しました。"
        return "AIによる明確な予測は出ていません。"
