from fastapi import APIRouter, HTTPException
from src.execution.news_shock_defense import NewsShockDefense
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Singleton Instance
shock_defense = NewsShockDefense()

@router.get("/security/shock-radar")
async def get_shock_radar():
    """
    Get current market shock level.
    """
    try:
        # Trigger analysis (Real-time check)
        # In production this should be async background job
        shock_defense.analyze_current_market()
        return shock_defense.get_shock_status()
    except Exception as e:
        logger.error(f"Shock Radar Error: {e}")
        return {"level": "UNKNOWN", "score": 0.0}
