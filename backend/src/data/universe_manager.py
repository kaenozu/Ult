import logging
import pandas as pd
import yfinance as yf
from typing import List
import google.generativeai as genai
import os
from src.constants import NIKKEI_225_TICKERS, SP500_TICKERS

logger = logging.getLogger(__name__)


class UniverseManager:
    """
    Manages the 'universe' of tradable tickers across global markets.
    Dynamically discovers and filters high-potential candidates.
    """

    def __init__(self):
        # Base universes (can be expanded to crawl Wikipedia etc.)
        self.jp_base = NIKKEI_225_TICKERS  # Nikkei 225
        self.us_base = SP500_TICKERS  # S&P 500

        # Expanded lists for "Discovery" mode (TOPIX 100 / S&P 100)
        self.jp_universe = self.jp_base + [
            "7201.T",
            "6752.T",
            "8058.T",
            "8001.T",
            "9101.T",
            "9104.T",
        ]
        self.us_universe = self.us_base + [
            "GOOGL",
            "META",
            "TSLA",
            "NVDA",
            "NFLX",
            "AMD",
            "INTC",
        ]

    def get_top_candidates(self, market: str = "ALL", limit: int = 20) -> List[str]:
        """
        Runs a light-weight scan (Volume, Trend) to find candidates.
        Then uses Gemini to pick the most promising ones.
        """
        candidates = []
        if market in ["ALL", "JP"]:
            candidates.extend(self._pre_filter(self.jp_universe))
        if market in ["ALL", "US"]:
            candidates.extend(self._pre_filter(self.us_universe))

        if not candidates:
            return self.jp_base[:5] + self.us_base[:5]

        # Use Gemini for smart narrowing (Singularity Step)
        try:
            return self._ai_narrow_down(candidates, limit)
        except Exception as e:
            logger.error(f"AI narrowing failed: {e}. Returning filtered results.")
            return candidates[:limit]

    def _pre_filter(self, ticker_list: List[str]) -> List[str]:
        """Filters by simple technical strength (RSI/Trend) using Batch Download."""
        filtered = []
        if not ticker_list:
            return []

        # Optimization: Process in chunks of 50 to avoid URL length issues
        chunk_size = 50
        for i in range(0, len(ticker_list), chunk_size):
            chunk = ticker_list[i : i + chunk_size]
            try:
                # Batch download: significantly faster
                data = yf.download(chunk, period="1mo", progress=False, threads=True)["Close"]

                # Check trend for each ticker in the chunk
                # data columns are tickers. If single ticker, it's Series, handle carefully.
                if isinstance(data, pd.Series):
                    data = data.to_frame(name=chunk[0])

                for ticker in chunk:
                    if ticker not in data.columns:
                        continue

                    series = data[ticker].dropna()
                    if len(series) < 10:
                        continue

                    ma20 = series.rolling(window=20).mean().iloc[-1]
                    current = series.iloc[-1]

                    if current > ma20:
                        filtered.append(ticker)
            except Exception as e:
                logger.warning(f"Batch scan error for chunk starting {chunk[0]}: {e}")
                continue

            if len(filtered) >= 40:
                break

        return filtered

    def _ai_narrow_down(self, candidates: List[str], limit: int) -> List[str]:
        """Uses Gemini to pick the best tickers from candidates."""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return candidates[:limit]

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
        Analyze this list of stock tickers: {candidates}.
        Based on current global market trends (2025 technology boom, AI, energy shift, inflation),
        pick the TOP {limit} stocks that have the highest probability of growth in the next 1-2 weeks.
        Only return a comma-separated list of tickers. No explanation.
        Example: 7203.T, NVDA, AAPL
        """

        response = model.generate_content(prompt)
        ai_tickers = [t.strip() for t in response.text.split(",") if t.strip()]

        # Validate ai_tickers are in our original list or valid
        valid_tickers = [t for t in ai_tickers if t in candidates or "." in t or len(t) <= 5]
        return valid_tickers[:limit]
