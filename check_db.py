import sqlite3
import pandas as pd
import os

db_path = 'c:/gemini-desktop/Ult/stock_data.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    df = pd.read_sql("SELECT * FROM stock_data WHERE ticker='9984.T' ORDER BY date DESC LIMIT 1", conn)
    print(df)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
