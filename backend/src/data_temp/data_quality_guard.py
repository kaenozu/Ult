import pandas as pd
from typing import Optional

def evaluate_dataframe(df: pd.DataFrame) -> Optional[str]:
    """
    Evaluates a DataFrame for quality issues.
    Returns a string describing the issue if found, otherwise None.
    """
    if df is None:
        return "DataFrame is None"
    
    if df.empty:
        return "DataFrame is empty"

    if len(df) < 5:
        # Checking for minimum rows, though data_loader might allow it for debug
        return f"Insufficient data: {len(df)} rows"

    # Check for missing required columns
    required_cols = ['Close', 'High', 'Low', 'Open']
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        return f"Missing columns: {missing_cols}"
    
    # Check for excessive NaNs in Close price
    if 'Close' in df.columns and df['Close'].isna().mean() > 0.1:
        return "Excessive NaNs in Close column"

    return None
