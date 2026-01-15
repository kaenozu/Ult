#!/usr/bin/env python3
"""
Sentiment Tracker - Background script to collect sentiment data periodically
Can be added to daily automation workflow or run via cron/Task Scheduler
"""

import logging
import sys
from pathlib import Path

from src.sentiment import SentimentAnalyzer

# Configure logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_dir / "sentiment_tracker.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def main():
    """
    Collects current market sentiment and saves it to the database.
    """
    logger.info("Starting sentiment tracking...")

    analyzer = SentimentAnalyzer()

    try:
        # Get current market sentiment
        sentiment = analyzer.get_market_sentiment()

        # Save to database
        analyzer.save_sentiment_history(sentiment)

        logger.info(f"Sentiment captured: {sentiment['label']} (Score: {sentiment['score']:.3f})")
        logger.info(f"News analyzed: {sentiment['news_count']} articles")

        # Display top news (optional)
        if sentiment.get("top_news"):
            logger.info("Top Headlines:")
            for i, news in enumerate(sentiment["top_news"][:3], 1):
                logger.info(f"  {i}. {news['title'][:80]}...")

        return 0

    except Exception as e:
        logger.error(f"Error collecting sentiment: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
