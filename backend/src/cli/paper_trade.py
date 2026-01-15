"""
Paper Trading CLI Wrapper
"""
import argparse
import sys
import logging
from src.paper_trader import PaperTrader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Paper Trading CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Command: balance
    subparsers.add_parser("balance", help="Show current balance and equity")

    # Command: positions
    subparsers.add_parser("positions", help="Show current positions")

    # Command: buy
    buy_parser = subparsers.add_parser("buy", help="Buy a stock")
    buy_parser.add_argument("ticker", type=str, help="Ticker symbol (e.g., 7203.T)")
    buy_parser.add_argument("qty", type=int, help="Quantity")
    buy_parser.add_argument("price", type=float, help="Price per share")

    # Command: sell
    sell_parser = subparsers.add_parser("sell", help="Sell a stock")
    sell_parser.add_argument("ticker", type=str, help="Ticker symbol")
    sell_parser.add_argument("qty", type=int, help="Quantity")
    sell_parser.add_argument("price", type=float, help="Price per share")

    args = parser.parse_args()

    pt = PaperTrader()

    try:
        if args.command == "balance":
            balance = pt.get_current_balance()
            print(f"Cash: ¥{balance['cash']:,.0f}")
            print(f"Total Equity: ¥{balance['total_equity']:,.0f}")
            print(f"Daily PnL: ¥{balance['daily_pnl']:,.0f}")

        elif args.command == "positions":
            df = pt.get_positions()
            if df.empty:
                print("No positions found.")
            else:
                print(df[["ticker", "quantity", "avg_price", "current_price", "unrealized_pnl"]].to_string())

        elif args.command == "buy":
            success = pt.execute_trade(
                ticker=args.ticker,
                action="BUY",
                quantity=args.qty,
                price=args.price,
                reason="CLI Order"
            )
            if success:
                print(f"Successfully bought {args.qty} shares of {args.ticker} at ¥{args.price}")
            else:
                print("Failed to execute buy order.")
                sys.exit(1)

        elif args.command == "sell":
            success = pt.execute_trade(
                ticker=args.ticker,
                action="SELL",
                quantity=args.qty,
                price=args.price,
                reason="CLI Order"
            )
            if success:
                print(f"Successfully sold {args.qty} shares of {args.ticker} at ¥{args.price}")
            else:
                print("Failed to execute sell order.")
                sys.exit(1)
        
        else:
            parser.print_help()

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        pt.close()

if __name__ == "__main__":
    main()
