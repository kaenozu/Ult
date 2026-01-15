from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.signal import argrelextrema


def find_local_extrema(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    """
    Finds local minima and maxima.
    """
    df = df.copy()
    # Use iloc for integer-based indexing which argrelextrema returns
    # order=window means checking +/- window points

    # Find local max
    local_max_idx = argrelextrema(df["High"].values, np.greater, order=window)[0]
    df["is_max"] = False
    df.iloc[local_max_idx, df.columns.get_loc("is_max")] = True

    # Find local min
    local_min_idx = argrelextrema(df["Low"].values, np.less, order=window)[0]
    df["is_min"] = False
    df.iloc[local_min_idx, df.columns.get_loc("is_min")] = True

    return df


def detect_double_bottom(df: pd.DataFrame, tolerance: float = 0.03) -> Optional[Dict]:
    """
    Detects Double Bottom pattern (W shape).
    Returns a dict with pattern details if found, else None.
    """
    if len(df) < 30:
        return None

    df_ext = find_local_extrema(df, window=5)
    minima = df_ext[df_ext["is_min"]]

    if len(minima) < 2:
        return None

    # Check the last two minima
    last_min = minima.iloc[-1]
    prev_min = minima.iloc[-2]

    # Check if they are roughly equal in price
    price_diff = abs(last_min["Low"] - prev_min["Low"])
    avg_price = (last_min["Low"] + prev_min["Low"]) / 2

    if price_diff / avg_price <= tolerance:
        # Check if there is a peak between them
        between_mask = (df_ext.index > prev_min.name) & (df_ext.index < last_min.name)
        peaks_between = df_ext[between_mask & df_ext["is_max"]]

        if not peaks_between.empty:
            peak = peaks_between["High"].max()
            # Confirm it's a "W" shape: Peak should be significantly higher than bottoms
            if (peak - avg_price) / avg_price > 0.05:
                return {
                    "pattern": "Double Bottom",
                    "confidence": 1.0 - (price_diff / avg_price) / tolerance,  # Higher confidence if prices are closer
                    "points": [prev_min.name, last_min.name],
                    "description": "底値を2回試し、反発の兆し (W字型)",
                }

    return None


def detect_head_and_shoulders_bottom(df: pd.DataFrame, tolerance: float = 0.05) -> Optional[Dict]:
    """
    Detects Inverse Head and Shoulders (Bottom).
    """
    if len(df) < 50:
        return None

    df_ext = find_local_extrema(df, window=5)
    minima = df_ext[df_ext["is_min"]]

    if len(minima) < 3:
        return None

    # Check recent minima (last 5 to find a pattern)
    recent_minima = minima.iloc[-5:]
    print(f"DEBUG: Minima found: {recent_minima}")  # Uncomment for debugging

    if len(recent_minima) < 3:
        return None

    # Iterate through triplets of minima
    for i in range(len(recent_minima) - 2):
        left = recent_minima.iloc[i]
        head = recent_minima.iloc[i + 1]
        right = recent_minima.iloc[i + 2]

        # Logic: Head must be lower than both shoulders
        if head["Low"] < left["Low"] and head["Low"] < right["Low"]:
            # Shoulders should be roughly equal
            shoulder_diff = abs(left["Low"] - right["Low"])
            avg_shoulder = (left["Low"] + right["Low"]) / 2

            if shoulder_diff / avg_shoulder <= tolerance:
                return {
                    "pattern": "Inv. Head & Shoulders",
                    "confidence": 0.8,
                    "points": [left.name, head.name, right.name],
                    "description": "逆三尊 (底打ちシグナル)",
                }

    return None


def detect_triangle(df: pd.DataFrame) -> Optional[Dict]:
    """
    Detects Ascending or Descending Triangle.
    """
    if len(df) < 30:
        return None

    df_ext = find_local_extrema(df, window=5)
    minima = df_ext[df_ext["is_min"]]
    maxima = df_ext[df_ext["is_max"]]

    if len(minima) < 3 or len(maxima) < 3:
        return None

    # Get last 3 points
    last_mins = minima.iloc[-3:]
    last_maxs = maxima.iloc[-3:]

    # Ascending Triangle: Flat Highs, Higher Lows
    highs_slope = np.polyfit(range(3), last_maxs["High"].values, 1)[0]
    lows_slope = np.polyfit(range(3), last_mins["Low"].values, 1)[0]

    avg_price = df["Close"].mean()

    # Normalize slope roughly
    highs_slope_norm = highs_slope / avg_price
    lows_slope_norm = lows_slope / avg_price

    if abs(highs_slope_norm) < 0.005 and lows_slope_norm > 0.005:
        return {
            "pattern": "Ascending Triangle",
            "confidence": 0.7,
            "description": "上昇三角持ち合い (強気)",
        }

    # Descending Triangle: Lower Highs, Flat Lows
    if highs_slope_norm < -0.005 and abs(lows_slope_norm) < 0.005:
        return {
            "pattern": "Descending Triangle",
            "confidence": 0.7,
            "description": "下降三角持ち合い (弱気)",
        }

    return None


def scan_for_patterns(ticker: str, df: pd.DataFrame) -> List[Dict]:
    """
    Scans a single ticker for all implemented patterns.
    """
    patterns = []

    try:
        # Double Bottom
        db = detect_double_bottom(df)
        if db:
            db["ticker"] = ticker
            patterns.append(db)

        # Head & Shoulders
        hs = detect_head_and_shoulders_bottom(df)
        if hs:
            hs["ticker"] = ticker
            patterns.append(hs)

        # Triangle
        tri = detect_triangle(df)
        if tri:
            tri["ticker"] = ticker
            patterns.append(tri)

    except Exception as e:
        print(f"Error scanning patterns for {ticker}: {e}")

    return patterns
