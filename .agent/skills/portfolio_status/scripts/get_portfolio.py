import sys
import os
import json
from pathlib import Path

# Setup paths
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]
sys.path.append(str(project_root))
sys.path.append(str(project_root / "backend"))

try:
    from backend.src.paper_trader import PaperTrader
except ImportError as e:
    print(json.dumps({"error": f"Import failed: {e}"}))
    sys.exit(1)

def main():
    try:
        # Use default db
        pt = PaperTrader(db_path="ult_trading.db") # Using relative path from CWD potentially
        # Ideally absolute path to db in backend root
        db_path = project_root / "backend" / "ult_trading.db"
        pt = PaperTrader(db_path=str(db_path))
        
        status = pt.get_current_balance()
        positions_df = pt.get_positions()
        
        # Convert positions to list of dicts
        positions_list = []
        if not positions_df.empty:
            positions_list = positions_df.to_dict(orient="records")
        
        output = {
            "summary": status,
            "positions": positions_list
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
