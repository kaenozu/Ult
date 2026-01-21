from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import shutil
import base64
import json
import logging
from uuid import uuid4
from fastapi.responses import FileResponse

from src.database_manager import db_manager

router = APIRouter(prefix="/journal", tags=["journal"])
logger = logging.getLogger(__name__)

SCREENSHOT_DIR = "data/screenshots"

# Ensure screenshot directory exists
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class ScreenshotCaptureRequest(BaseModel):
    ticker: str
    image_base64: str
    analysis_context: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class ScreenshotResponse(BaseModel):
    id: str
    ticker: str
    filepath: str
    analysis_result: Dict[str, Any]
    timestamp: str
    created_at: str

@router.post("/capture", response_model=Dict[str, str])
async def capture_screenshot(request: ScreenshotCaptureRequest):
    """
    Save a screenshot to the local filesystem and record it in the database.
    """
    try:
        # Decode base64 image
        if "," in request.image_base64:
            header, encoded = request.image_base64.split(",", 1)
        else:
            encoded = request.image_base64
            
        image_data = base64.b64decode(encoded)
        
        # Generate filename (hashed/randomized for privacy/security as per debate)
        # Using UUID for simplicity and uniqueness
        file_id = str(uuid4())
        filename = f"{file_id}.png"
        
        # Create YYYY/MM structure
        now = datetime.now()
        sub_dir = os.path.join(SCREENSHOT_DIR, now.strftime("%Y"), now.strftime("%m"))
        os.makedirs(sub_dir, exist_ok=True)
        
        filepath = os.path.join(sub_dir, filename)
        
        # Save to disk
        with open(filepath, "wb") as f:
            f.write(image_data)
            
        # Save to DB
        record_id = db_manager.save_screenshot_record(
            ticker=request.ticker,
            filepath=filepath,
            analysis_result=request.analysis_context or {},
            timestamp=request.timestamp
        )
        
        return {
            "id": record_id,
            "status": "success", 
            "message": "Screenshot captured successfully"
        }

    except Exception as e:
        logger.error(f"Failed to capture screenshot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[ScreenshotResponse])
async def list_screenshots(ticker: str, limit: int = 50):
    """
    List screenshots for a specific ticker.
    """
    try:
        results = db_manager.get_screenshots(ticker=ticker, limit=limit)
        return results
    except Exception as e:
        logger.error(f"Failed to list screenshots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/image/{file_id}")
async def get_screenshot_image(file_id: str):
    """
    Serve the raw image file for a screenshot record.
    """
    try:
        record = db_manager.get_screenshot_by_id(file_id)
        if not record:
             raise HTTPException(status_code=404, detail="Screenshot not found")
             
        filepath = record["filepath"]
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Image file missing from server storage")
            
        return FileResponse(filepath)
    except Exception as e:
        logger.error(f"Failed to serve image {file_id}: {e}")
        # Return HTTP exception if not already
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


