import pandas as pd
import numpy as np
import logging
from src.strategies.base import Strategy

logger = logging.getLogger(__name__)


class VectorizedCombinedStrategy(Strategy):
    """
    高性能ベクトル演算版戦略エンジン。
    NumPyとPandasのベクトル化を利用して、全銘柄のシグナルをミリ秒単位で計算する。
    """

    def __init__(self):
        super().__init__("VectorizedCombined")

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        """
        一括ベクトル計算によるシグナル生成。
        """
        if df is None or df.empty or len(df) < 50:
            return pd.Series(0, index=(df.index if df is not None else []))

        # 1. テクニカル指標の計算 (ベクトル演算)
        try:
            close = df["Close"].values

            # 移動平均 (SMA)
            sma20 = df["Close"].rolling(window=20).mean().values
            sma50 = df["Close"].rolling(window=50).mean().values

            # RSI (ベクトル化された計算)
            delta = df["Close"].diff().values
            gain = np.where(delta > 0, delta, 0)
            loss = np.where(delta < 0, -delta, 0)

            avg_gain = pd.Series(gain).rolling(window=14).mean().values
            avg_loss = pd.Series(loss).rolling(window=14).mean().values

            rs = np.divide(avg_gain, avg_loss, out=np.zeros_like(avg_gain), where=avg_loss != 0)
            rsi = 100 - (100 / (1 + rs))

            # 2. シグナル判定ロジック (ベクトル化されたブールインデックス)
            # ゴールデンクロス + RSI 40以上
            buy_signals = (close > sma20) & (sma20 > sma50) & (rsi > 40)
            # デッドクロス + RSI 70以上
            sell_signals = (close < sma20) | (rsi > 70)

            # 3. 最終結合出力 (-1, 0, 1)
            signals = np.zeros(len(df))
            signals[buy_signals] = 1
            signals[sell_signals] = -1

            return pd.Series(signals, index=df.index)
        except Exception as e:
            logger.error(f"Vectorized signal generation failed: {e}")
            return pd.Series(0, index=df.index)
