import sys
import os
import json
from pathlib import Path

# Setup paths
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]
sys.path.insert(0, str(project_root / "backend"))
sys.path.append(str(project_root))

try:
    from src.paper_trader import PaperTrader
    from src.auto_trader import AutoTrader
    from src.data_loader import fetch_market_summary, fetch_stock_data
    from src.strategies import LightGBMStrategy
except ImportError as e:
    print(json.dumps({"error": f"Import failed: {e}"}))
    sys.exit(1)

def main():
    try:
        # 1. Portfolio
        pt = PaperTrader()
        balance = pt.get_current_balance()
        
        # 2. AutoPilot
        at = AutoTrader(pt) # Share the PT instance
        at_status = at.get_status()
        
        # 3. Market Summary
        summary_df, stats = fetch_market_summary()
        
        # 4. Watchlist Signals (SoftBank G, Sony G)
        watchlist = ["9984.T", "6758.T"]
        signals = []
        
        # Fetch data for watchlist
        # LightGBM needs valid history, using 5y to be safe as per API server
        data_map = fetch_stock_data(watchlist, period="5y") 
        strat = LightGBMStrategy()
        
        for ticker in watchlist:
            df = data_map.get(ticker)
            if df is not None and not df.empty:
                try:
                    res = strat.analyze(df)
                    signals.append({
                        "ticker": ticker,
                        "signal": res.get("signal"),
                        "confidence": res.get("confidence"),
                        "explanation": strat.get_signal_explanation(res.get("signal", 0))
                    })
                except Exception as e:
                    signals.append({"ticker": ticker, "error": str(e)})
            else:
                signals.append({"ticker": ticker, "error": "No data"})

        output = {
            "portfolio": {
                "total_equity": balance.get("total_equity"),
                "unrealized_pnl": balance.get("unrealized_pnl"),
                "cash": balance.get("cash")
            },
            "system": {
                "auto_trade_enabled": at_status.get("running", False),
                "status": at_status.get("status", "Unknown")
            },
            "market_summary": stats,
            "watchlist": signals
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
