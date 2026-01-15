import pandas as pd

from ..base import Strategy


class SentimentStrategy(Strategy):
    """
    ニュース感情分析戦略

    BERTによるニュース感情スコアに基づいてシグナルを生成します。
    """

    def __init__(self, threshold: float = 0.15, period: int = 14) -> None:
        super().__init__("Sentiment Analysis", period)
        self.threshold = threshold

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty or "Sentiment_Score" not in df.columns:
            return pd.Series(dtype=int)

        signals = pd.Series(0, index=df.index)

        # 感情スコアに基づくシグナル
        # ポジティブ: 買い
        signals[df["Sentiment_Score"] > self.threshold] = 1

        # ネガティブ: 売り
        signals[df["Sentiment_Score"] < -self.threshold] = -1

        return signals

    def get_signal_explanation(self, signal: int) -> str:
        if signal == 1:
            return "ニュース感情がポジティブです。市場心理が好転しており、上昇が期待できます。"
        elif signal == -1:
            return "ニュース感情がネガティブです。市場心理が悪化しており、下落のリスクがあります。"
        return "ニュース感情は中立です。"
