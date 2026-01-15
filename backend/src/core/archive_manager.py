"""
The Eternal Archive
Preserves all decision-making context, predictions, and evolution for posterity.
Creates an immutable record of the AI's learning journey.
"""

import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class ArchiveManager:
    """
    Manages the persistence of high-fidelity decision context and knowledge patterns.
    """

    def __init__(self, archive_dir: str = "data/eternal_archive"):
        self.archive_dir = archive_dir
        self.decisions_dir = os.path.join(archive_dir, "decisions")
        self.knowledge_dir = os.path.join(archive_dir, "knowledge")
        self.predictions_dir = os.path.join(archive_dir, "predictions")

        for directory in [self.decisions_dir, self.knowledge_dir, self.predictions_dir]:
            os.makedirs(directory, exist_ok=True)

    def archive_decision(
        self,
        ticker: str,
        decision: str,
        context: Dict[str, Any],
        agents_debate: List[Dict[str, Any]],
        final_confidence: float,
    ) -> str:
        """
        Archives a complete decision with full context.
        Returns the archive_id (hash-based immutable reference).
        """
        timestamp = datetime.now()

        archive_entry = {
            "archive_version": "1.0-ETERNAL",
            "timestamp": timestamp.isoformat(),
            "ticker": ticker,
            "decision": decision,
            "confidence": final_confidence,
            "context": {
                "market_data": context.get("market_stats", {}),
                "technical_indicators": context.get("technical", {}),
                "macro_environment": context.get("macro", {}),
                "news_sentiment": context.get("news", {}),
                "paradigm": context.get("paradigm", "UNKNOWN"),
            },
            "deliberation": {
                "agents_involved": [a.get("agent_name", "Unknown") for a in agents_debate],
                "debate_log": agents_debate,
                "consensus_strength": self._calculate_consensus(agents_debate),
            },
            "metadata": {
                "dynasty_phase": context.get("dynasty_objective", "FOUNDATION"),
                "active_strategies": context.get("active_strategies", []),
            },
        }

        archive_id = self._generate_archive_id(archive_entry)
        archive_entry["archive_id"] = archive_id

        # Save with date hierarchy
        date_path = timestamp.strftime("%Y/%m")
        save_dir = os.path.join(self.decisions_dir, date_path)
        os.makedirs(save_dir, exist_ok=True)

        filename = f"{timestamp.strftime('%Y%m%d_%H%M%S')}_{ticker}_{archive_id[:8]}.json"
        filepath = os.path.join(save_dir, filename)

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(archive_entry, f, indent=2, ensure_ascii=False)
            logger.info(f"📚 Decision archived: {archive_id[:12]}... ({ticker})")
            return archive_id
        except Exception as e:
            logger.error(f"Failed to archive decision: {e}")
            return ""

    def archive_prediction(
        self,
        ticker: str,
        prediction_type: str,
        predicted_value: float,
        prediction_horizon: str,
        model_name: str,
        confidence: float,
    ) -> str:
        """Archives a prediction for future verification."""
        timestamp = datetime.now()
        prediction_id = hashlib.sha256(f"{ticker}{timestamp.isoformat()}{model_name}".encode()).hexdigest()

        prediction_entry = {
            "prediction_id": prediction_id,
            "timestamp": timestamp.isoformat(),
            "ticker": ticker,
            "type": prediction_type,
            "predicted_value": predicted_value,
            "horizon": prediction_horizon,
            "model": model_name,
            "confidence": confidence,
            "verification_status": "PENDING",
            "actual_outcome": None,
            "error": None,
        }

        date_path = timestamp.strftime("%Y/%m")
        save_dir = os.path.join(self.predictions_dir, date_path)
        os.makedirs(save_dir, exist_ok=True)

        filename = f"pred_{timestamp.strftime('%Y%m%d_%H%M%S')}_{ticker}.json"
        filepath = os.path.join(save_dir, filename)

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(prediction_entry, f, indent=2, ensure_ascii=False)
            return prediction_id
        except Exception as e:
            logger.error(f"Failed to archive prediction: {e}")
            return ""

    def verify_predictions(self, current_market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verifies past predictions against actual outcomes."""
        verified_count = 0
        correct_predictions = 0
        total_error = 0.0

        for root, _, files in os.walk(self.predictions_dir):
            for file in files:
                if not file.startswith("pred_"):
                    continue

                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        pred = json.load(f)

                    if pred.get("verification_status") == "VERIFIED":
                        continue

                    # Check horizon
                    pred_time = datetime.fromisoformat(pred["timestamp"])
                    horizon_hours = self._parse_horizon(pred["horizon"])
                    if (datetime.now() - pred_time).total_seconds() / 3600 >= horizon_hours:
                        ticker = pred["ticker"]
                        actual = current_market_data.get(ticker, {}).get("Close")

                        if actual is not None:
                            pred["actual_outcome"] = float(actual)
                            pred["verification_status"] = "VERIFIED"
                            pred["verification_date"] = datetime.now().isoformat()
                            pred["error"] = abs(pred["predicted_value"] - actual)

                            with open(filepath, "w", encoding="utf-8") as f:
                                json.dump(pred, f, indent=2, ensure_ascii=False)

                            verified_count += 1
                            if abs(pred["error"] / actual) < 0.05:  # 5% margin
                                correct_predictions += 1
                            total_error += pred["error"]

                except Exception as e:
                    logger.error(f"Verification error in {file}: {e}")

        return {
            "verified_count": verified_count,
            "accuracy_rate": correct_predictions / verified_count if verified_count > 0 else 0.0,
            "average_error": total_error / verified_count if verified_count > 0 else 0.0,
        }

    def _generate_archive_id(self, entry: Dict[str, Any]) -> str:
        """Generates immutable hash for entry."""
        content = json.dumps(entry, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()

    def _calculate_consensus(self, debate: List[Dict[str, Any]]) -> float:
        """Measures agent agreement level (0.0 to 1.0)."""
        if not debate:
            return 0.0
        decisions = [a.get("decision", "HOLD") for a in debate]
        if not decisions:
            return 0.0
        most_common = max(set(decisions), key=decisions.count)
        return decisions.count(most_common) / len(decisions)

    def _parse_horizon(self, horizon: str) -> float:
        """Parses horizon string to hours."""
        h_lower = horizon.lower()
        try:
            val = float(h_lower.split()[0])
            if "day" in h_lower:
                return val * 24
            if "hour" in h_lower:
                return val
            if "week" in h_lower:
                return val * 24 * 7
        except BaseException:
            pass
        return 24.0
