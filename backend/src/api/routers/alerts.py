from typing import List, Optional
from fastapi import APIRouter, HTTPException
import logging
import time

from src.api.schemas import AlertRequest, AlertResponse
from src.database_manager import db_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(status: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
    """アラート履歴取得"""
    alerts = db_manager.get_alerts(status=status, severity=severity, limit=limit)
    return [
        AlertResponse(
            alert_id=a["id"],
            alert_type=a["alert_type"],
            message=a["message"],
            severity=a["severity"],
            status=a["status"],
            timestamp=a["timestamp"],
        )
        for a in alerts
    ]

@router.post("/alerts", response_model=AlertResponse)
async def create_alert(request: AlertRequest):
    """新規アラート作成"""
    alert_id = db_manager.save_alert(
        alert_type=request.alert_type,
        message=request.message,
        severity=request.severity,
    )
    return AlertResponse(
        alert_id=alert_id,
        alert_type=request.alert_type,
        message=request.message,
        severity=request.severity,
        status="active",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
    )
