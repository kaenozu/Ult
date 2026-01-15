import logging
import yfinance as yf
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


class USMarketMonitor:
    """
    Monitors US Market (Nightwatch) and generates context for Japanese market next morning.
    """

    SYMBOLS = {
        "S&P500": "^GSPC",
        "NASDAQ": "^IXIC",
        "SOX": "^SOX",
        "USD/JPY": "USDJPY=X",
        "NVDA": "NVDA",
        "TSLA": "TSLA",
    }

    def fetch_nightwatch_data(self) -> Dict[str, Any]:
        """Fetches latest US market closing or live data."""
        logger.info("Nightwatch: Fetching US market data...")
        report = {}

        try:
            # Fetch last 2 days to compare
            tickers = list(self.SYMBOLS.values())
            data = yf.download(tickers, period="2d", interval="1d", progress=False)["Close"]

            for key, symbol in self.SYMBOLS.items():
                if symbol in data.columns:
                    series = data[symbol].dropna()
                    if len(series) >= 2:
                        current = series.iloc[-1]
                        prev = series.iloc[-2]
                        change_pct = (current - prev) / prev * 100
                        report[key] = {
                            "value": float(current),
                            "change_pct": float(change_pct),
                        }

            report["timestamp"] = datetime.now().isoformat()
            report["market_sentiment"] = self._calculate_overnight_sentiment(report)
            return report

        except Exception as e:
            logger.error(f"Nightwatch failed to fetch data: {e}")
            return {"error": str(e)}

    def _calculate_overnight_sentiment(self, report: Dict[str, Any]) -> str:
        """Determines if the US market was Bullish, Bearish, or Neutral."""
        sp500_change = report.get("S&P500", {}).get("change_pct", 0)
        nasdaq_change = report.get("NASDAQ", {}).get("change_pct", 0)

        avg_change = (sp500_change + nasdaq_change) / 2

        if avg_change > 1.0:
            return "STRONG_BULLISH"
        if avg_change > 0.3:
            return "BULLISH"
        if avg_change < -1.0:
            return "STRONG_BEARISH"
        if avg_change < -0.3:
            return "BEARISH"
        return "NEUTRAL"
