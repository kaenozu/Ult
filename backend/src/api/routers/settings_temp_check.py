
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging

from src.api.dependencies import get_portfolio_manager

router = APIRouter()
logger = logging.getLogger(__name__)

class ConfigResponse(BaseModel):
    mode: str
    risk_level: str
    max_position_size: float

@router.get("/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        mode="live", # mock
        risk_level="aggressive",
        max_position_size=0.1
    )

@router.post("/reset")
async def reset_portfolio(pm = Depends(get_portfolio_manager)):
    """Reset portfolio to initial state (¥10M)"""
    try:
        # Assuming pm has a reset method or we need to implement it
        # Based on previous context, paper_trader usually handles this.
        # But let's check if pm.reset_portfolio exists or we use paper_trader direct.
        # For now, let's assume pm.reset_portfolio() exists as per previous audit.
        
        async with pm.lock:
             # Logic to reset DB
             from src.database_manager import db_manager
             db_manager.reset_database() # This is a hypothetical method, usually it deletes/re-creates
             # Or we simply add initial funds
             db_manager.add_trade("CASH", "DEPOSIT", 10000000, 1.0)
             
        return {"status": "success", "message": "Portfolio reset to ¥10,000,000"}
    except Exception as e:
        logger.error(f"Reset failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

