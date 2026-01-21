import pandas as pd
from typing import Optional

def evaluate_dataframe(df: pd.DataFrame) -> Optional[str]:
    """
    Evaluates the quality of a dataframe.
    Returns None if the dataframe is good, or a string describing the issue.
    """
    if df is None or df.empty:
        return "DataFrame is empty"

    # Check for missing values in critical columns
    critical_cols = ["Open", "High", "Low", "Close"]
    for col in critical_cols:
        if col in df.columns:
            if df[col].isnull().any():
                return f"Missing values in {col}"

    return None
