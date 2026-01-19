import sqlite3
import pandas as pd
import os
import datetime

# Try both potential locations
paths = ['stock_data.db', 'c:/gemini-desktop/Ult/stock_data.db']
db_path = None
for p in paths:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    print("Database not found")
    exit(1)

print(f"Opening DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    # Check table existence
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_data'")
    if not cursor.fetchone():
        print("Table 'stock_data' does not exist")
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        print("Tables found:", cursor.fetchall())
        conn.close()
        exit(0)

    # Check data
    df = pd.read_sql("SELECT * FROM stock_data WHERE ticker='9984.T' ORDER BY date DESC LIMIT 5", conn)
    print("Data for 9984.T:")
    print(df)
    
    if not df.empty:
        last_date = pd.to_datetime(df['date'].iloc[0])
        print(f"Last date in DB: {last_date}")
        print(f"Now: {datetime.datetime.now()}")
        diff = datetime.datetime.now() - last_date
        print(f"Age: {diff}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
