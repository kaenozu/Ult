import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock
from src.services.approval_service import ApprovalService
from src.api.websocket_types import ApprovalType, ApprovalStatus

# Mock Redis
class MockRedis:
    def __init__(self):
        self.data = {}
        
    async def hset(self, key, mapping):
        self.data[key] = mapping
        
    async def hget(self, key, field):
        if key not in self.data:
            return None
        return self.data[key].get(field)
        
    async def exists(self, key):
        return key in self.data
        
    async def expire(self, key, seconds):
        pass

@pytest.fixture
def mock_ws_manager():
    manager = AsyncMock()
    manager.broadcast_message = AsyncMock()
    return manager

@pytest.fixture
def approval_service(mock_ws_manager):
    service = ApprovalService("redis://localhost", mock_ws_manager)
    # Patch redis with mock
    service.redis = MockRedis() 
    return service

@pytest.mark.asyncio
async def test_request_approval(approval_service, mock_ws_manager):
    req_id = await approval_service.request_approval(
        approval_type=ApprovalType.TRADE_EXECUTION,
        title="Test Trade",
        description="Testing",
        context={"ticker": "AAPL"},
        priority="high"
    )
    
    assert req_id is not None
    assert f"approval:{req_id}" in approval_service.redis.data
    
    # Check broadcast
    mock_ws_manager.broadcast_message.assert_called_once()
    call_args = mock_ws_manager.broadcast_message.call_args[0][0]
    assert call_args.type == "approval_request"
    assert call_args.payload.request_id == req_id

@pytest.mark.asyncio
async def test_check_approval_status(approval_service):
    # Test non-existent (Modified: should be EXPIRED if missing, but initially PENDING if set)
    # The MockRedis returns None if key missing
    status = await approval_service.check_approval_status("fake-id")
    assert status == ApprovalStatus.EXPIRED

    # Test Pending
    req_id = await approval_service.request_approval(ApprovalType.TRADE_EXECUTION, "T", "D", {})
    status = await approval_service.check_approval_status(req_id)
    assert status == ApprovalStatus.PENDING

@pytest.mark.asyncio
async def test_respond_to_request(approval_service):
    req_id = await approval_service.request_approval(ApprovalType.TRADE_EXECUTION, "T", "D", {})
    
    success = await approval_service.respond_to_request(
        req_id, 
        ApprovalStatus.APPROVED, 
        "User1"
    )
    assert success is True
    
    status = await approval_service.check_approval_status(req_id)
    assert status == ApprovalStatus.APPROVED
