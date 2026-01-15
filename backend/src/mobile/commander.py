"""
Mobile Commander
Allows system control via mobile interface.
"""
import logging

logger = logging.getLogger(__name__)

class MobileCommander:
    def __init__(self, config=None):
        self.config = config or {}

    def send_command(self, command: str, params: dict = None):
        """コマンドを送信"""
        logger.info(f"Mobile command received: {command}")
        return True

    def process_command(self, user: str, command: str):
        """コマンドを処理"""
        logger.info(f"Mobile command processed for {user}: {command}")
        if "/status" in command:
            return "SYSTEM ONLINE"
        elif "/stop" in command:
            return "EMERGENCY STOP"
        elif "/buy" in command or "/sell" in command:
            ticker = command.split()[-1] if len(command.split()) > 1 else ""
            return f"Order Received: {ticker}"
        return f"Executed: {command}"
