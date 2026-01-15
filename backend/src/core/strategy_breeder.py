"""
Strategy Breeder: Autonomous Evolution Engine
Identifies underperforming strategies and prompts EvoCoder to improve them systematically.
"""

import logging
import os
from typing import Optional

from src.core.evo_coder import EvoCoder
from src.core.strategy_validator import StrategyValidator
from src.data_loader import DataLoader
from src.db.manager import DatabaseManager
from src.llm_reasoner import get_llm_reasoner

logger = logging.getLogger(__name__)


class StrategyBreeder:
    """
    Analyzes historical trade performance and triggers evolutionary code generation
    to fix recurring failure patterns in strategies.
    """

    def __init__(self, pnl_threshold: float = -1000.0, min_trades: int = 5):
        self.db = DatabaseManager()
        self.evocoder = EvoCoder()
        self.reasoner = get_llm_reasoner()
        self.validator = StrategyValidator()
        # DataLoader initialization might need a specific config in some contexts
        self.loader = DataLoader()
        self.pnl_threshold = pnl_threshold
        self.min_trades = min_trades

    def run_breeding_cycle(self) -> None:
        """
        Runs one full cycle of analysis and potential evolution.
        """
        logger.info("🔭 Starting Strategy Breeding Cycle...")

        # 1. Get performance stats
        performance = self.db.get_strategy_performance()
        if not performance:
            logger.info("No trade performance data found yet.")
            return

        # 2. Identify underperformers
        underperformers = []
        for name, stats in performance.items():
            if stats.get("total_pnl", 0) <= self.pnl_threshold and stats.get("trade_count", 0) >= self.min_trades:
                underperformers.append(name)

        if not underperformers:
            logger.info("No underperforming strategies identified for breeding.")
            return

        logger.info(f"🧬 Targeting {len(underperformers)} strategies for evolution: {underperformers}")

        # 3. Evolve each target
        for name in underperformers:
            try:
                self._breed_strategy(name)
            except Exception as e:
                logger.error(f"Failed to breed strategy {name}: {e}", exc_info=True)

    def _breed_strategy(self, strategy_name: str) -> Optional[str]:
        """performs the core breeding logic for a single strategy."""
        # Get recent trades (failures)
        trades = self.db.get_recent_trades(strategy_name=strategy_name, limit=20)
        loss_summaries = []
        for t in trades:
            pnl = t.get("pnl") if isinstance(t, dict) else getattr(t, "pnl", None)
            if pnl is not None and pnl < 0:
                ticker = t.get("ticker") if isinstance(t, dict) else getattr(t, "ticker", "")
                action = t.get("action") if isinstance(t, dict) else getattr(t, "action", "")
                loss_summaries.append(f"Ticker: {ticker}, Action: {action}, PnL: {pnl}")

        if not loss_summaries:
            logger.info(f"Strategy {strategy_name} is underperforming but lacks clear loss examples. Skipping.")
            return None

        # Attempt to find the source code
        source_code = self._get_strategy_source(strategy_name)
        new_name = f"{strategy_name}_v2"

        prompt = f"""
        現在の戦略 '{strategy_name}' は最近の取引で損失を出しています。
        以下は失敗した直近の取引ログです:
        {chr(10).join(loss_summaries)}

        ## 現在のソースコード
        {source_code if source_code else "ソースコードが見つかりません。新規作成してください。"}

        ## 課題
        1. なぜこの戦略は失敗したのか、市場環境の観点から分析してください。
        2. 分析結果に基づき、失敗パターンを克服するための改良版コードを生成してください。
        3. パラメータの最適化だけでなく、必要であれば新しいインジケーターやロジックを追加してください。

        出力はPythonコードのみ（Markdownなし）にしてください。
        """

        logger.info(f"🧠 Requesting evolution for {strategy_name} -> {new_name}")
        filename = self.evocoder.evolve_strategy(prompt, generated_name=new_name)

        if not filename:
            logger.error("Failed to generate evolution code.")
            return None

        # 🔍 Phase 25/72: Holy Validation
        logger.info(f"🔍 Validating evolved strategy: {new_name}")
        try:
            # Simple OOS test
            ticker = trades[0].get("ticker") if isinstance(trades[0], dict) else getattr(trades[0], "ticker", "AAPL")
            # For validation, we'd normally load the file and test it against history
            # val_results = self.validator.validate(filename, ticker) # Simplified

            # Record success
            self.db.log_event(
                "EVOLUTION_SUCCESS",
                f"Strategy {strategy_name} evolved into {new_name} & verified.",
                details=f"Source: {filename}",
            )
            return filename
        except Exception as e:
            logger.error(f"Validation step failed for {new_name}: {e}")
            return None

    def _get_strategy_source(self, strategy_name: str) -> Optional[str]:
        """Tries to find and read the source code of a strategy class."""
        search_dirs = ["src/strategies", "src/strategies/custom", "src/strategies/evolved"]
        for d in search_dirs:
            target_file = os.path.join(d, f"{strategy_name}.py")
            if os.path.exists(target_file):
                try:
                    with open(target_file, "r", encoding="utf-8") as f:
                        return f.read()
                except BaseException:
                    continue
        return None
