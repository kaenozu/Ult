"""
パフォーマンスアトリビューション分析モジュール
"""

import logging
from typing import Dict, List, Optional

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class PerformanceAttribution:
    """パフォーマンスアトリビューション分析"""
    
    def __init__(self, trades: Optional[List[Dict]] = None):
        self.trades = trades or []
    
    def by_ticker(self) -> pd.DataFrame:
        """銘柄別のパフォーマンス"""
        if not self.trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.trades)
        if "ticker" not in df.columns or "return" not in df.columns:
            return pd.DataFrame()
        
        return df.groupby("ticker").agg({
            "return": ["sum", "mean", "count"],
        }).round(4)
    
    def by_strategy(self) -> pd.DataFrame:
        """戦略別のパフォーマンス"""
        if not self.trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.trades)
        if "strategy" not in df.columns:
            df["strategy"] = "Unknown"
        
        return df.groupby("strategy").agg({
            "return": ["sum", "mean", "count"],
        }).round(4)
    
    def by_period(self, period: str = "M") -> pd.DataFrame:
        """期間別のパフォーマンス"""
        if not self.trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.trades)
        if "exit_date" not in df.columns:
            return pd.DataFrame()
        
        df["exit_date"] = pd.to_datetime(df["exit_date"])
        df["period"] = df["exit_date"].dt.to_period(period)
        
        return df.groupby("period").agg({
            "return": ["sum", "mean", "count"],
        })
    
    def get_best_trades(self, n: int = 10) -> pd.DataFrame:
        """最高パフォーマンスの取引"""
        if not self.trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.trades)
        return df.nlargest(n, "return")
    
    def get_worst_trades(self, n: int = 10) -> pd.DataFrame:
        """最低パフォーマンスの取引"""
        if not self.trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(self.trades)
        return df.nsmallest(n, "return")
