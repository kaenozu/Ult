import sqlite3
import pandas as pd
import os
import datetime

db_path = 'c:/gemini-desktop/Ult/backend/stock_data.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Opening DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    df = pd.read_sql("SELECT * FROM stock_data WHERE ticker='9984.T' ORDER BY date DESC LIMIT 5", conn)
    print("Data for 9984.T:")
    print(df)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
