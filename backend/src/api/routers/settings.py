from fastapi import APIRouter, HTTPException
import logging
import sqlite3

from src.api.schemas import ResetPortfolioRequest
from src.api.dependencies import reset_globals, set_paper_trader

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/settings/reset-portfolio")
async def reset_portfolio(request: ResetPortfolioRequest):
    """ポートフォリオをリセットして新しい初期資金で開始"""
    try:
        db_path = "ult_trading.db"
        
        # 1. Stop components and clear globals
        reset_globals()
        
        # 2. Clear existing data using SQL
        try:
            # Use a temporary connection to clear data
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Disable foreign keys temporarily if needed
            cursor.execute("PRAGMA foreign_keys = OFF")
            
            # Get list of tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
            
            for table in tables:
                cursor.execute(f"DELETE FROM {table}")
            
            # Reset sequences if exists
            try:
                cursor.execute("DELETE FROM sqlite_sequence")
            except Exception:
                pass # Ignore if table doesn't exist
            
            conn.commit()
            # VACUUM to shrink file
            try:
                conn.execute("VACUUM")
            except Exception as ve:
                logger.warning(f"VACUUM failed (ignored): {ve}")
            
            conn.close()
            logger.info(f"Cleared database tables: {db_path}")
            
        except Exception as e:
            logger.error(f"Error clearing database: {e}")
            raise HTTPException(status_code=500, detail=f"Database reset failed: {e}")
        
        # 3. Re-initialize PaperTrader with new capital
        from src.paper_trader import PaperTrader
        pt = PaperTrader(db_path=db_path, initial_capital=request.initial_capital)
        
        # Update global singleton
        set_paper_trader(pt)
        
        return {
            "success": True,
            "message": f"ポートフォリオをリセットしました。初期資金: ¥{request.initial_capital:,.0f}",
            "initial_capital": request.initial_capital
        }
    except Exception as e:
        logger.error(f"Error resetting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_config():
    """設定取得（機密情報を除く）"""
    from src.infra.config_loader import config
    full_config = config.get_all()
    sensitive_keys = ["api_key", "password", "secret", "token"]
    for key in list(full_config.keys()):
        for sk in sensitive_keys:
            if sk in key.lower():
                full_config[key] = "***REDACTED***"
    return full_config

@router.get("/audit")
async def get_audit_logs(module: str = None, action: str = None, limit: int = 100):
    """監査ログ取得"""
    from src.database_manager import db_manager
    logs = db_manager.get_audit_logs(module=module, action=action, limit=limit)
    return logs
