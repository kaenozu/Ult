"""
リスク制限マネージャー

本番運用時の安全性を確保するための厳格なリスク制限
"""

import json
from typing import List, Tuple


class RiskLimiter:
    """リスク制限マネージャー"""

    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.risk_limits = self._get_risk_limits()
        self.violations = []

    def _load_config(self, path: str) -> dict:
        """設定読み込み"""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return self._default_config()

    def _default_config(self) -> dict:
        """デフォルト設定"""
        return {
            "risk_limits": {
                "max_position_size": 0.05,  # 1銘柄5%
                "max_daily_trades": 3,  # 1日3取引
                "max_daily_loss_pct": -3.0,  # 日次-3%
                "max_total_exposure": 0.80,  # 総投資80%
                "require_confirmation": True,  # 取引前確認
                "emergency_stop_loss_pct": -10.0,  # 緊急停止-10%
                "min_cash_reserve": 0.20,  # 最低現金20%
            }
        }

    def _get_risk_limits(self) -> dict:
        """リスク制限取得"""
        return self.config.get("risk_limits", self._default_config()["risk_limits"])

    def check_position_size(self, position_value: float, total_equity: float) -> Tuple[bool, str]:
        """ポジションサイズチェック"""
        max_size = self.risk_limits["max_position_size"]
        position_pct = position_value / total_equity if total_equity > 0 else 0

        if position_pct > max_size:
            msg = f"⛔ ポジションサイズ超過: {position_pct:.1%} > {max_size:.1%}"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def check_daily_trades(self, trades_today: int) -> Tuple[bool, str]:
        """日次取引数チェック"""
        max_trades = self.risk_limits["max_daily_trades"]

        if trades_today >= max_trades:
            msg = f"⛔ 日次取引数上限: {trades_today} >= {max_trades}"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def check_daily_loss(self, daily_pnl_pct: float) -> Tuple[bool, str]:
        """日次損失チェック"""
        max_loss = self.risk_limits["max_daily_loss_pct"]

        if daily_pnl_pct < max_loss:
            msg = f"🚨 日次損失上限: {daily_pnl_pct:.2f}% < {max_loss:.2f}%"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def check_total_exposure(self, invested_amount: float, total_equity: float) -> Tuple[bool, str]:
        """総投資比率チェック"""
        max_exposure = self.risk_limits["max_total_exposure"]
        exposure = invested_amount / total_equity if total_equity > 0 else 0

        if exposure > max_exposure:
            msg = f"⛔ 総投資比率超過: {exposure:.1%} > {max_exposure:.1%}"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def check_cash_reserve(self, cash: float, total_equity: float) -> Tuple[bool, str]:
        """現金準備チェック"""
        min_reserve = self.risk_limits["min_cash_reserve"]
        cash_ratio = cash / total_equity if total_equity > 0 else 0

        if cash_ratio < min_reserve:
            msg = f"⚠️ 現金不足: {cash_ratio:.1%} < {min_reserve:.1%}"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def check_emergency_stop(self, total_pnl_pct: float, initial_capital: float) -> Tuple[bool, str]:
        """緊急停止チェック"""
        emergency_level = self.risk_limits["emergency_stop_loss_pct"]

        if total_pnl_pct < emergency_level:
            msg = f"🚨🚨🚨 緊急停止発動: {total_pnl_pct:.2f}% < {emergency_level:.2f}%"
            self.violations.append(msg)
            return False, msg

        return True, "OK"

    def validate_trade(self, trade_info: dict, portfolio_state: dict) -> Tuple[bool, List[str]]:
        """取引の総合バリデーション"""
        checks = []
        all_passed = True

        # 1. ポジションサイズ
        position_value = trade_info.get("position_value", 0)
        total_equity = portfolio_state.get("total_equity", 0)
        passed, msg = self.check_position_size(position_value, total_equity)
        checks.append(msg)
        if not passed:
            all_passed = False

        # 2. 日次取引数
        trades_today = portfolio_state.get("trades_today", 0)
        passed, msg = self.check_daily_trades(trades_today)
        checks.append(msg)
        if not passed:
            all_passed = False

        # 3. 日次損失
        daily_pnl_pct = portfolio_state.get("daily_pnl_pct", 0)
        passed, msg = self.check_daily_loss(daily_pnl_pct)
        checks.append(msg)
        if not passed:
            all_passed = False

        # 4. 総投資比率
        invested = portfolio_state.get("invested_amount", 0)
        passed, msg = self.check_total_exposure(invested, total_equity)
        checks.append(msg)
        if not passed:
            all_passed = False

        # 5. 現金準備
        cash = portfolio_state.get("cash", 0)
        passed, msg = self.check_cash_reserve(cash, total_equity)
        checks.append(msg)
        if not passed:
            all_passed = False

        # 6. 緊急停止
        total_pnl_pct = portfolio_state.get("total_pnl_pct", 0)
        initial_capital = portfolio_state.get("initial_capital", 1000000)
        passed, msg = self.check_emergency_stop(total_pnl_pct, initial_capital)
        checks.append(msg)
        if not passed:
            all_passed = False

        return all_passed, checks

    def get_risk_report(self) -> str:
        """リスクレポート生成"""
        report = []
        report.append("\n" + "=" * 60)
        report.append("🛡️ リスク制限設定")
        report.append("=" * 60)

        limits = self.risk_limits
        report.append(f"\n📏 ポジションサイズ上限: {limits['max_position_size']:.1%}")
        report.append(f"🔢 日次取引数上限: {limits['max_daily_trades']}件")
        report.append(f"📉 日次損失上限: {limits['max_daily_loss_pct']:.1f}%")
        report.append(f"💼 総投資比率上限: {limits['max_total_exposure']:.1%}")
        report.append(f"💵 最低現金準備: {limits['min_cash_reserve']:.1%}")
        report.append(f"🚨 緊急停止レベル: {limits['emergency_stop_loss_pct']:.1f}%")

        if self.violations:
            report.append("\n⚠️ 違反履歴:")
            for v in self.violations[-10:]:  # 最新10件
                report.append(f"  {v}")

        report.append("\n" + "=" * 60)

        return "\n".join(report)


def main():
    """メイン実行"""
    limiter = RiskLimiter()
    print(limiter.get_risk_report())

    # テストケース
    print("\n📝 テストケース:")

    # 正常ケース
    trade = {"position_value": 40000}
    portfolio = {
        "total_equity": 1000000,
        "trades_today": 1,
        "daily_pnl_pct": -1.0,
        "invested_amount": 500000,
        "cash": 500000,
        "total_pnl_pct": -2.0,
        "initial_capital": 1000000,
    }

    passed, checks = limiter.validate_trade(trade, portfolio)
    print(f"\n✅ 正常ケース: {'合格' if passed else '不合格'}")
    for check in checks:
        if check != "OK":
            print(f"  {check}")

    # 異常ケース
    portfolio["daily_pnl_pct"] = -5.0  # 日次損失超過
    passed, checks = limiter.validate_trade(trade, portfolio)
    print(f"\n❌ 異常ケース: {'合格' if passed else '不合格'}")
    for check in checks:
        if check != "OK":
            print(f"  {check}")


if __name__ == "__main__":
    main()
