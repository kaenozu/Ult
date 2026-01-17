#!/usr/bin/env python3
"""
Test script for instant approval cards with WebSocket push
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from backend.src.approval_system import (
    ApprovalType,
    ApprovalContext,
    get_approval_system,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockWebSocketManager:
    """Mock WebSocket manager for testing"""

    def __init__(self):
        self.clients = []

    def broadcast_to_all(self, message_type: str, payload: dict):
        """Mock broadcast to all connected clients"""
        message = {
            "msg_id": f"test_{datetime.now().timestamp()}",
            "type": message_type,
            "payload": payload,
            "direction": "s2c",
            "timestamp": datetime.now().isoformat(),
        }

        logger.info(f"🔴 BROADCASTING WEBSOCKET MESSAGE:")
        logger.info(json.dumps(message, indent=2))
        logger.info("=" * 50)


async def test_approval_cards():
    """Test the complete approval card flow"""

    logger.info("🚀 Testing Instant Approval Cards with WebSocket Push")
    logger.info("=" * 60)

    # Initialize with mock WebSocket manager
    ws_manager = MockWebSocketManager()
    approval_system = get_approval_system(websocket_manager=ws_manager)

    # Test 1: Trade Execution Approval (Critical)
    logger.info("📈 Test 1: Trade Execution Approval (Critical)")
    trade_context = ApprovalContext(
        ticker="AAPL",
        action="BUY",
        quantity=1000,
        price=178.45,
        strategy="momentum",
        confidence=0.85,
        risk_level="medium",
        reason="Strong momentum signal detected",
    )

    trade_request = approval_system.create_and_notify_approval(
        approval_type=ApprovalType.TRADE_EXECUTION,
        title="Execute Trade: Buy AAPL",
        description="Purchase 1000 shares of Apple Inc. at $178.45",
        context=trade_context,
        platform="both",  # This will trigger WebSocket broadcast
        expiry_minutes=2,  # Short expiry for testing
    )

    logger.info(f"✅ Trade approval request created: {trade_request.request_id}")

    # Simulate approval response
    await asyncio.sleep(2)
    logger.info("👍 Simulating approval response...")
    approval_system.approve(
        request_id=trade_request.request_id, approved_by="trader_john", platform="web"
    )

    await asyncio.sleep(1)
    logger.info("")

    # Test 2: Risk Limit Change (High Priority)
    logger.info("⚠️ Test 2: Risk Limit Change (High Priority)")
    risk_context = ApprovalContext(
        risk_level="high",
        reason="Market volatility increasing",
        metadata={"old_limit": 50000, "new_limit": 75000, "portfolio": "tech_growth"},
    )

    risk_request = approval_system.create_and_notify_approval(
        approval_type=ApprovalType.RISK_LIMIT_CHANGE,
        title="Increase Daily Risk Limit",
        description="Raise daily risk limit from $50,000 to $75,000 for tech growth portfolio",
        context=risk_context,
        platform="both",
        expiry_minutes=5,
    )

    logger.info(f"✅ Risk limit approval request created: {risk_request.request_id}")

    # Simulate rejection response
    await asyncio.sleep(2)
    logger.info("👎 Simulating rejection response...")
    approval_system.reject(
        request_id=risk_request.request_id,
        rejected_by="risk_manager",
        reason="Current market conditions don't warrant increased risk",
        platform="web",
    )

    await asyncio.sleep(1)
    logger.info("")

    # Test 3: Emergency Action (Critical Priority)
    logger.info("🚨 Test 3: Emergency Action (Critical Priority)")
    emergency_context = ApprovalContext(
        reason="Circuit breaker triggered due to rapid market decline",
        metadata={
            "trigger": "daily_loss_limit",
            "current_loss": "-$125,000",
            "portfolio_value": "$2,500,000",
        },
    )

    emergency_request = approval_system.create_and_notify_approval(
        approval_type=ApprovalType.EMERGENCY_ACTION,
        title="Emergency Portfolio Rebalancing",
        description="Immediate rebalancing required due to circuit breaker trigger",
        context=emergency_context,
        platform="both",
        expiry_minutes=1,  # Very short expiry for emergency
    )

    logger.info(
        f"✅ Emergency approval request created: {emergency_request.request_id}"
    )

    # Let it expire
    await asyncio.sleep(3)
    logger.info("⏰ Letting emergency request expire...")

    # Test cleanup of expired requests
    approval_system.workflow.cleanup_expired()

    logger.info("")
    logger.info("📊 Summary:")
    logger.info(
        f"- Active requests: {len(approval_system.workflow.get_active_requests())}"
    )
    logger.info(f"- Approval history: {len(approval_system.workflow.get_history())}")

    logger.info("")
    logger.info("🎉 Instant Approval Cards WebSocket test completed!")
    logger.info("✨ Features demonstrated:")
    logger.info("  - Real-time WebSocket push notifications")
    logger.info("  - Ephemeral UI cards with auto-expiry")
    logger.info("  - Priority-based styling")
    logger.info("  - Instant approve/reject responses")
    logger.info("  - Context-rich approval information")


if __name__ == "__main__":
    asyncio.run(test_approval_cards())
