import yfinance as yf
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class MacroLoader:
    """
    Fetches major macro indicators to provide global market context.
    Indicators: VIX, 10Y Treasury Yield, USD/JPY, SOX Index, Oil Prices.
    """

    SYMBOLS = {
        "vix": "^VIX",
        "yield_10y": "^TNX",
        "usdjpy": "USDJPY=X",
        "sox": "^SOX",
        "oil": "CL=F",
        "n225": "^N225",
        "sp500": "^GSPC",
    }

    def fetch_macro_data(self) -> Dict[str, Any]:
        """Fetches the latest values and 1-day changes for macro indicators."""
        logger.info("Fetching macro data from yfinance...")
        data = {}

        try:
            # Download recent history for all symbols to calculate change
            all_symbols = list(self.SYMBOLS.values())
            df = yf.download(all_symbols, period="5d", interval="1d", progress=False)["Close"]

            for key, symbol in self.SYMBOLS.items():
                if symbol in df.columns:
                    series = df[symbol].dropna()
                    if not series.empty:
                        current_val = series.iloc[-1]
                        prev_val = series.iloc[-2] if len(series) > 1 else current_val
                        change_pct = (current_val - prev_val) / prev_val * 100 if prev_val != 0 else 0

                        data[key] = {
                            "value": float(current_val),
                            "change_pct": float(change_pct),
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        data[key] = {
                            "value": 0.0,
                            "change_pct": 0.0,
                            "error": "No data",
                        }
                else:
                    data[key] = {
                        "value": 0.0,
                        "change_pct": 0.0,
                        "error": f"Symbol {symbol} not in columns",
                    }

            # Add synthesized Sentiment Score (0-100, higher is more 'Stable/Bullish')
            data["macro_score"] = self._calculate_macro_score(data)

            return data

        except Exception as e:
            logger.error(f"Failed to fetch macro data: {e}")
            return {"error": str(e)}

    def _calculate_macro_score(self, data: Dict[str, Any]) -> float:
        """
        Calculates a consolidated macro stability score (0-100).
        High score = Stable/Optimistic market.
        Low score = High volatility/Caution.
        """
        score = 70.0  # Base neutral-optimistic

        # 1. VIX Impact (Lower is better)
        vix = data.get("vix", {}).get("value", 20.0)
        if vix > 30:
            score -= 30
        elif vix > 25:
            score -= 15
        elif vix < 15:
            score += 10

        # 2. SOX Impact (Semi-conductor index as growth proxy)
        sox_change = data.get("sox", {}).get("change_pct", 0.0)
        score += max(-15, min(15, sox_change * 3))

        # 3. Yield Impact (Sharp moves in 10Y are usually bad for stocks)
        yield_change = abs(data.get("yield_10y", {}).get("change_pct", 0.0))
        if yield_change > 3:
            score -= 10

        return max(0, min(100, score))
