"""
Autonomous Feedback Loop
Implements post-market analysis and self-tuning capabilities.
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Any

import pandas as pd
from src.paper_trader import PaperTrader
from src.llm_reasoner import get_llm_reasoner

logger = logging.getLogger(__name__)


class DailyReviewer:
    """
    Reviews daily trading performance and adjusts system parameters.
    The 'Self-Improvement' component of AGStock.
    """

    def __init__(self, config_path: str = "config.json"):
        self.config_path = config_path
        self.pt = PaperTrader()
        self.reasoner = get_llm_reasoner()

    def calculate_daily_metrics(self) -> Dict[str, Any]:
        """Calculate today's performance metrics."""
        try:
            # Get today's trades
            history = self.pt.get_trade_history()
            if history.empty:
                return {
                    "total_trades": 0,
                    "win_rate": 0.0,
                    "daily_pnl": 0.0,
                    "avg_profit": 0.0,
                    "avg_loss": 0.0,
                }

            # Filter today's trades
            today = datetime.now().date()
            history["date"] = pd.to_datetime(history["timestamp"]).dt.date
            today_trades = history[history["date"] == today]

            if today_trades.empty:
                return {
                    "total_trades": 0,
                    "win_rate": 0.0,
                    "daily_pnl": 0.0,
                    "avg_profit": 0.0,
                    "avg_loss": 0.0,
                }

            # Calculate metrics
            total_trades = len(today_trades)

            # Calculate P&L for closed positions
            sells = today_trades[today_trades["action"] == "SELL"]
            buys = today_trades[today_trades["action"] == "BUY"]

            wins = 0
            total_pnl = 0.0
            profits = []
            losses = []

            for _, sell in sells.iterrows():
                ticker = sell["ticker"]
                # Find corresponding buy
                buy = buys[buys["ticker"] == ticker]
                if not buy.empty:
                    buy_price = buy.iloc[0]["price"]
                    sell_price = sell["price"]
                    quantity = sell["quantity"]
                    pnl = (sell_price - buy_price) * quantity
                    total_pnl += pnl

                    if pnl > 0:
                        wins += 1
                        profits.append(pnl)
                    else:
                        losses.append(pnl)

            win_rate = (wins / len(sells) * 100) if len(sells) > 0 else 0.0
            avg_profit = sum(profits) / len(profits) if profits else 0.0
            avg_loss = sum(losses) / len(losses) if losses else 0.0

            return {
                "total_trades": total_trades,
                "win_rate": win_rate,
                "daily_pnl": total_pnl,
                "avg_profit": avg_profit,
                "avg_loss": avg_loss,
                "closed_positions": len(sells),
            }

        except Exception as e:
            logger.error(f"Failed to calculate daily metrics: {e}")
            return {
                "total_trades": 0,
                "win_rate": 0.0,
                "daily_pnl": 0.0,
                "avg_profit": 0.0,
                "avg_loss": 0.0,
                "error": str(e),
            }

    def adjust_parameters(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adjust trading parameters based on performance.
        Returns the new parameters that should be applied.
        """
        adjustments = {}

        win_rate = metrics.get("win_rate", 50.0)
        daily_pnl = metrics.get("daily_pnl", 0.0)

        # Load current config
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return adjustments

        auto_trading = config.get("auto_trading", {})
        current_stop_loss = auto_trading.get("stop_loss_pct", 0.03)
        current_take_profit = auto_trading.get("take_profit_pct", 0.10)

        # Adjustment Logic
        if win_rate < 40.0:
            # Poor performance: Tighten stop loss, increase take profit
            new_stop_loss = max(current_stop_loss * 0.8, 0.01)  # Min 1%
            new_take_profit = min(current_take_profit * 1.2, 0.20)  # Max 20%

            adjustments["stop_loss_pct"] = new_stop_loss
            adjustments["take_profit_pct"] = new_take_profit
            adjustments["reason"] = f"Low win rate ({win_rate:.1f}%) - Tightening risk management"

        elif win_rate > 70.0 and daily_pnl > 0:
            # Excellent performance: Relax stop loss slightly, keep take profit
            new_stop_loss = min(current_stop_loss * 1.1, 0.05)  # Max 5%

            adjustments["stop_loss_pct"] = new_stop_loss
            adjustments["reason"] = f"High win rate ({win_rate:.1f}%) - Allowing more room"

        elif daily_pnl < 0:
            # Losing day: Be more conservative
            max_daily_trades = auto_trading.get("max_daily_trades", 5)
            new_max_trades = max(max_daily_trades - 1, 2)  # Min 2 trades

            adjustments["max_daily_trades"] = new_max_trades
            adjustments["reason"] = f"Negative P&L (¥{daily_pnl:.0f}) - Reducing trade frequency"

        return adjustments

    def apply_adjustments(self, adjustments: Dict[str, Any]) -> bool:
        """Apply parameter adjustments to config.json."""
        if not adjustments or "reason" not in adjustments:
            return False

        try:
            # Load config
            with open(self.config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # Apply changes
            auto_trading = config.get("auto_trading", {})
            reason = adjustments.pop("reason")

            for key, value in adjustments.items():
                old_value = auto_trading.get(key)
                auto_trading[key] = value
                logger.info(f"📝 Adjusted {key}: {old_value} -> {value}")

            config["auto_trading"] = auto_trading

            # Backup old config
            backup_path = f"{self.config_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            # Write new config
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            logger.info(f"✅ Config updated. Reason: {reason}")
            logger.info(f"📦 Backup saved: {backup_path}")

            return True

        except Exception as e:
            logger.error(f"Failed to apply adjustments: {e}")
            return False

    def generate_daily_journal(self, metrics: Dict[str, Any], adjustments: Dict[str, Any]) -> str:
        """Generate AI-powered daily journal using Gemini 2.0."""
        prompt = f"""
        あなたはAGStock自律トレーディングシステムのAIアナリストです。
        本日の取引結果を振り返り、簡潔な日報を作成してください。

## 本日の成績
        - 取引回数: {metrics.get('total_trades', 0)}回
        - 決済済み: {metrics.get('closed_positions', 0)}件
        - 勝率: {metrics.get('win_rate', 0):.1f}%
        - 損益: ¥{metrics.get('daily_pnl', 0):,.0f}
        - 平均利益: ¥{metrics.get('avg_profit', 0):,.0f}
        - 平均損失: ¥{metrics.get('avg_loss', 0):,.0f}

## 自動調整
        {adjustments.get('reason', '調整なし')}

        以下の形式で日報を作成してください（200文字以内）：
        - 本日の総評（1行）
        - 良かった点/改善点（各1行）
        - 明日への戦略（1行）
        """

        try:
            journal = self.reasoner.ask(prompt)
            return journal
        except Exception as e:
            logger.error(f"Failed to generate journal: {e}")
            return "日報生成に失敗しました。"

    def run_daily_review(self) -> Dict[str, Any]:
        """Execute the complete daily review process."""
        logger.info("🔍 Starting Daily Review...")

        # 1. Calculate metrics
        metrics = self.calculate_daily_metrics()
        logger.info(f"📊 Metrics: Win Rate={metrics.get('win_rate', 0):.1f}%, P&L=¥{metrics.get('daily_pnl', 0):,.0f}")

        # 2. Determine adjustments
        adjustments = self.adjust_parameters(metrics)

        # 3. Apply if needed
        if adjustments:
            success = self.apply_adjustments(adjustments)
            if not success:
                adjustments = {"reason": "調整の適用に失敗"}

        # 4. Generate journal
        journal = self.generate_daily_journal(metrics, adjustments)

        # 5. Save journal
        journal_dir = "data/journals"
        os.makedirs(journal_dir, exist_ok=True)
        journal_path = f"{journal_dir}/journal_{datetime.now().strftime('%Y%m%d')}.txt"

        try:
            with open(journal_path, "w", encoding="utf-8") as f:
                f.write("=== AGStock Daily Journal ===\n")
                f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write(f"Metrics:\n{json.dumps(metrics, indent=2, ensure_ascii=False)}\n\n")
                f.write(f"Adjustments:\n{json.dumps(adjustments, indent=2, ensure_ascii=False)}\n\n")
                f.write(f"AI Journal:\n{journal}\n")

            logger.info(f"📝 Journal saved: {journal_path}")
        except Exception as e:
            logger.error(f"Failed to save journal: {e}")

        return {
            "metrics": metrics,
            "adjustments": adjustments,
            "journal": journal,
            "journal_path": journal_path,
        }
