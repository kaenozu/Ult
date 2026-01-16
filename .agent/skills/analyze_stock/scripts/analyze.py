import sys
import os
import json
import logging
import argparse
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]  # .agent/skills/analyze_stock/scripts -> ... -> Ult
sys.path.append(str(project_root))
sys.path.append(str(project_root / "backend"))

# Setup logging to suppress noise
logging.basicConfig(level=logging.ERROR)

try:
    from backend.src.data_loader import fetch_stock_data
    from backend.src.advanced_analytics import AdvancedAnalytics
except ImportError as e:
    print(json.dumps({"error": f"Failed to import backend modules: {e}"}))
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Analyze a stock ticker.")
    parser.add_argument("ticker", help="Stock ticker symbol (e.g. 7203.T)")
    args = parser.parse_args()

    ticker = args.ticker

    # 1. Fetch Data
    # Fetch 2 years of data for solid analysis
    try:
        data_map = fetch_stock_data([ticker], period="2y")
        df = data_map.get(ticker)
    except Exception as e:
        print(json.dumps({"error": f"Data fetch failed: {e}"}))
        sys.exit(1)

    if df is None or df.empty:
        print(json.dumps({"error": f"No data found for ticker {ticker}"}))
        sys.exit(1)

    # 2. Analyze
    try:
        analytics = AdvancedAnalytics(df)
        # Calculate returns
        returns = df["Close"].pct_change().dropna()
        risk_metrics = analytics.calculate_risk_metrics(returns)
        
        # Latest data
        latest_price = float(df["Close"].iloc[-1])
        latest_date = str(df.index[-1])

        # 3. Output
        result = {
            "ticker": ticker,
            "latest_date": latest_date,
            "latest_price": latest_price,
            "risk_metrics": risk_metrics
        }
        
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({"error": f"Analysis failed: {e}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
