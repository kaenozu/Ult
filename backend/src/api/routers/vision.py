import base64
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from src.evolution.chart_vision import ChartVisionEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vision", tags=["Vision"])

# Initialize engine
# Since ChartVisionEngine init is lightweight (just config), we can do it here.
# In a larger app, we might use dependency injection.
vision_engine = ChartVisionEngine()

class VisionRequest(BaseModel):
    image: str  # Base64 string
    ticker: str

@router.post("/analyze")
async def analyze_chart_vision(request: VisionRequest) -> Dict[str, Any]:
    """
    Analyze a chart image (base64) using Gemini Vision.
    """
    if not vision_engine.has_vision:
        raise HTTPException(
            status_code=503, 
            detail="Vision capability is not available (Check GEMINI_API_KEY)"
        )

    try:
        # Decode base64
        # Remove data:image/png;base64, prefix if present
        image_data_str = request.image
        if "," in image_data_str:
            image_data_str = image_data_str.split(",")[1]
            
        image_bytes = base64.b64decode(image_data_str)
        
        result = vision_engine.analyze_image_bytes(image_bytes, request.ticker)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to analyze image with Gemini")
            
        return result

    except Exception as e:
        logger.error(f"Error in vision analysis endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SaveRequest(BaseModel):
    ticker: str
    image: str # Base64
    analysis: Dict[str, Any]

@router.post("/save")
async def save_vision_result(request: SaveRequest) -> Dict[str, str]:
    """Save chart screenshot and analysis to the diary"""
    from src.database_manager import db_manager
    import os
    from datetime import datetime
    
    try:
        # Decode image
        image_data_str = request.image
        if "," in image_data_str:
            image_data_str = image_data_str.split(",")[1]
        image_bytes = base64.b64decode(image_data_str)
        
        # Ensure directory exists
        # Use absolute path to backend/data/screenshots
        import sys
        
        # Find backend root based on common structure
        # Assuming cwd is backend or root.
        # Let's rely on relative to current file slightly safer if we can find backend root
        # But for now, let's hardcode relative to os.getcwd() if we are running from root
        
        # Note: server.py adds backend_root to sys.path. 
        # Ideally we use a config, but let's assume `data` folder at project root or backend root.
        # Let's put it in `backend/data/screenshots`
        
        # Try to find backend dir
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # src/api/routers -> src/api -> src -> backend
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        data_dir = os.path.join(backend_dir, "data", "screenshots")
        
        os.makedirs(data_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{request.ticker}_{timestamp}.png"
        filepath = os.path.join(data_dir, filename)
        
        # Save File
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        # Save to DB
        record_id = db_manager.save_screenshot_record(
            ticker=request.ticker,
            filepath=filename, # Store relative filename for portability
            analysis_result=request.analysis
        )
        
        return {"status": "saved", "id": record_id, "filename": filename}

    except Exception as e:
        logger.error(f"Failed to save screenshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gallery/{ticker}")
async def get_gallery(ticker: str) -> Dict[str, Any]:
    """Get screenshot gallery for a ticker"""
    from src.database_manager import db_manager
    
    try:
        screenshots = db_manager.get_screenshots(ticker)
        return {"screenshots": screenshots}
    except Exception as e:
        logger.error(f"Failed to load gallery: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import FileResponse
@router.get("/image/{filename}")
async def get_image(filename: str):
    """Serve a screenshot image"""
    import os
    
    try:
        # Reconstruct path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        data_dir = os.path.join(backend_dir, "data", "screenshots")
        filepath = os.path.join(data_dir, filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Image not found")
            
        return FileResponse(filepath)
    except Exception as e:
        logger.error(f"Failed to serve image: {e}")
        raise HTTPException(status_code=404, detail="Image not found")
