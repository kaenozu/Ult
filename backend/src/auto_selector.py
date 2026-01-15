import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Type

import numpy as np
import pandas as pd

from src.constants import NIKKEI_225_TICKERS
from src.data_loader import fetch_stock_data
from src.regime_detector import MarketRegime, RegimeDetector
from src.strategies import BollingerBandsStrategy, LightGBMStrategy, RSIStrategy, SMACrossoverStrategy, Strategy

logger = logging.getLogger("AutoSelector")


class AutoSelector:
    """
    Hyper-Autonomous Selection Engine.
    automatically selects the best tickers and strategies based on market regime.
    """

    def __init__(self):
        self.regime_detector = RegimeDetector()
        # Limit universe to top 30 liquid stocks for speed in prototype
        # In production, scan all 225.
        self.universe = NIKKEI_225_TICKERS[:30]
        self.lookback_days = 60  # Enough for SMA50 and backtest

    def select_daily_config(self) -> Dict[str, Any]:
        """
        Main entry point. Returns a configuration dict for the trading engine.
        """
        logger.info("🤖 AutoSelector: Starting daily optimization...")

        # 1. Detect Market Regime (using Index or averaged)
        # Using a representative ticker like 7203.T or 9984.T if Index data not available easily
        # ideally fetch ^N225
        # ideally fetch ^N225
        index_ticker = "^N225"
        data_dict = fetch_stock_data([index_ticker], period="6mo")
        index_df = data_dict.get(index_ticker)

        # Fallback to a liquid stock if Index fails (e.g., Toyota 7203.T)
        if index_df is None or index_df.empty:
            logger.warning("Failed to fetch Index data. Trying fallback (7203.T)...")
            fallback_ticker = "7203.T"
            data_dict = fetch_stock_data([fallback_ticker], period="6mo")
            index_df = data_dict.get(fallback_ticker)

        if index_df is None or index_df.empty:
            logger.warning("Failed to fetch Fallback data. Assuming Uncertain Regime.")
            regime = MarketRegime.UNCERTAIN
            regime_info = {"regime": regime, "regime_name": "Uncertain (No Data)"}
        else:
            regime_info = self.regime_detector.get_regime_signal(index_df)
            regime = regime_info["regime"]
        logger.info(f"📊 Market Regime: {regime_info['regime_name']}")

        # 2. Select Tickers based on Regime
        selected_tickers = self._select_tickers(regime)
        logger.info(f"✅ Selected Tickers ({len(selected_tickers)}): {selected_tickers}")

        # 3. Select Strategy based on Regime & Backtest
        best_strategy_cls, params = self._select_strategy(selected_tickers, regime)
        logger.info(f"🧠 Selected Strategy: {best_strategy_cls.__name__} with params {params}")

        return {
            "tickers": selected_tickers,
            "strategy_cls": best_strategy_cls,
            "strategy_params": params,
            "regime_info": regime_info,
        }

    def _select_tickers(self, regime: MarketRegime) -> List[str]:
        """
        Selects top candidates fitting the regime.
        """
        candidates = []

        for ticker in self.universe:
            try:
                data_dict = fetch_stock_data([ticker], period="3mo")
                df = data_dict.get(ticker)

                if df is None or df.empty:
                    continue

                # Calculate metrics
                close = df["Close"]
                ret = close.pct_change()
                volatility = ret.std() * np.sqrt(20)  # Monthly vol
                momentum = (close.iloc[-1] / close.iloc[-20]) - 1  # 1-month momentum

                candidates.append(
                    {"ticker": ticker, "momentum": momentum, "volatility": volatility, "price": close.iloc[-1]}
                )
            except Exception as e:
                logger.warning(f"Failed to fetch {ticker}: {e}")

        df_scan = pd.DataFrame(candidates)
        if df_scan.empty:
            return self.universe[:5]  # Fallback

        # Selection Logic
        if regime == MarketRegime.BULL:
            # Pick High Momentum
            selected = df_scan.nlargest(5, "momentum")["ticker"].tolist()
        elif regime == MarketRegime.BEAR:
            # Pick Low Volatility (Defensive)
            selected = df_scan.nsmallest(5, "volatility")["ticker"].tolist()
        elif regime == MarketRegime.VOLATILE:
            # Pick Very Low Volatility or Cash (Empty list?)
            # Let's pick safest 3
            selected = df_scan.nsmallest(3, "volatility")["ticker"].tolist()
        else:  # SIDEWAYS / UNCERTAIN
            # Pick Mean Reversion candidates? Or just balanced.
            # Let's pick middle momentum (stable)
            selected = df_scan["ticker"].sample(5).tolist()

        return selected

    def _select_strategy(self, tickers: List[str], regime: MarketRegime) -> tuple[Type[Strategy], Dict]:
        """
        Selects best strategy class and parameters.
        For simplicity, maps Regime to Strategy first, then confirms.
        """
        # Regime-based Heuristics
        if regime == MarketRegime.BULL:
            # Trend Following
            return SMACrossoverStrategy, {"short_window": 10, "long_window": 30}
        elif regime == MarketRegime.BEAR:
            # Short term or Mean Reversion on dips
            return RSIStrategy, {"period": 14, "buy_threshold": 25, "sell_threshold": 45}
        elif regime == MarketRegime.SIDEWAYS:
            # Bollinger Bands are king in ranges
            return BollingerBandsStrategy, {"window": 20, "num_std": 2}
        elif regime == MarketRegime.VOLATILE:
            # Conservative SMA or ML
            return SMACrossoverStrategy, {"short_window": 5, "long_window": 20}
        else:
            # Default
            return SMACrossoverStrategy, {}

        # Note: In a full version, we would run loop backtests here.
