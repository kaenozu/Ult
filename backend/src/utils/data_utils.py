"""
Common Data Utilities
Centralized utilities to reduce code duplication.
"""

import logging
from typing import List, Optional
import pandas as pd
import numpy as np

from src.exceptions import DataValidationError

logger = logging.getLogger(__name__)


def validate_dataframe(df: pd.DataFrame, required_columns: List[str], min_rows: int = 1) -> None:
    """
    Validate DataFrame has required columns and minimum rows.

    Args:
        df: DataFrame to validate
        required_columns: List of required column names
        min_rows: Minimum number of rows required

    Raises:
        DataValidationError: If validation fails

    Example:
        >>> validate_dataframe(df, ['Close', 'Volume'], min_rows=10)
    """
    if df is None or df.empty:
        raise DataValidationError("DataFrame is None or empty")

    missing_columns = set(required_columns) - set(df.columns)
    if missing_columns:
        raise DataValidationError(
            f"Missing required columns: {missing_columns}",
            details={"missing": list(missing_columns), "available": list(df.columns)},
        )

    if len(df) < min_rows:
        raise DataValidationError(
            f"Insufficient rows: {len(df)} < {min_rows}",
            details={"actual_rows": len(df), "required_rows": min_rows},
        )


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers, returning default if division by zero.

    Args:
        numerator: Numerator
        denominator: Denominator
        default: Value to return if denominator is zero

    Returns:
        Result of division or default value

    Example:
        >>> safe_divide(10, 2)
        5.0
        >>> safe_divide(10, 0, default=0.0)
        0.0
    """
    if denominator == 0 or pd.isna(denominator):
        return default
    return numerator / denominator


def calculate_percentage_change(current: float, previous: float, default: float = 0.0) -> float:
    """
    Calculate percentage change between two values.

    Args:
        current: Current value
        previous: Previous value
        default: Value to return if previous is zero

    Returns:
        Percentage change as decimal (0.05 = 5%)

    Example:
        >>> calculate_percentage_change(110, 100)
        0.1  # 10% increase
    """
    if previous == 0 or pd.isna(previous):
        return default
    return (current - previous) / previous


def remove_outliers(series: pd.Series, n_std: float = 3.0) -> pd.Series:
    """
    Remove outliers from a series using standard deviation method.

    Args:
        series: Pandas Series
        n_std: Number of standard deviations for outlier threshold

    Returns:
        Series with outliers replaced by NaN

    Example:
        >>> clean_series = remove_outliers(df['Close'], n_std=3.0)
    """
    mean = series.mean()
    std = series.std()

    lower_bound = mean - n_std * std
    upper_bound = mean + n_std * std

    return series.where((series >= lower_bound) & (series <= upper_bound))


def fill_missing_values(df: pd.DataFrame, method: str = "ffill", limit: Optional[int] = None) -> pd.DataFrame:
    """
    Fill missing values in DataFrame.

    Args:
        df: DataFrame with missing values
        method: Fill method ('ffill', 'bfill', 'interpolate')
        limit: Maximum number of consecutive NaNs to fill

    Returns:
        DataFrame with filled values

    Example:
        >>> filled_df = fill_missing_values(df, method='ffill', limit=3)
    """
    df = df.copy()

    if method == "ffill":
        return df.fillna(method="ffill", limit=limit)
    elif method == "bfill":
        return df.fillna(method="bfill", limit=limit)
    elif method == "interpolate":
        return df.interpolate(method="linear", limit=limit)
    else:
        raise ValueError(f"Unknown fill method: {method}")


def ensure_datetime_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure DataFrame has DatetimeIndex.

    Args:
        df: DataFrame

    Returns:
        DataFrame with DatetimeIndex

    Raises:
        DataValidationError: If index cannot be converted to datetime
    """
    if isinstance(df.index, pd.DatetimeIndex):
        return df

    try:
        df = df.copy()
        df.index = pd.to_datetime(df.index)
        return df
    except Exception as e:
        raise DataValidationError(
            f"Cannot convert index to datetime: {e}",
            details={"index_type": str(type(df.index))},
        )


def clip_values(series: pd.Series, lower_percentile: float = 0.01, upper_percentile: float = 0.99) -> pd.Series:
    """
    Clip values to percentile range.

    Args:
        series: Pandas Series
        lower_percentile: Lower percentile (0-1)
        upper_percentile: Upper percentile (0-1)

    Returns:
        Clipped series

    Example:
        >>> clipped = clip_values(df['Volume'], 0.01, 0.99)
    """
    lower = series.quantile(lower_percentile)
    upper = series.quantile(upper_percentile)
    return series.clip(lower=lower, upper=upper)


def calculate_returns(prices: pd.Series, method: str = "simple") -> pd.Series:
    """
    Calculate returns from price series.

    Args:
        prices: Price series
        method: 'simple' or 'log'

    Returns:
        Returns series

    Example:
        >>> returns = calculate_returns(df['Close'], method='simple')
    """
    if method == "simple":
        return prices.pct_change()
    elif method == "log":
        return np.log(prices / prices.shift(1))
    else:
        raise ValueError(f"Unknown return method: {method}")
