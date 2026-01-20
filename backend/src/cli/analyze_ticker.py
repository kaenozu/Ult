import sys
import os
import argparse
import logging
import pandas as pd
import numpy as np

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from src.data_temp.data_loader import fetch_stock_data
from src.strategies.ml.lightgbm import LightGBMStrategy
from src.core.constants import MINIMUM_DATA_POINTS

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def analyze(ticker: str):
    print(f"\n🔍 ANALYZING {ticker} ...")
    print(f"==========================================")
    
    # 1. Data Fetch
    print(f" [*] Fetching data (Min Points: {MINIMUM_DATA_POINTS})...")
    data_map = fetch_stock_data([ticker], period="2y")
    df = data_map.get(ticker)
    
    if df is None or df.empty:
        print(f" [!] ERROR: No data found for {ticker}.")
        return

    print(f" [OK] Data fetched. Rows: {len(df)}")
    print(f"      Latest Close: {df['Close'].iloc[-1]:.2f}")
    
    if len(df) < MINIMUM_DATA_POINTS:
        print(f" [!] WARNING: Data count ({len(df)}) < Minimum ({MINIMUM_DATA_POINTS}). Models may fail.")

    # 2. Strategy Analysis (LightGBM)
    print(f"\n [*] Running LightGBM Strategy...")
    strat = LightGBMStrategy()
    
    # Check internal threshold
    print(f"      Threshold: {strat.default_positive_threshold} (Guardian Mode: {'ON' if strat.default_positive_threshold >= 0.52 else 'OFF'})")
    
    try:
        # We use the public analyze method first to see the final result
        result = strat.analyze(df)
        
        signal = result["signal"]
        confidence = result["confidence"]
        
        # Interpret Signal
        sig_str = "HOLD/NEUTRAL"
        if signal > 0: sig_str = f"BUY (+{signal})"
        elif signal < 0: sig_str = f"SELL ({signal})"
        
        print(f" [RESULT] Signal: {sig_str}")
        print(f"          Confidence: {confidence:.4f}")
        print(f"          Reason: {result.get('reason', 'N/A')}")
        
        # Deep Dive (Peek into model)
        if strat.model is not None:
             # Just a quick check of the last raw prediction if possible
             # Re-generating features locally to peek
             from src.features import add_advanced_features, add_macro_features
             from src.data_temp.data_loader import fetch_macro_data
             
             work_df = df.copy()
             if work_df.index.tz is not None:
                 work_df.index = work_df.index.tz_localize(None)
                 
             d = add_advanced_features(work_df)
             # Basic macro
             try:
                 macro = fetch_macro_data(period="2y")
                 d = add_macro_features(d, macro)
             except:
                 pass
                 
             # Fill NaNs
             for c in strat.feature_cols:
                 if c not in d.columns: d[c] = 0.0
                 else: d[c] = d[c].fillna(0.0)
                 
             last_X = d[strat.feature_cols].iloc[[-1]]
             raw_prob = strat.model.predict(last_X)[0]
             print(f" [DEBUG] Raw Model Probability: {raw_prob:.4f}")
             print(f"         Distance to Threshold: {raw_prob - strat.default_positive_threshold:.4f}")
        else:
             print(" [DEBUG] Model is not trained (insufficient history or first run).")

    except Exception as e:
        print(f" [!] Error during strategy execution: {e}")
        import traceback
        traceback.print_exc()

    print(f"==========================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze a specific stock ticker using AGStock strategies.")
    parser.add_argument("ticker", type=str, help="The ticker symbol (e.g., 7203.T)")
    args = parser.parse_args()
    
    analyze(args.ticker)
