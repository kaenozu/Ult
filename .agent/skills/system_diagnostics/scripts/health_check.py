import sys
import os
import json
import shutil
import sqlite3
from pathlib import Path
from datetime import datetime

current_dir = Path(__file__).resolve().parent
project_root = current_dir.parents[3]

def check_db(path):
    if not path.exists():
        return {"status": "MISSING", "path": str(path)}
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        conn.close()
        size_mb = path.stat().st_size / (1024 * 1024)
        return {"status": "OK", "size_mb": round(size_mb, 2), "tables": len(tables)}
    except Exception as e:
        return {"status": "CORRUPT", "error": str(e)}

def main():
    diagnostics = {}
    
    # 1. DB Check
    db_path = project_root / "backend" / "ult_trading.db"
    diagnostics["database"] = check_db(db_path)
    
    # 2. Disk Check
    try:
        total, used, free = shutil.disk_usage(project_root)
        diagnostics["disk"] = {
            "total_gb": round(total / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "percent_used": round((used/total)*100, 1)
        }
    except Exception:
        diagnostics["disk"] = "Unknown"

    # 3. Time Check
    now = datetime.now()
    diagnostics["system_time"] = now.isoformat()
    
    # 4. Dependency Check (stub)
    try:
        import pandas
        import numpy
        import yfinance
        diagnostics["dependencies"] = "OK"
    except ImportError as e:
        diagnostics["dependencies"] = f"MISSING: {e}"

    print(json.dumps(diagnostics, indent=2))

if __name__ == "__main__":
    main()
