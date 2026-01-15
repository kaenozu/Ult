"""
本番環境マネージャー

完全自動運用のための本番環境管理機能を提供します。
- 本番モード切り替え
- エラーモニタリング
- パフォーマンストラッキング
- 自動レポート生成
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ProductionManager:
    """
    本番環境マネージャー

    システムの本番運用を管理します。
    """

    def __init__(self, config_file: str = "config/production.json"):
        """
        Args:
            config_file: 本番設定ファイルのパス
        """
        self.config_file = config_file
        self.config = self.load_config()
        self.is_production = self.config.get("production_mode", False)
        self.error_log = []
        self.performance_log = []

        logger.info(f"ProductionManager initialized: production_mode={self.is_production}")

    def load_config(self) -> Dict:
        """設定ファイルを読み込み"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                # デフォルト設定
                default_config = {
                    "production_mode": False,
                    "max_position_size": 0.2,  # ポートフォリオの20%まで
                    "max_daily_trades": 10,
                    "stop_loss_pct": 0.05,  # 5%
                    "take_profit_pct": 0.15,  # 15%
                    "monitoring": {"enabled": True, "alert_threshold": 0.03},  # 3%のドローダウンでアラート
                }
                self.save_config(default_config)
                return default_config
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}

    def save_config(self, config: Optional[Dict] = None):
        """設定ファイルに保存"""
        try:
            if config is None:
                config = self.config

            os.makedirs(os.path.dirname(self.config_file), exist_ok=True)

            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            logger.info(f"Config saved to {self.config_file}")
        except Exception as e:
            logger.error(f"Error saving config: {e}")

    def enable_production_mode(self):
        """本番モードを有効化"""
        self.is_production = True
        self.config["production_mode"] = True
        self.save_config()
        logger.warning("🚀 PRODUCTION MODE ENABLED")

    def disable_production_mode(self):
        """本番モードを無効化"""
        self.is_production = False
        self.config["production_mode"] = False
        self.save_config()
        logger.info("Production mode disabled")

    def log_error(self, error: Exception, context: str = ""):
        """エラーをログに記録"""
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context,
        }
        self.error_log.append(error_entry)
        logger.error(f"Error logged: {error_entry}")

    def log_performance(self, metrics: Dict):
        """パフォーマンスをログに記録"""
        perf_entry = {"timestamp": datetime.now().isoformat(), "metrics": metrics}
        self.performance_log.append(perf_entry)
        logger.info(f"Performance logged: {metrics}")

    def check_risk_limits(self, portfolio: Dict) -> bool:
        """リスク制限をチェック"""
        # ポジションサイズチェック
        max_position = self.config.get("max_position_size", 0.2)

        total_value = sum(pos.get("quantity", 0) * pos.get("current_price", 0) for pos in portfolio.values())

        for ticker, position in portfolio.items():
            position_value = position.get("quantity", 0) * position.get("current_price", 0)
            if total_value > 0:
                position_pct = position_value / total_value
                if position_pct > max_position:
                    logger.warning(f"Position size limit exceeded for {ticker}: {position_pct:.1%}")
                    return False

        return True

    def generate_daily_report(self, portfolio: Dict, trades: List[Dict]) -> str:
        """日次レポートを生成"""
        report_date = datetime.now().strftime("%Y-%m-%d")

        report = f"""
# AGStock Daily Report - {report_date}

## Portfolio Summary
- Total Value: ¥{sum(p.get('quantity', 0) * p.get('current_price', 0) for p in portfolio.values()):,.0f}
- Number of Positions: {len(portfolio)}

## Trades Today
- Total Trades: {len(trades)}
"""

        for trade in trades:
            report += f"- {trade.get('action')} {trade.get('quantity')} shares of {trade.get('ticker')} @ ¥{trade.get('price'):.2f}\n"

        report += "\n## Risk Metrics\n"
        report += f"- Max Position Size: {self.config.get('max_position_size', 0.2):.1%}\n"
        report += f"- Stop Loss: {self.config.get('stop_loss_pct', 0.05):.1%}\n"

        # エラーがあれば記載
        if self.error_log:
            report += f"\n## Errors ({len(self.error_log)})\n"
            for error in self.error_log[-5:]:  # 最新5件
                report += f"- [{error['timestamp']}] {error['error_type']}: {error['error_message']}\n"

        return report

    def should_halt_trading(self) -> bool:
        """取引を停止すべきかどうかを判定"""
        # 過度なエラーが発生している場合
        recent_errors = [
            e for e in self.error_log if datetime.fromisoformat(e["timestamp"]) > datetime.now() - timedelta(hours=1)
        ]

        if len(recent_errors) > 5:
            logger.critical("Too many errors in the last hour. Halting trading.")
            return True

        return False


# グローバルインスタンス
_production_manager = None


def get_production_manager() -> ProductionManager:
    """ProductionManagerのシングルトンインスタンスを取得"""
    global _production_manager
    if _production_manager is None:
        _production_manager = ProductionManager()
    return _production_manager


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    manager = ProductionManager()

    # テスト
    print(f"Production Mode: {manager.is_production}")

    # 本番モード有効化
    manager.enable_production_mode()

    # エラーログ
    try:
        raise ValueError("Test error")
    except Exception as e:
        manager.log_error(e, "Test context")

    # レポート生成
    portfolio = {
        "AAPL": {"quantity": 100, "current_price": 150.0},
        "GOOGL": {"quantity": 50, "current_price": 140.0},
    }

    trades = [
        {"action": "BUY", "ticker": "AAPL", "quantity": 10, "price": 150.0},
        {"action": "SELL", "ticker": "GOOGL", "quantity": 5, "price": 140.0},
    ]

    report = manager.generate_daily_report(portfolio, trades)
    print("\n" + report)
