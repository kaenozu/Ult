import sqlite3
import pandas as pd
import os

def inspect_db():
    db_path = "backend/ult_trading.db"
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    try:
        print("--- ACCOUNTS ---")
        df_acc = pd.read_sql_query("SELECT * FROM accounts", conn)
        print(df_acc)
        
        print("\n--- ORDERS ---")
        df_ord = pd.read_sql_query("SELECT * FROM orders", conn)
        print(df_ord)

        print("\n--- POSITIONS (Raw) ---")
        df_pos = pd.read_sql_query("SELECT * FROM positions", conn)
        print(df_pos)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_db()
