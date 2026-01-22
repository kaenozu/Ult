import asyncio
import sys
import os

# Add backend to path
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.earnings_provider import earnings_provider

async def test_earnings():
    print("Testing Earnings Provider...")
    tickers = ["7203.T", "6758.T", "9984.T"] # Toyota, Sony, Softbank
    results = earnings_provider.get_upcoming_earnings(tickers, days_horizon=90)
    
    print("\nResults:")
    for res in results:
        print(f"{res['ticker']}: {res['earnings_date']} (in {res['days_to_earnings']} days)")
        
    if not results:
        print("No upcoming earnings found (or API failed). Check logs.")

if __name__ == "__main__":
    asyncio.run(test_earnings())
