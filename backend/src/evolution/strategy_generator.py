import logging
import sqlite3
import os
from typing import List, Dict, Any
import google.generativeai as genai
from datetime import datetime

logger = logging.getLogger(__name__)


class StrategyGenerator:
    """
    Analyzes past failures and evolves new strategy code using LLM.
    """

    def __init__(self, api_key: str = None):
        if api_key:
            genai.configure(api_key=api_key)
        self.output_dir = "src/strategies/evolved"
        os.makedirs(self.output_dir, exist_ok=True)

    def evolve_strategies(self, db_path: str = "committee_feedback.db"):
        """
        1. Extract failures from DB
        2. Ask Gemini to find patterns and write a NEW Python strategy
        3. Save the strategy to disk
        """
        failures = self._get_recent_failures(db_path)
        if not failures:
            logger.info("No failures to learn from. Evolution skipping.")
            return

        lessons_summary = self._summarize_failures(failures)
        new_strategy_code = self._generate_strategy_code(lessons_summary)

        if new_strategy_code:
            filename = f"evolved_strategy_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"
            file_path = os.path.join(self.output_dir, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_strategy_code)
            logger.info(f"New evolved strategy saved: {file_path}")

    def _get_recent_failures(self, db_path: str) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM decision_feedback WHERE outcome = 'FAILURE' ORDER BY timestamp DESC LIMIT 10"
                )
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to fetch failures for evolution: {e}")
            return []

    def _summarize_failures(self, failures: List[Dict[str, Any]]) -> str:
        summary = "【過去の失敗事例の概要】\n"
        for f in failures:
            summary += (
                f"- {f['ticker']}: 判断={f['decision']}, 理由={f['rationale']}, 収益率={f['return_1w'] * 100:.1f}%\n"
            )
        return summary

    def _generate_strategy_code(self, context: str) -> str:
        """Calls Gemini to write refined Python code."""


# try:
#             model = genai.GenerativeModel("gemini-1.5-pro")
