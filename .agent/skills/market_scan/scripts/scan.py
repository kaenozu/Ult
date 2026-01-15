import sys
import os
import json
from pathlib import Path

current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]
sys.path.insert(0, str(project_root / "backend"))
sys.path.append(str(project_root))

try:
    from src.data_loader import fetch_market_summary, fetch_stock_data
    # from src.auto_trader import AutoTrader # Might be too heavy to instantiate just for scan?
except ImportError as e:
    print(json.dumps({"error": f"Import failed: {e}"}))
    sys.exit(1)

def main():
    try:
        # Get General Summary
        summary_df, stats = fetch_market_summary()
        
        market_data = []
        if not summary_df.empty:
            market_data = summary_df.to_dict(orient="records")
            
        # Scan for opportunities (Simplified logic)
        # We'll check top 5 from summary for RSI < 30 (Buy) or > 70 (Sell)
        
        signals = []
        if market_data:
            # Map aliases back to real tickers for fetching history
            alias_map = {
                "SP500": "^GSPC",
                "USDJPY": "JPY=X",
                "NIKKEI": "^N225",
                "VIX": "^VIX",
                "GOLD": "GC=F",
                "OIL": "CL=F",
                "US10Y": "^TNX"
            }
            
            summary_tickers = [x['ticker'] for x in market_data[:10]]
            real_tickers = [alias_map.get(t, t) for t in summary_tickers]
            
            # Fetch data using real tickers
            data_map = fetch_stock_data(real_tickers, period="3mo")
            
            # Remap results back to aliases for consistency in output if needed, 
            # or just use real tickers for signals.
            # actually data_map keys will be real tickers.
            
            for real_ticker, df in data_map.items():
                # Find original alias if any
                display_ticker = real_ticker
                for alias, target in alias_map.items():
                    if target == real_ticker:
                        display_ticker = alias
                        break
                if df is not None and not df.empty:
                    # Calc RSI
                    delta = df['Close'].diff()
                    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                    rs = gain / loss
                    rsi = 100 - (100 / (1 + rs))
                    current_rsi = rsi.iloc[-1]
                    
                    
                    if current_rsi < 30:
                        signals.append({"ticker": display_ticker, "signal": "BUY", "reason": f"RSI Oversold ({current_rsi:.1f})"})
                    elif current_rsi > 70:
                        signals.append({"ticker": display_ticker, "signal": "SELL", "reason": f"RSI Overbought ({current_rsi:.1f})"})

        output = {
            "market_summary": stats,
            "top_movers": market_data[:5],
            "opportunities": signals
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
