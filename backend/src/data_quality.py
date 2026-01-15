"""データ品質を簡易スコアリングするユーティリティ."""

import logging
from dataclasses import dataclass
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class QualityReport:
    score: float
    metrics: Dict[str, float]


def compute_quality_score(df: pd.DataFrame, required_cols: tuple = ("Close",)) -> QualityReport:
    """
    欠損率・外れ値比率・日付抜けを基に0-1の品質スコアを返す（1が最高）。
    """
    if df is None or df.empty:
        return QualityReport(0.0, {"missing_pct": 1.0, "outlier_pct": 1.0, "date_gap_pct": 1.0})

    total = len(df)
    missing_pct = float(df.isna().mean().mean()) if total else 1.0

    outlier_pct = 0.0
    for col in required_cols:
        if col in df.columns:
            series = df[col].astype(float)
            if series.std() > 0:
                z = (series - series.mean()) / series.std()
                outlier_pct = max(outlier_pct, float((np.abs(z) > 4).mean()))

    date_gap_pct = 0.0
    if isinstance(df.index, pd.DatetimeIndex):
        expected = pd.date_range(df.index.min(), df.index.max(), freq="B")
        date_gap_pct = 1 - len(df.index.intersection(expected)) / max(len(expected), 1)

    # シンプルな重み付け
    score = max(0.0, 1.0 - (missing_pct * 0.5 + outlier_pct * 0.3 + date_gap_pct * 0.2))
    return QualityReport(
        score=score, metrics={"missing_pct": missing_pct, "outlier_pct": outlier_pct, "date_gap_pct": date_gap_pct}
    )
