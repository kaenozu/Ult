import os
import logging
import requests
import json
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

class Notifier:
    """
    The Voice of the Sovereign.
    Sends notifications to Console (always) and Discord (if configured).
    """
    def __init__(self):
        self.discord_webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
        # You can add LINE_NOTIFY_TOKEN etc here later

    def send_message(self, title: str, body: str, color: int = 0x00ff00):
        """
        Send a formatted message.
        
        Args:
            title: Message title
            body: Message body (supports markdown for Discord)
            color: Hex color code (e.g., 0x00ff00 for Green, 0xff0000 for Red)
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. Console Output
        print(f"\n[{timestamp}] 📢 {title}\n{'-'*40}\n{body}\n{'-'*40}\n")
        logger.info(f"Notification sent: {title}")

        # 2. Discord Webhook
        if self.discord_webhook_url:
            self._send_discord(title, body, color)

    def _send_discord(self, title: str, description: str, color: int):
        try:
            payload = {
                "embeds": [
                    {
                        "title": title,
                        "description": description,
                        "color": color,
                        "footer": {
                            "text": "Ult Trading System • Sovereign Agent"
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                ]
            }
            response = requests.post(
                self.discord_webhook_url, 
                data=json.dumps(payload),
                headers={"Content-Type": "application/json"}
            )
            if response.status_code != 204:
                logger.warning(f"Failed to send Discord notification: {response.text}")
        except Exception as e:
            logger.error(f"Discord notification error: {e}")

    def send_startup(self):
        self.send_message("System Startup", "Sovereign Agent is online and watching the markets.", 0x3498db)

    def send_shutdown(self):
        self.send_message("System Shutdown", "Sovereign Agent is going to sleep.", 0x95a5a6)

    def send_alert(self, ticker: str, signal: str, score: float, reasons: str):
        color = 0x2ecc71 if signal == "BUY" else 0xe74c3c # Green or Red
        body = (
            f"**Ticker:** {ticker}\n"
            f"**Signal:** {signal}\n"
            f"**Score:** {score:.3f}\n"
            f"**Reason:** {reasons}"
        )
        self.send_message(f"🚨 Trade Alert: {ticker}", body, color)

    def send_summary(self, summary_text: str):
        self.send_message("Daily Market Summary", summary_text, 0xf1c40f) # Yellow
