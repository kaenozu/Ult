"""
Smart Alerts System
Evaluates market conditions and portfolio changes to trigger notifications or emergency stops.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import yfinance as yf

from src.data_loader import fetch_stock_data, get_latest_price
from src.paper_trader import PaperTrader
from src.smart_notifier import SmartNotifier

logger = logging.getLogger(__name__)


class SmartAlerts:
    """
    Monitors portfolio performance, volatility, and market stress (VIX) to send alerts.
    """

    DEFAULT_ALERTS = {
        "daily_loss_threshold": -3.0,  # %
        "position_change_threshold": 10.0,  # %
        "vix_threshold": 30.0,
        "large_profit_threshold": 5.0,  # %
        "enabled": True,
        "active_mode": False,
    }

    def __init__(self, config_path: str = "config.json"):
        self.pt = PaperTrader()
        self.notifier = SmartNotifier(config_path)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.alert_config = self.config.get("alerts", self.DEFAULT_ALERTS)

    def _load_config(self) -> Dict[str, Any]:
        """Loads configuration with defaults."""
        if not self.config_path.exists():
            return {"alerts": self.DEFAULT_ALERTS}

        try:
            config = json.loads(self.config_path.read_text(encoding="utf-8"))
            if "alerts" not in config:
                config["alerts"] = self.DEFAULT_ALERTS
            return config
        except Exception as e:
            logger.error(f"Failed to load config for alerts: {e}")
            return {"alerts": self.DEFAULT_ALERTS}

    def trigger_emergency_stop(self, reason: str) -> None:
        """
        Executes an emergency stop via FullyAutomatedTrader if active_mode is ON.
        """
        if not self.alert_config.get("active_mode", False):
            logger.warning(f"🛡️ [Active Defense OFF] Skipping emergency stop: {reason}")
            return

        logger.critical(f"🚨 EMERGENCY STOP TRIGGERED: {reason}")
        try:
            # Lazy import to avoid circular dependencies
            from src.trading.fully_automated_trader import FullyAutomatedTrader

            trader = FullyAutomatedTrader()
            trader.emergency_stop(reason)

            self.notifier.send_line_notify(f"🛡️ 【Active Defense】緊急停止を実行しました\n理由: {reason}")
        except Exception as e:
            logger.error(f"Emergency stop execution failed: {e}")

    def check_daily_loss(self) -> List[Dict[str, Any]]:
        """Checks daily equity drawdown."""
        alerts = []
        equity_history = self.pt.get_equity_history()

        if len(equity_history) < 2:
            return alerts

        today_equity = equity_history.iloc[-1]["total_equity"]
        yesterday_equity = equity_history.iloc[-2]["total_equity"]

        daily_change_pct = ((today_equity - yesterday_equity) / yesterday_equity) * 100
        threshold = self.alert_config.get("daily_loss_threshold", -3.0)

        if daily_change_pct < threshold:
            alerts.append(
                {
                    "type": "DAILY_LOSS",
                    "severity": "HIGH",
                    "title": "⚠️ 日次損失アラート",
                    "message": f"本日の資産が{abs(daily_change_pct):.1f}%減少しました（閾値: {abs(threshold):.1f}%）",
                    "value": daily_change_pct,
                }
            )

            # Force stop if loss exceeds 5%
            if daily_change_pct < -5.0:
                self.trigger_emergency_stop(f"日次損失拡大 ({daily_change_pct:.1f}%)")

        return alerts

    def check_position_volatility(self) -> List[Dict[str, Any]]:
        """Monitors significant price changes in individual holdings."""
        alerts = []
        positions = self.pt.get_positions()

        if positions.empty:
            return alerts

        threshold = self.alert_config.get("position_change_threshold", 10.0)

        for idx, pos in positions.iterrows():
            ticker = pos.get("ticker", idx)
            entry_price = pos.get("entry_price") or pos.get("avg_price")

            if not entry_price:
                continue

            try:
                # Use current price from data_loader
                data = fetch_stock_data([ticker], period="5d")
                if not data or ticker not in data:
                    continue

                current_price = get_latest_price(data[ticker])
                if current_price is None:
                    continue

                change_pct = ((current_price - entry_price) / entry_price) * 100

                if abs(change_pct) > threshold:
                    severity = "MEDIUM" if change_pct > 0 else "HIGH"
                    emoji = "📈" if change_pct > 0 else "📉"
                    alerts.append(
                        {
                            "type": "POSITION_VOLATILITY",
                            "severity": severity,
                            "title": f"{emoji} {ticker} 大幅変動",
                            "message": f"{ticker}が{change_pct:+.1f}%変動しました（現在価格: ¥{current_price:,.0f}）",
                            "ticker": ticker,
                            "value": change_pct,
                        }
                    )
            except Exception as e:
                logger.debug(f"Failed to check volatility for {ticker}: {e}")
                continue

        return alerts

    def check_vix_spike(self) -> List[Dict[str, Any]]:
        """Spike detection in market fear index (VIX)."""
        alerts = []
        threshold = self.alert_config.get("vix_threshold", 30.0)

        try:
            vix_data = yf.Ticker("^VIX").history(period="2d")
            if len(vix_data) < 2:
                return alerts

            current_vix = vix_data["Close"].iloc[-1]
            prev_vix = vix_data["Close"].iloc[-2]

            if current_vix > threshold:
                vix_change = current_vix - prev_vix
                alerts.append(
                    {
                        "type": "VIX_SPIKE",
                        "severity": "HIGH" if current_vix > 40 else "MEDIUM",
                        "title": "🚨 VIX急騰アラート",
                        "message": f"VIXが{current_vix:.1f}に上昇（前日比{vix_change:+.1f}）- 市場が非常に不安定です",
                        "value": current_vix,
                    }
                )

                if current_vix > 45.0:
                    self.trigger_emergency_stop(f"VIX危険水域 ({current_vix:.1f})")
        except Exception as e:
            logger.debug(f"VIX check failed: {e}")

        return alerts

    def run_all_checks(self) -> List[Dict[str, Any]]:
        """Aggregates all monitoring tasks."""
        if not self.alert_config.get("enabled", True):
            return []

        all_alerts = []
        all_alerts.extend(self.check_daily_loss())
        all_alerts.extend(self.check_position_volatility())
        all_alerts.extend(self.check_vix_spike())

        # Sort by severity (HIGH first)
        severity_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        all_alerts.sort(key=lambda x: severity_map.get(x["severity"], 3))

        return all_alerts

    def send_notifications(self, alerts: List[Dict[str, Any]]) -> None:
        """Constructs message and sends to configured channels."""
        if not alerts:
            return

        msg = f"🔔 AGStock アラート修正通知\n{datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        msg += "=" * 20 + "\n"

        for alert in alerts:
            emoji = {"HIGH": "🚨", "MEDIUM": "⚠️", "LOW": "💡"}.get(alert["severity"], "ℹ️")
            msg += f"\n{emoji} {alert['title']}\n{alert['message']}\n"

        # Notification logic
        line_cfg = self.config.get("notifications", {}).get("line", {})
        if line_cfg.get("enabled"):
            self.notifier.send_line_notify(msg, token=line_cfg.get("token"))

    def run(self) -> None:
        """Main entry point for periodic check."""
        logger.info("Starting Smart Alerts scan...")
        alerts = self.run_all_checks()
        if alerts:
            logger.info(f"Detected {len(alerts)} alerts.")
            self.send_notifications(alerts)
        else:
            logger.info("No alerts detected.")


def main():
    """Manual trigger script."""
    logging.basicConfig(level=logging.INFO)
    SmartAlerts().run()


if __name__ == "__main__":
    main()
