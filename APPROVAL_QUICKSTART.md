# Approval Workflow System - Quick Start Guide

## What is this?

A professional **human-in-the-loop** approval system for semi-automatic trading with interactive Slack/Discord notifications.

## Quick Setup (5 minutes)

### Step 1: Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Name it "AGStock Approvals"
4. Click "Incoming Webhooks"
5. Toggle "Activate Incoming Webhooks"
6. Click "Add New Webhook to Workspace"
7. Select channel and copy the **Webhook URL**

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Step 2: Create Discord Webhook

1. Open Discord → Server Settings → Integrations
2. Click "Webhooks" → "New Webhook"
3. Name it "AGStock Approvals"
4. Copy the **Webhook URL**

```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

### Step 3: Configure Backend

Edit `backend/config.json`:

```json
{
  "notification": {
    "slack": {
      "enabled": true,
      "webhook_url": "YOUR_SLACK_WEBHOOK_URL"
    },
    "discord": {
      "enabled": true,
      "webhook_url": "YOUR_DISCORD_WEBHOOK_URL"
    }
  }
}
```

Or set environment variables:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR_URL"
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_URL"
```

### Step 4: Test It

```bash
# Start the backend
cd backend
python -m uvicorn src.api_server:get_app --host 0.0.0.0 --port 8000 --reload

# In another terminal, run the demo
python -m src.approval_workflow_demo
```

You should receive notifications in both Slack and Discord with Approve/Reject buttons!

## Usage Examples

### Python Code

```python
from src.approval_system import (
    ApprovalType,
    ApprovalContext,
    get_approval_system
)

system = get_approval_system()

# Create approval request
context = ApprovalContext(
    ticker="7203.T",
    action="BUY",
    quantity=100,
    price=2850.0,
    confidence=0.85,
    reason="Strong momentum signal",
)

# Define what happens after approval
def on_approval(request):
    print(f"Executing trade: {request.context.action} {request.context.quantity} {request.context.ticker}")
    # Your trade execution logic here

# Send approval request
request = system.create_and_notify_approval(
    approval_type=ApprovalType.TRADE_EXECUTION,
    title="BUY 100 7203.T",
    description="Momentum strategy signal",
    context=context,
    callback=on_approval,
    platform="both",
    expiry_minutes=30,
)

print(f"Request ID: {request.request_id}")
```

### HTTP API

```bash
# Request trade approval
curl -X POST http://localhost:8000/api/v1/approvals/trade \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "7203.T",
    "action": "BUY",
    "quantity": 100,
    "price": 2850.0,
    "confidence": 0.85,
    "reason": "Strong momentum signal"
  }'

# List pending approvals
curl http://localhost:8000/api/v1/approvals?status=pending

# Approve via API (for testing)
curl -X POST http://localhost:8000/api/v1/approvals/decision \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "YOUR_REQUEST_ID",
    "decision": "approve"
  }'
```

## What You'll See

### In Slack

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
Reason:      Strong momentum signal
━━━━━━━━━━━━━━━━━━━━

[✅ Approve] [❌ Reject]
```

### In Discord

```
🔔 **Approval Required: BUY 100 7203.T**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Request ID: `abc123xyz`
• Type: Trade Execution
• Ticker: 7203.T
• Action: BUY
• Quantity: 100
• Price: $2850.00
• Confidence: 85.0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[✅ Approve]  [❌ Reject]
```

## Approval Types

| Type                    | Use Case                     |
| ----------------------- | ---------------------------- |
| `TRADE_EXECUTION`       | Buy/sell orders              |
| `STRATEGY_CHANGE`       | Switch trading strategies    |
| `CONFIG_UPDATE`         | System configuration changes |
| `RISK_LIMIT_CHANGE`     | Adjust risk parameters       |
| `MANUAL_INTERVENTION`   | Human-initiated trades       |
| `CIRCUIT_BREAKER_RESET` | Restore trading after stop   |

## Key Features

✅ **Multi-Platform** - Send to Slack, Discord, or both  
✅ **Interactive Buttons** - One-click approve/reject  
✅ **Rich Context** - Display all trade details  
✅ **Auto-Expiry** - Time-limited approvals (configurable)  
✅ **Callback System** - Auto-execute on approval  
✅ **History Tracking** - Full audit trail  
✅ **Status Updates** - Messages update after decisions  
✅ **Web Callbacks** - Handle button clicks automatically

## Configuration Options

### Webhook URLs

- `slack.webhook_url` - Slack incoming webhook
- `discord.webhook_url` - Discord webhook

### Optional (for message updates)

- `slack.app_token` - Slack bot token (xoxb-...)
- `discord.bot_token` - Discord bot token

### System Settings

- `default_expiry_minutes` - Approval timeout (default: 30)
- `base_callback_url` - Server URL for webhooks (default: http://localhost:8000)

## Troubleshooting

### Webhook Not Working

```bash
# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test"}'

# Test Discord webhook
curl -X POST $DISCORD_WEBHOOK_URL -d '{"content":"Test"}'
```

### Buttons Not Appearing

- **Slack**: Check app has "incoming-webhook" permission
- **Discord**: Ensure webhook is in correct channel

### Approval Not Executing

1. Check callback is registered: `approval_system.approval_callbacks`
2. Verify request status changed to "approved"
3. Check logs: `tail -f backend/logs/approval_system.log`

## Next Steps

1. **Read Full Guide**: See `APPROVAL_WORKFLOW_GUIDE.md`
2. **Run Demo**: Execute `python -m src.approval_workflow_demo`
3. **Customize**: Adjust approval types, expiry times, etc.
4. **Integrate**: Add to your trading strategies
5. **Monitor**: Track approval rates and response times

## Support

- API Docs: http://localhost:8000/docs
- Logs: `backend/logs/approval_system.log`
- Issues: Check configuration and webhook URLs

## License

Part of AGStock Trading System - © 2026
