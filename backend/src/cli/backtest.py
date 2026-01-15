import argparse
import json
import urllib.request
import urllib.error
import sys

API_URL = "http://localhost:8000/api/v1/backtest"

def run_backtest(ticker: str, strategy: str, period: str, capital: float):
    payload = {
        "ticker": ticker,
        "strategy": strategy,
        "period": period,
        "initial_capital": capital
    }
    
    try:
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
    except urllib.error.URLError as e:
        print(f"Error connecting to API: {e}", file=sys.stderr)
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'), file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Run backtest via AGStock API")
    parser.add_argument("ticker", help="Stock ticker (e.g., 7203.T)")
    parser.add_argument("--strategy", default="LightGBM", choices=["LightGBM", "RSI"], help="Trading strategy")
    parser.add_argument("--period", default="1y", help="Backtest period (e.g., 1y, 6mo)")
    parser.add_argument("--capital", type=float, default=1000000, help="Initial capital")
    
    args = parser.parse_args()
    
    run_backtest(args.ticker, args.strategy, args.period, args.capital)

if __name__ == "__main__":
    main()
