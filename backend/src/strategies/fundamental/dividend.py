import pandas as pd

from ..base import Strategy
from ...oracle.oracle_2026 import Oracle2026


class DividendStrategy(Strategy):
    """
    高配当戦略

    配当利回りが一定以上の銘柄を買い推奨します。
    （簡易実装：配当データは本来yfinanceのinfo等から取得する必要がありますが、
    ここではデータフレームに 'Dividend_Yield' カラムがあると仮定します）
    """

    def __init__(self, min_yield: float = 0.04, trend_period: int = 200) -> None:
        super().__init__("Dividend Yield", trend_period)
        self.min_yield = min_yield
        self.oracle = Oracle2026()

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        if df is None or df.empty or "Dividend_Yield" not in df.columns:
            return pd.Series(dtype=int)

        signals = pd.Series(0, index=df.index)

        # Oracle Guidance
        guidance = self.oracle.get_risk_guidance()

        # 1. Safety Mode: Stop Buying
        if guidance.get("safety_mode", False):
            return pd.Series(0, index=df.index)

        # 2. Dynamic Yield Adjustment
        # If risk is elevated (var_buffer > 0), increase required yield
        adjusted_min_yield = self.min_yield + guidance.get("var_buffer", 0.0)

        # 配当利回りが基準以上なら買い
        signals[df["Dividend_Yield"] >= adjusted_min_yield] = 1

        # 売却条件: 利回りが低下、またはOracleの防御姿勢に応じて
        sell_threshold = adjusted_min_yield * 0.8
        signals[df["Dividend_Yield"] < sell_threshold] = 0

        return self.apply_trend_filter(df, signals)

    def get_signal_explanation(self, signal: int) -> str:
        guidance = self.oracle.get_risk_guidance()
        adjusted_min_yield = self.min_yield + guidance.get("var_buffer", 0.0)

        if signal == 1:
            base_msg = f"配当利回りがOracle調整後基準({adjusted_min_yield * 100:.1f}%)を上回っています。"
            if guidance.get("var_buffer", 0.0) > 0:
                base_msg += " (市場リスク上昇に伴い基準引き上げ中)"
            return base_msg

        return "配当利回りは基準以下です。"
