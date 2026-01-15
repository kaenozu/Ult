import pandas as pd
from ..base import Strategy

class TechnicalStrategy(Strategy):
    """テクニカル指標戦略のベースクラス"""

    def _validate_dataframe(self, df: pd.DataFrame) -> bool:
        """DataFrameの検証"""
        return df is not None and not df.empty and "Close" in df.columns

    def _create_signals_series(self, df: pd.DataFrame) -> pd.Series:
        """シグナル用のSeriesを作成"""
        return pd.Series(0, index=df.index)

    def _apply_standard_trend_filter(self, df: pd.DataFrame, signals: pd.Series) -> pd.Series:
        """標準的なトレンドフィルターを適用"""
        return self.apply_trend_filter(df, signals)
