import sys
import os
import json
import argparse
from pathlib import Path

# Setup paths
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]
sys.path.insert(0, str(project_root / "backend"))
sys.path.append(str(project_root))

try:
    # Now src.backtesting should resolve to backend/src/backtesting
    from src.backtesting.engine import BacktestEngine as Backtester
    from src.strategies.technical.rsi import RSIStrategy
except ImportError:
    # Fallback/Debug
    from backend.src.backtester import Backtester
    from backend.src.strategies.technical.rsi import RSIStrategy

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ticker")
    parser.add_argument("--period", default="1y")
    parser.add_argument("--strategy", default="RSI")
    args = parser.parse_args()

    # Note: Backtester usually takes a strategy instance and data
    # We might need to fetch data here or let Backtester do it.
    # Looking at Backtester shim, it inherits CoreEngine.
    
    # Simple setup:
    try:
        from backend.src.data_loader import fetch_stock_data
        data_map = fetch_stock_data([args.ticker], period=args.period)
        df = data_map.get(args.ticker)
        
        if df is None or df.empty:
            print(json.dumps({"error": "No data found"}))
            sys.exit(1)

        # Strategy Selection
        strategy = RSIStrategy() # Default for now
        # TODO: Add logic for other strategies if requested

        engine = Backtester()
        results = engine.run(data=df, strategy=strategy)
        
        # Format metrics
        metrics = results # CoreEngine.run returns a dict with keys like 'total_return', 'metrics' is not a sub-key typically?
        # Let's check run() return. 
        # It returns dict with keys: "total_return", "final_value", ... "sharpe_ratio", ...
        # So metrics ARE the results.
        
        output = {
            "ticker": args.ticker,
            "period": args.period,
            "total_return": results.get("total_return", 0.0),
            "sharpe_ratio": results.get("sharpe_ratio", 0.0),
            "max_drawdown": results.get("max_drawdown", 0.0),
            "trades_count": results.get("num_trades", 0),
            "win_rate": results.get("win_rate", 0.0)
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
