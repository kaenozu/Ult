import datetime

import pandas as pd
import yfinance as yf


class SafetyChecks:
    """
    取引の安全性をチェックするための機能を提供します。
    """

    def __init__(self, config: dict, paper_trader, logger):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.risk_config = self.config.get("auto_trading", {})
        self.min_cash_balance = self.config.get("risk_management", {}).get("min_cash_balance", 10000)
        self.vix_ticker = self.config.get("market_indices", {}).get("vix", "^VIX")

    def _calculate_daily_pnl(self) -> float:
        """本日の損益を計算"""
        try:
            history = self.pt.get_trade_history()
            if history.empty:
                return 0.0
            if "timestamp" not in history.columns:
                self.logger.warning("取引履歴にtimestampカラムがありません")
                return 0.0

            today = datetime.date.today()
            if not pd.api.types.is_datetime64_any_dtype(history["timestamp"]):
                history["timestamp"] = pd.to_datetime(history["timestamp"])

            today_trades = history[history["timestamp"].dt.date == today]
            if today_trades.empty:
                return 0.0

            if "realized_pnl" in today_trades.columns:
                pnl = today_trades["realized_pnl"].sum()
            else:
                pnl = 0.0
            return pnl
        except Exception as e:
            self.logger.warning(f"日次損益計算エラー: {e}")
            return 0.0

    def is_safe_to_trade(self) -> tuple[bool, str]:
        """取引が安全か確認"""
        # 1. 日次損失制限チェック
        daily_pnl = self._calculate_daily_pnl()
        balance = self.pt.get_current_balance()
        total_equity = balance["total_equity"]

        daily_loss_pct = (daily_pnl / total_equity) * 100 if total_equity > 0 else 0

        if daily_loss_pct < self.risk_config.get("daily_loss_limit_pct", -5.0):
            return False, f"日次損失制限を超過: {daily_loss_pct:.2f}%"

        # 2. 市場ボラティリティチェック
        try:
            vix = yf.Ticker(self.vix_ticker)
            vix_data = vix.history(period="1d")
            if not vix_data.empty:
                current_vix = vix_data["Close"].iloc[-1]
                if current_vix > self.risk_config.get("max_vix", 40.0):
                    return (
                        False,
                        f"市場ボラティリティが高すぎます (VIX: {current_vix:.1f})",
                    )
        except Exception:
            self.logger.warning("VIXデータ取得失敗、ボラティリティチェックをスキップします。")

        # 3. 残高チェック
        if balance["cash"] < self.min_cash_balance:
            return False, "現金残高が不足しています"

        return True, "OK"

    def check_market_hours(self) -> bool:
        """
        市場取引時間中かどうかをチェック
        Returns:
            bool: 取引時間外ならTrue（実行許可）、取引時間中ならFalse（実行禁止）
        """
        now = datetime.datetime.now()
        current_time = now.time()

        # JST 9:00 - 15:00 (日本市場)
        jp_start = datetime.time(9, 0)
        jp_end = datetime.time(15, 0)

        # JST 23:30 - 06:00 (米国市場・標準時)
        # 夏時間は22:30 - 05:00だが、安全のため広めに取る
        us_start = datetime.time(22, 0)
        us_end = datetime.time(6, 0)

        # 平日のみチェック
        if now.weekday() < 5:  # 0=Mon, 4=Fri
            # 日本市場チェック
            if jp_start <= current_time <= jp_end:
                self.logger.warning("日本市場 取引時間中です")
                return False

            # 米国市場チェック (日付またぎ対応)
            if current_time >= us_start or current_time <= us_end:
                self.logger.warning("米国市場 取引時間中です")
                return False

        return True
