"""
Psychological Guard - 心理的な罠を回避するトレーディングガード

感情的な取引を防ぎ、厳格なルールベースの売買を実現
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional


class PsychologicalGuard:
    """心理的な罠を回避するガードシステム"""

    def __init__(self, config: Optional[Dict] = None):
        """
        Args:
            config: 設定辞書
        """
        self.logger = logging.getLogger(__name__)

        # デフォルト設定
        default_config = {
            "max_loss_per_trade": -0.05,  # -5%で必ず損切り
            "trailing_stop_pct": 0.10,  # ピークから10%下落で利確
            "max_position_size": 0.20,  # 1銘柄最大20%
            "cooling_period_days": 7,  # 損失後7日は同銘柄取引禁止
            "max_daily_trades": 5,  # 1日最大5取引（過剰取引防止）
            "min_holding_days": 3,  # 最低3日保有（デイトレ防止）
            "revenge_trading_threshold": -0.03,  # -3%以上の損失後は要注意
        }

        self.config = {**default_config, **(config or {})}

        # 取引履歴（メモリ保持）
        self.trade_history = []
        self.cooling_off_stocks = {}  # {ticker: end_date}

    def check_stop_loss(self, position: Dict) -> Dict:
        """
        損切りチェック

        Args:
            position: ポジション情報

        Returns:
            判定結果とアクション
        """
        unrealized_pnl_pct = position.get("unrealized_pnl_pct", 0)

        if unrealized_pnl_pct <= self.config["max_loss_per_trade"]:
            return {
                "action": "SELL_NOW",
                "reason": f"損切りライン到達: {unrealized_pnl_pct * 100:.1f}%",
                "urgency": "HIGH",
                "psychological_trap": "損失回避バイアス",
            }

        return {"action": "HOLD", "reason": "OK"}

    def check_trailing_stop(self, position: Dict, peak_price: float) -> Dict:
        """
        トレーリングストップチェック

        Args:
            position: ポジション情報
            peak_price: 保有期間中の最高価格

        Returns:
            判定結果とアクション
        """
        current_price = position.get("current_price", 0)

        if current_price <= 0 or peak_price <= 0:
            return {"action": "HOLD", "reason": "Invalid prices"}

        # ピークからの下落率
        drawdown_from_peak = (current_price - peak_price) / peak_price

        if drawdown_from_peak <= -self.config["trailing_stop_pct"]:
            return {
                "action": "SELL_NOW",
                "reason": f"トレーリングストップ: ピークから{abs(drawdown_from_peak) * 100:.1f}%下落",
                "urgency": "MEDIUM",
                "psychological_trap": "後悔回避バイアス",
            }

        return {"action": "HOLD", "reason": "OK"}

    def check_position_size(self, ticker: str, target_value: float, total_equity: float) -> Dict:
        """
        ポジションサイズチェック

        Args:
            ticker: 銘柄コード
            target_value: 目標投資額
            total_equity: 総資産

        Returns:
            判定結果
        """
        position_pct = target_value / total_equity if total_equity > 0 else 0
        max_allowed = self.config["max_position_size"]

        if position_pct > max_allowed:
            return {
                "action": "REDUCE_SIZE",
                "reason": f"ポジションサイズ超過: {position_pct * 100:.1f}% > {max_allowed * 100:.0f}%",
                "recommended_size": total_equity * max_allowed,
                "psychological_trap": "過信バイアス",
            }

        return {"action": "OK", "reason": "Position size acceptable"}

    def is_in_cooling_period(self, ticker: str) -> bool:
        """
        クーリングオフ期間中かチェック

        Args:
            ticker: 銘柄コード

        Returns:
            True if cooling period
        """
        if ticker not in self.cooling_off_stocks:
            return False

        end_date = self.cooling_off_stocks[ticker]

        if datetime.now() > end_date:
            # 期間終了
            del self.cooling_off_stocks[ticker]
            return False

        return True

    def record_trade(self, ticker: str, action: str, pnl: float):
        """
        取引を記録

        Args:
            ticker: 銘柄コード
            action: BUY or SELL
            pnl: 損益（SELLの場合）
        """
        trade = {
            "timestamp": datetime.now(),
            "ticker": ticker,
            "action": action,
            "pnl": pnl,
        }

        self.trade_history.append(trade)

        # 損失が大きい場合、クーリングオフ期間を設定
        if action == "SELL" and pnl < self.config["revenge_trading_threshold"] * 10000:  # 仮に資産1000万円として
            end_date = datetime.now() + timedelta(days=self.config["cooling_period_days"])
            self.cooling_off_stocks[ticker] = end_date
            self.logger.warning(f"Cooling period set for {ticker} until {end_date}")

    def check_overtrading(self, date: Optional[datetime] = None) -> Dict:
        """
        過剰取引チェック

        Args:
            date: チェック対象日（Noneで今日）

        Returns:
            判定結果
        """
        target_date = date or datetime.now().date()

        # 今日の取引回数
        today_trades = [t for t in self.trade_history if t["timestamp"].date() == target_date]

        if len(today_trades) >= self.config["max_daily_trades"]:
            return {
                "action": "STOP_TRADING",
                "reason": f"過剰取引: 本日{len(today_trades)}回取引済み",
                "psychological_trap": "衝動的取引",
            }

        return {"action": "OK", "reason": "Trading frequency acceptable"}

    def check_min_holding_period(self, entry_date: datetime) -> Dict:
        """
        最低保有期間チェック

        Args:
            entry_date: エントリー日時

        Returns:
            判定結果
        """
        holding_days = (datetime.now() - entry_date).days
        min_days = self.config["min_holding_days"]

        if holding_days < min_days:
            return {
                "action": "WAIT",
                "reason": f"最低保有期間未達: {holding_days}日 < {min_days}日",
                "days_remaining": min_days - holding_days,
                "psychological_trap": "デイトレード傾向",
            }

        return {"action": "OK", "reason": "Holding period sufficient"}

    def comprehensive_check(self, position: Dict, peak_price: float, total_equity: float) -> Dict:
        """
        包括的なチェック

        Args:
            position: ポジション情報
            peak_price: ピーク価格
            total_equity: 総資産

        Returns:
            総合判定結果
        """
        ticker = position.get("ticker")

        # 各チェック実行
        checks = {
            "stop_loss": self.check_stop_loss(position),
            "trailing_stop": self.check_trailing_stop(position, peak_price),
            "cooling_period": {"action": "BLOCKED"} if self.is_in_cooling_period(ticker) else {"action": "OK"},
            "overtrading": self.check_overtrading(),
            "holding_period": self.check_min_holding_period(position.get("entry_date", datetime.now())),
        }

        # 最も優先度の高いアクションを決定
        if checks["stop_loss"]["action"] == "SELL_NOW":
            return checks["stop_loss"]

        if checks["trailing_stop"]["action"] == "SELL_NOW":
            # 最低保有期間チェック
            if checks["holding_period"]["action"] == "WAIT":
                return {
                    "action": "WAIT",
                    "reason": "トレーリングストップだが最低保有期間未達",
                    "details": checks,
                }
            return checks["trailing_stop"]

        if checks["cooling_period"]["action"] == "BLOCKED":
            return {"action": "BLOCKED", "reason": f"クーリングオフ期間中（{ticker}）"}

        if checks["overtrading"]["action"] == "STOP_TRADING":
            return checks["overtrading"]

        return {"action": "OK", "reason": "All checks passed", "details": checks}


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    guard = PsychologicalGuard()

    print("=== Psychological Guard Test ===\n")

    # テスト1: 損切りチェック
    position = {
        "ticker": "7203.T",
        "unrealized_pnl_pct": -0.06,  # -6%
        "current_price": 940,
        "entry_price": 1000,
        "entry_date": datetime.now() - timedelta(days=5),
    }

    result = guard.check_stop_loss(position)
    print(f"損切りチェック: {result['action']}")
    print(f"理由: {result['reason']}\n")

    # テスト2: トレーリングストップ
    result = guard.check_trailing_stop(position, peak_price=1050)
    print(f"トレーリングストップ: {result['action']}")
    print(f"理由: {result['reason']}\n")

    # テスト3: 包括的チェック
    result = guard.comprehensive_check(position, peak_price=1050, total_equity=10000000)
    print(f"総合判定: {result['action']}")
    print(f"理由: {result['reason']}")
