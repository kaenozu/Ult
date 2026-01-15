"""
Strategy Orchestrator
Dynamically selects the active "Squad" of strategies based on the Market Regime.
"""

import logging
from typing import List, Dict, Any
from src.strategies.base import Strategy
from src.strategies.meta_registry import get_strategies_for_regime
from src.strategies.loader import load_custom_strategies

logger = logging.getLogger(__name__)


class StrategyOrchestrator:
    """
    Commander that decides which strategies to deploy into the battlefield.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.initialized_strategies: Dict[str, Strategy] = {}
        self.custom_strategies = []

        # Pre-load custom strategies (they are always active if valid)
        try:
            self.custom_strategies = load_custom_strategies()
            logger.info(f"Orchestrator loaded {len(self.custom_strategies)} custom strategies.")
        except Exception as e:
            logger.error(f"Failed to load custom strategies: {e}")

    def get_active_squad(self, regime: str) -> List[Strategy]:
        """
        Returns the list of instantiated strategy objects for the current regime.
        """
        logger.info(f"🎼 Orchestrating Strategy Squad for Regime: {regime}")

        target_classes = get_strategies_for_regime(regime)
        active_squad = []

        # 1. Instantiate or Retrieve Standard Strategies
        for cls in target_classes:
            strategy_name = cls.__name__

            # Singleton-like caching for instances
            if strategy_name not in self.initialized_strategies:
                try:
                    instance = cls()
                    self.initialized_strategies[strategy_name] = instance
                except Exception as e:
                    logger.error(f"Failed to initialize strategy {strategy_name}: {e}")
                    continue

            active_squad.append(self.initialized_strategies[strategy_name])

        # 2. Add Custom Strategies (Always Active for now, or could filter)
        # We treat custom strategies as 'Universal' for user convenience
        active_squad.extend(self.custom_strategies)

        # Log the lineup
        names = [s.name for s in active_squad]
        logger.info(f"🚀 Active Squad ({len(active_squad)}): {names}")

        return active_squad
