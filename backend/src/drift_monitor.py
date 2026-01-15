"""軽量なデータドリフト監視ユーティリティ."""

import logging
from dataclasses import dataclass
from typing import Dict

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _population_stability_index(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """PSIを計算（欠損・ゼロ割り込みに配慮）。"""
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]
    if expected.size == 0 or actual.size == 0:
        return 0.0

    try:
        breakpoints = np.percentile(expected, np.linspace(0, 100, bins + 1))
        expected_counts, _ = np.histogram(expected, bins=breakpoints)
        actual_counts, _ = np.histogram(actual, bins=breakpoints)

        expected_perc = np.where(expected_counts == 0, 1e-6, expected_counts / expected.size)
        actual_perc = np.where(actual_counts == 0, 1e-6, actual_counts / actual.size)

        psi = np.sum((actual_perc - expected_perc) * np.log(actual_perc / expected_perc))
        return float(psi)
    except Exception as exc:
        logger.debug("PSI calculation failed: %s", exc)
        return 0.0


@dataclass
class DriftResult:
    drift_detected: bool
    details: Dict[str, Dict[str, float]]


class DriftMonitor:
    """
    数値特徴量の分布を監視し、ドリフト検知で再学習を促す。
    """

    def __init__(
        self,
        psi_threshold: float = 0.2,
        ks_threshold: float = 0.1,
        min_samples: int = 200,
    ) -> None:
        self.psi_threshold = psi_threshold
        self.ks_threshold = ks_threshold
        self.min_samples = min_samples
        self.reference: pd.DataFrame | None = None

    def set_reference(self, df: pd.DataFrame) -> None:
        """基準データを保存."""
        numeric = df.select_dtypes(include=[np.number])
        if numeric.shape[0] < self.min_samples:
            logger.info(
                "Reference window too small for drift baseline: %s rows",
                numeric.shape[0],
            )
        self.reference = numeric.copy()

    def check(self, df: pd.DataFrame) -> DriftResult:
        """現行データと基準データを比較し、ドリフト有無を返す。"""
        if self.reference is None:
            logger.info("No drift reference set; treating as no drift.")
            return DriftResult(False, {})

        current = df.select_dtypes(include=[np.number])
        if current.empty:
            return DriftResult(False, {})

        drift_cols: Dict[str, Dict[str, float]] = {}

        try:
            from scipy import stats  # type: ignore
        except Exception:
            stats = None  # type: ignore

        common_cols = [c for c in current.columns if c in self.reference.columns]
        for col in common_cols:
            ref_col = self.reference[col].dropna().values
            cur_col = current[col].dropna().values
            if ref_col.size < self.min_samples or cur_col.size < self.min_samples:
                continue

            psi = _population_stability_index(ref_col, cur_col)
            ks_stat = 0.0
            if stats:
                try:
                    ks_stat = float(stats.ks_2samp(ref_col, cur_col).statistic)
                except Exception:
                    ks_stat = 0.0

            if psi > self.psi_threshold or ks_stat > self.ks_threshold:
                drift_cols[col] = {"psi": psi, "ks": ks_stat}

        drift_detected = bool(drift_cols)
        return DriftResult(drift_detected, drift_cols)
