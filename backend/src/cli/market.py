"""
Market Analysis CLI Wrapper
"""
import argparse
import sys
import logging
from src.data_loader import fetch_stock_data

logging.basicConfig(level=logging.WARNING) # Reduce noise

def main():
    parser = argparse.ArgumentParser(description="Market Analysis CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Command: price
    price_parser = subparsers.add_parser("price", help="Get current price of a stock")
    price_parser.add_argument("ticker", type=str, help="Ticker symbol (e.g., 7203.T)")

    args = parser.parse_args()

    try:
        if args.command == "price":
            # fetch_stock_data returns {ticker: DataFrame}
            data = fetch_stock_data([args.ticker], period="1d")
            df = data.get(args.ticker)
            
            if df is not None and not df.empty:
                current_price = df["Close"].iloc[-1]
                print(f"{args.ticker}: ¥{current_price:,.2f}")
            else:
                print(f"Could not fetch data for {args.ticker}")
                sys.exit(1)
        
        else:
            parser.print_help()

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
