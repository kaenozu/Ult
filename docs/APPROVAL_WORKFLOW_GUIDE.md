# Approval Workflow System - Professional Human Interface

## Overview

The Approval Workflow System provides a professional human-in-the-loop interface for semi-automatic trading operations. It integrates seamlessly with **Slack** and **Discord** webhooks, offering interactive buttons for approval/rejection decisions with rich contextual information.

## Features

### Core Capabilities

- **Multi-Platform Support**: Send approval notifications to Slack, Discord, or both simultaneously
- **Interactive Buttons**: One-click approve/reject actions with confirmation dialogs
- **Rich Context**: Display ticker, action, quantity, price, confidence, risk level, and custom reasons
- **Automatic Expiry**: Configurable time limits for approval requests (default: 30 minutes)
- **Callback System**: Execute custom logic automatically upon approval
- **History Tracking**: Full audit trail of all approval decisions
- **Status Updates**: Real-time message updates reflecting approval status
- **Message Reminders**: Persistent notification until action taken

### Approval Types

- `TRADE_EXECUTION`: Buy/sell orders requiring manual review
- `STRATEGY_CHANGE`: Switching between trading strategies
- `CONFIG_UPDATE`: Critical system configuration changes
- `RISK_LIMIT_CHANGE`: Adjusting risk management parameters
- `MANUAL_INTERVENTION`: Human-initiated trading requests
- `CIRCUIT_BREAKER_RESET`: Restoring trading after circuit breaker activation

## Architecture

```
┌─────────────────┐
│  Trading System│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  ApprovalWorkflowManager    │
│  - Request Creation        │
│  - Status Management       │
│  - Callback Execution     │
└────────┬──────────────────┘
         │
         ├───────────────┬───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Slack     │  │  Discord    │  │   Web UI    │
│  Notifier   │  │  Notifier   │  │  (Optional) │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
               ┌─────────────────┐
               │  Webhook API   │
               │  /webhooks/... │
               └─────────────────┘
```

## Setup Instructions

### 1. Slack Webhook Configuration

#### Create Incoming Webhook

1. Go to https://api.slack.com/apps
2. Create a new app or select existing one
3. Enable "Incoming Webhooks"
4. Create a new webhook
5. Copy the webhook URL: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

#### (Optional) Enable Message Updates

To update messages after approval/rejection:

1. In your Slack app settings, go to "OAuth & Permissions"
2. Add scope: `chat:write`
3. Install the app to your workspace
4. Copy the **Bot User OAuth Token**: `xoxb-...`

### 2. Discord Webhook Configuration

#### Create Webhook

1. Go to your Discord server settings → Integrations → Webhooks
2. Create new webhook
3. Copy the webhook URL: `https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz`

#### (Optional) Enable Message Updates

To update messages after approval/rejection:

1. Create a Discord bot at https://discord.com/developers/applications
2. Enable "Message Content Intent" and "Server Messages Intent"
3. Add bot to server with `Manage Messages` permission
4. Copy the **Bot Token**: `MTIzNDU2Nzg5MA.abcdefghijklmnopqrstuvwxyz`

### 3. Backend Configuration

Add to `backend/config.json` or environment variables:

```json
{
  "notification": {
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/YOUR_WEBHOOK",
      "app_token": "xoxb-YOUR_TOKEN" // Optional, for message updates
    },
    "discord": {
      "enabled": true,
      "webhook_url": "https://discord.com/api/webhooks/YOUR_WEBHOOK",
      "bot_token": "YOUR_BOT_TOKEN" // Optional, for message updates
    }
  }
}
```

Environment variables (alternative):

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK
SLACK_APP_TOKEN=xoxb-YOUR_TOKEN
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN
```

## API Usage

### Create Trade Approval Request

**Endpoint:** `POST /api/v1/approvals/trade`

**Request:**

```json
{
  "ticker": "7203.T",
  "action": "BUY",
  "quantity": 100,
  "price": 2850.0,
  "strategy": "momentum",
  "confidence": 0.85,
  "reason": "Strong momentum signal detected with 85% confidence"
}
```

**Response:**

```json
{
  "request_id": "abc123xyz",
  "status": "pending",
  "message": "Trade approval request created and notification sent. Waiting for approval.",
  "created_at": "2026-01-17T12:00:00Z"
}
```

### List Active Approvals

**Endpoint:** `GET /api/v1/approvals?status=pending&limit=50`

**Response:**

```json
{
  "total": 2,
  "approvals": [
    {
      "request_id": "abc123xyz",
      "type": "trade_execution",
      "title": "BUY 100 7203.T",
      "status": "pending",
      "created_at": "2026-01-17T12:00:00Z",
      "expires_at": "2026-01-17T12:30:00Z",
      "context": {
        "ticker": "7203.T",
        "action": "BUY",
        "quantity": 100,
        "price": 2850.0,
        "confidence": 0.85
      }
    }
  ]
}
```

### Make Approval Decision (Web UI)

**Endpoint:** `POST /api/v1/approvals/decision`

**Request:**

```json
{
  "request_id": "abc123xyz",
  "decision": "approve",
  "reason": "Approved based on strong momentum indicators"
}
```

### Cancel Approval

**Endpoint:** `DELETE /api/v1/approvals/{request_id}`

## Slack Notification Example

### Initial Notification

```
*Approval Required: BUY 100 7203.T*

━━━━━━━━━━━━━━━━━━━━
Request ID:  abc123xyz
Type:        Trade Execution
Expires:     2026-01-17 12:30:00
Ticker:      7203.T
Action:      BUY
Quantity:    100
Price:       $2850.00
Confidence:  85.0%
Risk Level:  Medium
Reason:      Strong momentum signal detected with 85% confidence
━━━━━━━━━━━━━━━━━━━━

Description: Trade execution request: BUY 100 shares of 7203.T @ $2850.00
Strategy: momentum
Reason: Strong momentum signal detected with 85% confidence

[✅ Approve] [❌ Reject]
```

### After Approval (Updated Message)

```
✅ BUY 100 7203.T

━━━━━━━━━━━━━━━━━━━━
Status:      Approved
Request ID:  abc123xyz
━━━━━━━━━━━━━━━━━━━━

Processed by: john.smith
```

## Discord Notification Example

### Initial Notification (Embed + Buttons)

```yaml
🔔 **Approval Required: BUY 100 7203.T**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TRADE EXECUTION REQUEST

• **Request ID**: `abc123xyz`
• **Type**: Trade Execution
• **Expires**: 2026-01-17 12:30:00

📊 TRADE DETAILS
• **Ticker**: 7203.T
• **Action**: BUY
• **Quantity**: 100
• **Price**: $2850.00
• **Confidence**: 85.0%
• **Risk Level**: Medium

💭 **Reason**: Strong momentum signal detected with 85% confidence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[✅ Approve]  [❌ Reject]
```

### After Approval

```yaml
✅ **BUY 100 7203.T - APPROVED**

━━━━━━━━━━━━━━━━━━━━
Status: Approved
Request ID: `abc123xyz`

Processed by: discord_user
━━━━━━━━━━━━━━━━━━━━
```

## Webhook Callbacks

### Slack Callback URLs

- **Approve**: `POST /api/v1/webhooks/slack/approve?request_id=abc123xyz`
- **Reject**: `POST /api/v1/webhooks/slack/reject?request_id=abc123xyz`

### Discord Callback URLs

- **Approve**: `GET /api/v1/webhooks/discord/approve?request_id=abc123xyz`
- **Reject**: `GET /api/v1/webhooks/discord/reject?request_id=abc123xyz`

**Note**: Update the `base_callback_url` in `IntegratedApprovalSystem.__init__()` to your public server URL (e.g., `https://your-domain.com`).

## Programmatic Usage

### Python Example

```python
from src.approval_system import (
    ApprovalSystem,
    ApprovalType,
    ApprovalContext,
    get_approval_system
)

# Get system instance
system = get_approval_system()

# Create trade approval request
context = ApprovalContext(
    ticker="7203.T",
    action="BUY",
    quantity=100,
    price=2850.0,
    strategy="momentum",
    confidence=0.85,
    reason="Strong momentum signal",
)

# Define callback (executed on approval)
def execute_trade(request):
    print(f"Executing trade: {request.context.action} {request.context.quantity} {request.context.ticker}")
    # Your trade execution logic here

# Create and send approval
request = system.create_and_notify_approval(
    approval_type=ApprovalType.TRADE_EXECUTION,
    title="BUY 100 7203.T",
    description="Momentum strategy signal",
    context=context,
    callback=execute_trade,
    platform="both",  # Send to both Slack and Discord
    expiry_minutes=30,
)

print(f"Approval request created: {request.request_id}")
```

### Semi-Auto Trading Integration

```python
# In your trading strategy
from src.api.routers.approvals import TradeApprovalRequest

async def request_trade_with_approval(ticker, action, quantity):
    """Request trade approval before execution"""

    # Get current price
    price = await get_current_price(ticker)

    # Send approval request
    response = await client.post(
        "/api/v1/approvals/trade",
        json={
            "ticker": ticker,
            "action": action,
            "quantity": quantity,
            "price": price,
            "strategy": current_strategy,
            "confidence": 0.75,
        }
    )

    return response.json()["request_id"]

# Wait for approval (poll or use webhook)
request_id = await request_trade_with_approval("7203.T", "BUY", 100)

# Trade will execute automatically after approval via callback
```

## Best Practices

### Security

1. **Validate Webhook Sources**: Verify requests come from Slack/Discord
2. **Rate Limit**: Protect against spam approval requests
3. **Audit Trail**: Log all approval decisions with timestamps
4. **Role-Based Access**: Restrict who can approve specific types

### User Experience

1. **Clear Context**: Always include reason, risk level, and strategy info
2. **Reasonable Timeouts**: Set expiry based on urgency (5-60 minutes)
3. **Follow-up Notifications**: Notify when trade executes after approval
4. **Cancel Stale Requests**: Allow cancellation of outdated approvals

### Integration

1. **Fallback Mechanisms**: If webhooks fail, send email/SMS
2. **Retry Logic**: Handle transient failures in webhook delivery
3. **Status Sync**: Keep web UI in sync with Slack/Discord decisions
4. **Conflict Resolution**: Handle concurrent approval/rejection attempts

## Monitoring & Maintenance

### Health Checks

```bash
# Test webhook connectivity
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test message"}'
curl -X POST $DISCORD_WEBHOOK_URL -d '{"content":"Test message"}'
```

### Cleanup Tasks

```bash
# Run periodically to clear expired approvals
curl -X POST http://localhost:8000/api/v1/approvals/cleanup
```

### Metrics to Track

- Average approval time
- Approval rate (approved vs rejected)
- Platform usage (Slack vs Discord)
- Expiration rate
- Trade execution delay post-approval

## Troubleshooting

### Webhook Not Working

1. Check webhook URL in configuration
2. Verify URL is accessible from server
3. Check firewall rules
4. Review error logs: `tail -f backend/logs/approval_system.log`

### Buttons Not Appearing

1. **Slack**: Ensure app has `incoming-webhook` permission
2. **Discord**: Ensure webhook is created in correct channel
3. Check platform-specific payload format

### Message Updates Failing

1. Verify bot/app token is configured
2. Check OAuth scopes: `chat:write` (Slack), `Manage Messages` (Discord)
3. Ensure message_id/channel_id are captured correctly

### Approval Not Executing

1. Check callback function is registered correctly
2. Verify approval status changed to "approved"
3. Review callback execution logs
4. Ensure trade execution logic has proper error handling

## Advanced Features

### Custom Approval Flows

```python
# Multi-stage approval (requires 2 people)
class MultiStageApproval:
    def __init__(self, required_approvers=2):
        self.required = required_approvers
        self.approvers = []

    def add_approver(self, user):
        if user not in self.approvers:
            self.approvers.append(user)
            return len(self.approvers) >= self.required
        return False
```

### Conditional Notifications

```python
# Only notify for high-risk trades
if risk_level in ["HIGH", "CRITICAL"]:
    system.create_and_notify_approval(..., platform="both")
else:
    # Auto-execute low-risk trades
    execute_trade(...)
```

### Approval Queues

```python
# Batch multiple approvals into single notification
from collections import defaultdict

queue = defaultdict(list)

def batch_approvals(ticker, requests):
    # Send single approval for multiple trades of same ticker
    context = ApprovalContext(
        ticker=ticker,
        metadata={"trades": requests}
    )
    # ...
```

## Support

For issues or questions:

- Check logs: `backend/logs/approval_system.log`
- API docs: `http://localhost:8000/docs`
- Database: Inspect `approval_requests` table

## License

Part of AGStock Trading System - © 2026
