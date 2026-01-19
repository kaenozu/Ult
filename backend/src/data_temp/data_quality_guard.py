"""
Data quality guard to prevent trading on bad data.
"""

import logging
from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class QualityThresholds:
    max_missing_ratio: float = 0.05
    max_zscore: float = 6.0
    max_price_jump_pct: float = 20.0


def _zscore(series: pd.Series) -> pd.Series:
    mean = series.mean()
    std = series.std()
    if std == 0 or np.isnan(std):
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series - mean) / std


def assess_quality(df: pd.DataFrame, thresholds: Optional[QualityThresholds] = None) -> Dict[str, float]:
    """
    Assess basic data quality metrics and return scores.
    - missing_ratio: share of NaNs
    - max_abs_zscore: largest absolute z-score across OHLC
    - max_price_jump_pct: largest single-day price jump (Close)
    """
    if thresholds is None:
        thresholds = QualityThresholds()

    metrics: Dict[str, float] = {}
    if df.empty:
        metrics["missing_ratio"] = 1.0
        metrics["max_abs_zscore"] = np.inf
        metrics["max_price_jump_pct"] = np.inf
        return metrics

    metrics["missing_ratio"] = float(df.isna().sum().sum() / (df.shape[0] * df.shape[1]))

    price_cols = [c for c in ["Open", "High", "Low", "Close"] if c in df.columns]
    if price_cols:
        zscores = pd.concat([_zscore(df[c].dropna()) for c in price_cols], axis=0)
        metrics["max_abs_zscore"] = float(zscores.abs().max() if not zscores.empty else 0.0)
    else:
        metrics["max_abs_zscore"] = 0.0

    if "Close" in df.columns:
        pct = df["Close"].pct_change().abs() * 100
        metrics["max_price_jump_pct"] = float(pct.max() if not pct.empty else 0.0)
    else:
        metrics["max_price_jump_pct"] = 0.0

    return metrics


def should_block_trading(metrics: Dict[str, float], thresholds: Optional[QualityThresholds] = None) -> Optional[str]:
    """Return a human-readable reason if quality is bad enough to block trading."""
    if thresholds is None:
        thresholds = QualityThresholds()

    if metrics.get("missing_ratio", 0) > thresholds.max_missing_ratio:
        return f"Missing ratio too high: {metrics['missing_ratio']:.2%} > {thresholds.max_missing_ratio:.2%}"

    if metrics.get("max_abs_zscore", 0) > thresholds.max_zscore:
        return f"Price outlier detected (|z|={metrics['max_abs_zscore']:.1f} > {thresholds.max_zscore})"

    if metrics.get("max_price_jump_pct", 0) > thresholds.max_price_jump_pct:
        return f"Unusual price jump: {metrics['max_price_jump_pct']:.1f}% > {thresholds.max_price_jump_pct:.1f}%"

    return None


def evaluate_dataframe(df: pd.DataFrame, thresholds: Optional[QualityThresholds] = None) -> Optional[str]:
    """
    Convenience helper to evaluate a dataframe and get a block reason.
    Logs a warning when trading should be blocked.
    """
    metrics = assess_quality(df, thresholds)
    reason = should_block_trading(metrics, thresholds)
    if reason:
        logger.warning("Data quality guard triggered: %s (metrics=%s)", reason, metrics)
    return reason
