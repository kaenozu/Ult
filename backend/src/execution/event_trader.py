import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class EventTrader:
    """
    Executes immediate trades based on high-impact events (e.g., Surprise Earnings).
    """

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run

    def handle_high_impact_event(self, event_data: Dict[str, Any]):
        """
        Receives analysis results from FilingWatcher.
        If score is extremely high, executes a small immediate trade.
        """
        ticker = event_data.get("ticker")
        analysis = event_data.get("analysis", {})
        score = analysis.get("score", 0)
        recommendation = analysis.get("recommendation", "HOLD")

        # Threshold for purely autonomous event trading
        if score >= 90 and recommendation == "BUY":
            logger.info(f"🔥 SURPRISE EARNINGS DETECTED for {ticker} (Score: {score}). Executing immediate trade!")

            if self.dry_run:
                logger.info(f"[DRY RUN] Would BUY {ticker} due to high-impact earnings surprise.")
                return {"status": "success", "action": "BUY", "dry_run": True}
            else:
                # Here we would call the actual broker API or execution manager
                logger.info(f"Executing BUY order for {ticker}...")
                return {"status": "success", "action": "BUY", "dry_run": False}

        return {"status": "no_action", "reason": "Score below threshold or not a BUY."}
