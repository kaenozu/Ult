import sqlite3
import pandas as pd
import os
import datetime
import argparse
from pathlib import Path

def find_db():
    # Common locations for the database
    candidates = [
        'stock_data.db',
        'backend/stock_data.db',
        '../stock_data.db',
        './data/stock_data.db',
        'c:/gemini-desktop/Ult/stock_data.db',
        'c:/gemini-desktop/Ult/backend/stock_data.db',
    ]

    # Check absolute path relative to script location
    script_dir = Path(__file__).parent
    candidates.append(str(script_dir.parent / 'stock_data.db'))
    candidates.append(str(script_dir.parent.parent / 'stock_data.db'))

    for path in candidates:
        if os.path.exists(path):
            return path
    return None

def inspect(ticker, limit):
    db_path = find_db()
    if not db_path:
        print("❌ Database not found in common locations.")
        return

    print(f"📂 Using Database: {db_path}")

    try:
        conn = sqlite3.connect(db_path)

        # Check tables
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"📑 Tables found: {', '.join(tables)}")

        if 'stock_data' in tables:
            query = f"SELECT * FROM stock_data WHERE ticker='{ticker}' ORDER BY date DESC LIMIT {limit}"
            df = pd.read_sql(query, conn)

            if df.empty:
                print(f"⚠️ No data found for ticker: {ticker}")
            else:
                print(f"\n📊 Data for {ticker} (Last {limit} records):")
                print(df)

                if 'date' in df.columns:
                    last_date_str = df['date'].iloc[0]
                    try:
                        last_date = pd.to_datetime(last_date_str)
                        now = datetime.datetime.now()
                        diff = now - last_date
                        print(f"\n🕒 Data freshness:")
                        print(f"  Last Date: {last_date}")
                        print(f"  Current:   {now}")
                        print(f"  Age:       {diff}")
                    except Exception as e:
                        print(f"Could not parse date: {e}")
        else:
            print("⚠️ Table 'stock_data' not found.")

        conn.close()

    except Exception as e:
        print(f"❌ Error accessing database: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect Stock Database")
    parser.add_argument("--ticker", type=str, default="9984.T", help="Ticker symbol to check")
    parser.add_argument("--limit", type=int, default=5, help="Number of rows to display")

    args = parser.parse_args()
    inspect(args.ticker, args.limit)
