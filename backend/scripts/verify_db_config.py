
import sys
from pathlib import Path
# Updated for location: backend/scripts/verify_db_config.py
# We need to add backend directory to sys.path to import src modules
sys.path.append(str(Path(__file__).resolve().parent.parent))
from src.database_manager import db_manager
import json

def verify():
    key = "strategy_params:ensemble:7203.T"
    print(f"Checking for key: {key}")
    config = db_manager.get_config(key)
    if config:
        print("✅ Config Found!")
        print(json.dumps(config, indent=2, ensure_ascii=False))
    else:
        print("❌ Config Not Found.")

if __name__ == "__main__":
    verify()
