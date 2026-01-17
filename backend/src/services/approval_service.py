import json
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import uuid4

from src.api.websocket_manager import TypedWebSocketManager
from src.api.websocket_types import (
    ApprovalType,
    ApprovalStatus,
    MessageFactory,
    ApprovalRequestPayload
)

class ApprovalService:
    def __init__(self, redis_url: str = "redis://localhost", ws_manager: Optional[TypedWebSocketManager] = None):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self.ws_manager = ws_manager
        self.ttl_seconds = 60

    async def request_approval(
        self,
        approval_type: ApprovalType,
        title: str,
        description: str,
        context: Dict[str, Any],
        priority: str = "medium"
    ) -> str:
        """
        Creates an approval request, stores it in Redis, and broadcasts it via WebSocket.
        Returns the request_id.
        """
        request_id = str(uuid4())
        
        # Store in Redis
        key = f"approval:{request_id}"
        data = {
            "request_id": request_id,
            "type": approval_type.value,
            "title": title,
            "description": description,
            "context": json.dumps(context), # Serialize nested dict
            "status": ApprovalStatus.PENDING.value,
            "created_at": datetime.utcnow().isoformat(),
            "priority": priority
        }
        
        await self.redis.hset(key, mapping=data)
        await self.redis.expire(key, self.ttl_seconds)

        # Broadcast via WebSocket
        if self.ws_manager:
            message = MessageFactory.approval_request(
                request_id=request_id,
                approval_type=approval_type,
                title=title,
                description=description,
                context=context,
                priority=priority,
                expires_in_seconds=self.ttl_seconds
            )
            # We need a method in ws_manager to send raw message or specific type
            # Assuming ws_manager can broadcast AnyServerMessage
            await self.ws_manager.broadcast_message(message)

        return request_id

    async def check_approval_status(self, request_id: str) -> ApprovalStatus:
        """
        Checks the status of an improvement request.
        If key is missing, it's considered EXPIRED (or REJECTED by default).
        """
        key = f"approval:{request_id}"
        status_str = await self.redis.hget(key, "status")
        
        if not status_str:
            return ApprovalStatus.EXPIRED
            
        return ApprovalStatus(status_str)

    async def respond_to_request(self, request_id: str, status: ApprovalStatus, responder: str, reason: str = None) -> bool:
        """
        Updates the status of a request (Approved/Rejected).
        """
        key = f"approval:{request_id}"
        exists = await self.redis.exists(key)
        
        if not exists:
            return False
            
        await self.redis.hset(key, mapping={
            "status": status.value,
            "responder": responder,
            "reason": reason or "",
            "responded_at": datetime.utcnow().isoformat()
        })
        
        # Extend TTL slightly so results can be queried/audited briefly after decision
        await self.redis.expire(key, 60) 
        
        return True
