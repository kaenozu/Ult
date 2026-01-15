"""
パフォーマンス関連モジュール統合パッケージ

このパッケージは以下の機能を提供:
- メトリクス計算
- パフォーマンス分析
- アトリビューション分析
- 監視・収集
- 最適化

使用例:
    from src.performance import PerformanceAnalyzer, calculate_sharpe_ratio
"""

from .metrics import (
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_max_drawdown,
    calculate_win_rate,
    calculate_profit_factor,
    calculate_calmar_ratio,
    PerformanceMetrics,
)

from .analyzer import PerformanceAnalyzer
from .attribution import PerformanceAttribution
from .monitor import PerformanceMonitor

__all__ = [
    # メトリクス
    "calculate_sharpe_ratio",
    "calculate_sortino_ratio",
    "calculate_max_drawdown",
    "calculate_win_rate",
    "calculate_profit_factor",
    "calculate_calmar_ratio",
    "PerformanceMetrics",
    # 分析
    "PerformanceAnalyzer",
    "PerformanceAttribution",
    "PerformanceMonitor",
]
