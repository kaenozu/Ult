"""
パフォーマンス分析モジュール
"""

import logging
from typing import Dict, List, Optional, Any

import pandas as pd
import numpy as np

from .metrics import (
    calculate_all_metrics,
    calculate_returns,
    PerformanceMetrics,
)

logger = logging.getLogger(__name__)


class PerformanceAnalyzer:
    """パフォーマンス分析クラス"""
    
    def __init__(self, equity_curve: Optional[pd.Series] = None, trades: Optional[List[Dict]] = None):
        self.equity_curve = equity_curve
        self.trades = trades or []
        self._metrics: Optional[PerformanceMetrics] = None
    
    def set_data(self, equity_curve: pd.Series, trades: Optional[List[Dict]] = None):
        """データを設定"""
        self.equity_curve = equity_curve
        self.trades = trades or []
        self._metrics = None
    
    @property
    def metrics(self) -> PerformanceMetrics:
        """メトリクスを取得（遅延計算）"""
        if self._metrics is None and self.equity_curve is not None:
            self._metrics = calculate_all_metrics(self.equity_curve, self.trades)
        return self._metrics or PerformanceMetrics()
    
    def get_summary(self) -> Dict[str, Any]:
        """サマリーを取得"""
        m = self.metrics
        return {
            "総リターン": f"{m.total_return:.2%}",
            "年率リターン": f"{m.annualized_return:.2%}",
            "シャープレシオ": f"{m.sharpe_ratio:.2f}",
            "最大ドローダウン": f"{m.max_drawdown:.2%}",
            "勝率": f"{m.win_rate:.2%}",
            "取引回数": m.total_trades,
        }
    
    def get_monthly_returns(self) -> pd.Series:
        """月次リターンを計算"""
        if self.equity_curve is None or self.equity_curve.empty:
            return pd.Series()
        
        monthly = self.equity_curve.resample("M").last()
        return monthly.pct_change().dropna()
    
    def get_yearly_returns(self) -> pd.Series:
        """年次リターンを計算"""
        if self.equity_curve is None or self.equity_curve.empty:
            return pd.Series()
        
        yearly = self.equity_curve.resample("Y").last()
        return yearly.pct_change().dropna()
    
    def get_drawdown_periods(self, threshold: float = -0.1) -> List[Dict]:
        """ドローダウン期間を取得"""
        if self.equity_curve is None or self.equity_curve.empty:
            return []
        
        rolling_max = self.equity_curve.cummax()
        drawdown = (self.equity_curve - rolling_max) / rolling_max
        
        periods = []
        in_drawdown = False
        start_date = None
        
        for date, dd in drawdown.items():
            if dd < threshold and not in_drawdown:
                in_drawdown = True
                start_date = date
            elif dd >= 0 and in_drawdown:
                in_drawdown = False
                periods.append({
                    "start": start_date,
                    "end": date,
                    "max_drawdown": drawdown.loc[start_date:date].min(),
                })
        
        return periods
    
    def get_rolling_metrics(self, window: int = 252) -> pd.DataFrame:
        """ローリングメトリクスを計算"""
        if self.equity_curve is None or self.equity_curve.empty:
            return pd.DataFrame()
        
        returns = calculate_returns(self.equity_curve)
        
        rolling_return = returns.rolling(window).mean() * 252
        rolling_vol = returns.rolling(window).std() * np.sqrt(252)
        rolling_sharpe = rolling_return / rolling_vol
        
        return pd.DataFrame({
            "rolling_return": rolling_return,
            "rolling_volatility": rolling_vol,
            "rolling_sharpe": rolling_sharpe,
        })


class StrategyComparator:
    """戦略比較クラス"""
    
    def __init__(self):
        self.strategies: Dict[str, PerformanceAnalyzer] = {}
    
    def add_strategy(self, name: str, equity_curve: pd.Series, trades: Optional[List[Dict]] = None):
        """戦略を追加"""
        analyzer = PerformanceAnalyzer(equity_curve, trades)
        self.strategies[name] = analyzer
    
    def compare(self) -> pd.DataFrame:
        """戦略を比較"""
        results = []
        for name, analyzer in self.strategies.items():
            m = analyzer.metrics
            results.append({
                "戦略": name,
                "総リターン": m.total_return,
                "シャープレシオ": m.sharpe_ratio,
                "最大DD": m.max_drawdown,
                "勝率": m.win_rate,
            })
        return pd.DataFrame(results)
