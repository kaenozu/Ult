import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from src.paper_trader import PaperTrader
from src.data_loader import fetch_fundamental_data, fetch_external_data
from src.utils.health import quick_health_check

logger = logging.getLogger(__name__)


class ExecutionEngine:
    def __init__(self, paper_trader: PaperTrader, real_broker: Any = None, config_path: str = "config.json") -> None:
        self.pt = paper_trader
        self.real_broker = real_broker
        self.max_position_size_pct: float = 0.20  # Max 20% of equity per stock (overridden by scenario)
        self.max_drawdown_limit: float = 0.15  # Stop trading if DD > 15% (overridden by scenario)
        self.vol_slowdown_threshold: float = 30.0
        self.scenario: str = "neutral"
        self.scenario_presets: Dict[str, Dict[str, float]] = {
            "conservative": {"max_position_size_pct": 0.10, "max_drawdown_limit": 0.10, "vol_slowdown_threshold": 22},
            "neutral": {"max_position_size_pct": 0.20, "max_drawdown_limit": 0.15, "vol_slowdown_threshold": 28},
            "aggressive": {"max_position_size_pct": 0.30, "max_drawdown_limit": 0.20, "vol_slowdown_threshold": 32},
        }
        self.exposure_limits: Dict[str, float] = {"max_per_ticker_pct": 0.25, "max_per_sector_pct": 0.35}
        self.health_endpoints: List[str] = []
        self._sector_cache: Dict[str, str] = {}

        # ミニ株設定を読み込み
        self.config: Dict[str, Any] = self._load_config(config_path)
        self.mini_stock_config: Dict[str, Any] = self.config.get("mini_stock", {})
        self.mini_stock_enabled: bool = self.mini_stock_config.get("enabled", False)
        self._load_risk_overrides()

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """設定ファイルを読み込み"""
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {}

    def _load_risk_overrides(self) -> None:
        """config/envに基づきシナリオ・エクスポージャー・APIヘルスを設定。"""
        risk_conf = self.config.get("auto_trading", {})
        self.scenario = os.getenv("TRADING_SCENARIO", risk_conf.get("scenario", self.scenario))

        self.exposure_limits["max_per_ticker_pct"] = float(
            os.getenv(
                "MAX_PER_TICKER_PCT",
                risk_conf.get("max_per_ticker_pct", self.exposure_limits["max_per_ticker_pct"]),
            )
        )
        self.exposure_limits["max_per_sector_pct"] = float(
            os.getenv(
                "MAX_PER_SECTOR_PCT",
                risk_conf.get("max_per_sector_pct", self.exposure_limits["max_per_sector_pct"]),
            )
        )

        health_conf = self.config.get("health", {})
        endpoints = health_conf.get("latency_endpoints", [])
        if isinstance(endpoints, list):
            self.health_endpoints = [str(e) for e in endpoints if e]

        self._apply_scenario(self.scenario)

    def get_japan_unit_size(self) -> int:
        """日本株の売買単位を取得（ミニ株対応）"""
        if self.mini_stock_enabled:
            return int(self.mini_stock_config.get("unit_size", 1))
        return 100  # 通常の単元株

    def calculate_trading_fee(self, amount: float, is_mini_stock: bool = False, order_type: str = "寄付") -> float:
        """取引手数料を計算"""
        if is_mini_stock and self.mini_stock_enabled:
            if order_type == "リアルタイム":
                spread_rate = float(self.mini_stock_config.get("spread_rate", 0.0022))
                return amount * spread_rate
            else:
                return 0.0
        else:
            return 0.0

    def check_risk(self) -> bool:
        """Checks global risk parameters. Returns True if safe to trade."""
        balance = self.pt.get_current_balance()
        initial = float(self.pt.initial_capital)
        current_equity = float(balance.get("total_equity", 0.0))

        if initial <= 0:
            logger.warning("Initial capital is zero or invalid.")
            return False

        if self.real_broker:
            try:
                real_balance = self.real_broker.get_balance()
                if real_balance and "total_equity" in real_balance:
                    real_equity = float(real_balance["total_equity"])
                    paper_equity = current_equity
                    diff_pct = abs(real_equity - paper_equity) / paper_equity if paper_equity > 0 else 0
                    if diff_pct > 0.05:
                        logger.warning(f"⚠️ WARNING: 実残高と仮想残高の乖離が大 ({diff_pct:.1%})")
            except Exception as e:
                logger.error(f"⚠️ 実残高確認エラー: {e}")

        drawdown = (initial - current_equity) / initial
        if drawdown > self.max_drawdown_limit:
            logger.error(f"RISK ALERT: Max Drawdown exceeded ({drawdown:.1%}). Trading halted.")
            return False

        # Phase 72: Black Swan Circuit Breaker
        try:
            # Check major indices (e.g. S&P 500 or Topix equivalent)
            market_data = fetch_external_data(period="2d")
            index_df = market_data.get("^GSPC") or market_data.get("^N225")
            if index_df is not None and len(index_df) >= 2:
                daily_change = (index_df["Close"].iloc[-1] - index_df["Close"].iloc[-2]) / index_df["Close"].iloc[-2]
                if daily_change < -0.05:
                    logger.error(f"⚠️ CIRCUIT BREAKER: Market crash detected ({daily_change:.1%}). Trading locked down.")
                    return False
        except Exception as e:
            logger.warning(f"Circuit breaker check failed: {e}")

        return True

    def _apply_scenario(self, scenario: str) -> None:
        preset = self.scenario_presets.get(scenario.lower())
        if not preset:
            return
        self.scenario = scenario
        self.max_position_size_pct = float(preset.get("max_position_size_pct", self.max_position_size_pct))
        self.max_drawdown_limit = float(preset.get("max_drawdown_limit", self.max_drawdown_limit))
        self.vol_slowdown_threshold = float(preset.get("vol_slowdown_threshold", self.vol_slowdown_threshold))

    def set_scenario(self, scenario: str) -> None:
        """外部UIからシナリオを切り替えるためのメソッド"""
        self._apply_scenario(scenario)
        logger.info("Scenario switched to %s", scenario)

    def _current_drawdown(self) -> float:
        balance = self.pt.get_current_balance()
        equity = float(balance.get("total_equity", 0.0))
        if equity <= 0 or self.pt.initial_capital <= 0:
            return 0.0
        return (self.pt.initial_capital - equity) / self.pt.initial_capital

    def _get_sector(self, ticker: str) -> Optional[str]:
        if ticker in self._sector_cache:
            return self._sector_cache[ticker]
        try:
            info = fetch_fundamental_data(ticker)
            sector = info.get("sector") or info.get("industry") if isinstance(info, dict) else None
            if sector:
                self._sector_cache[ticker] = sector
            return sector
        except Exception:
            return None

    def _check_exposure_limit(self, ticker: str, qty: int, price: float) -> Tuple[bool, str]:
        equity = float(self.pt.get_current_balance().get("total_equity", 0.0))
        if equity <= 0:
            return True, ""

        value = qty * price
        positions = self.pt.get_positions()
        ticker_value = 0.0
        sector_value = 0.0

        if not positions.empty and "ticker" in positions.columns:
            if "market_value" in positions.columns:
                ticker_value = float(positions.loc[positions["ticker"] == ticker, "market_value"].sum())
            else:
                row = positions.loc[positions["ticker"] == ticker]
                if not row.empty and {"quantity", "current_price"}.issubset(row.columns):
                    ticker_value = float((row["quantity"] * row["current_price"]).sum())
            sector = self._get_sector(ticker)
            if sector:
                current_sector_tickers = positions["ticker"].tolist()
                for tkr in current_sector_tickers:
                    same_sector = self._get_sector(tkr) == sector
                    if same_sector:
                        if "market_value" in positions.columns:
                            sector_value += float(positions.loc[positions["ticker"] == tkr, "market_value"].sum())
                        elif {"quantity", "current_price"}.issubset(positions.columns):
                            sel = positions.loc[positions["ticker"] == tkr]
                            sector_value += float((sel["quantity"] * sel["current_price"]).sum())
        # 追加分を加味
        ticker_after = (ticker_value + value) / equity
        if ticker_after > self.exposure_limits["max_per_ticker_pct"]:
            return False, f"{ticker} exposure {ticker_after:.1%} exceeds limit"

        if sector_value > 0:
            sector_after = (sector_value + value) / equity
            if sector_after > self.exposure_limits["max_per_sector_pct"]:
                return False, f"Sector exposure {sector_after:.1%} exceeds limit"

        return True, ""

    def _volatility_slowdown_factor(self) -> float:
        """VIXやドローダウンを加味してポジションを縮小。"""
        factor = 1.0
        dd = self._current_drawdown()
        if dd > 0.05:
            factor *= max(0.5, 1.0 - dd)  # 5%以上のDDで縮小

        vix_level = None
        try:
            ext = fetch_external_data(period="5d")
            vix_df = ext.get("VIX")
            if vix_df is not None and not vix_df.empty:
                vix_level = float(vix_df["Close"].iloc[-1])
        except Exception:
            vix_level = None

        if vix_level and vix_level > self.vol_slowdown_threshold:
            factor *= 0.6  # 高ボラ期は40%縮小

        return max(factor, 0.25)

    def _cvar_adjustment(self) -> float:
        """
        エクイティ履歴から単純なCVaR(下方5%平均)を計算し、ポジションサイズ係数を返す。
        負のCVaRが大きいほど縮小。
        """
        try:
            eq_df = pd.DataFrame(self.pt.get_equity_history(), columns=["date", "total_equity"])
            if eq_df.empty:
                return 1.0
            eq_df["return"] = eq_df["total_equity"].pct_change()
            rets = eq_df["return"].dropna().tail(60)
            if rets.empty:
                return 1.0
            cutoff = np.quantile(rets, 0.05)
            cvar = rets[rets <= cutoff].mean() if not rets[rets <= cutoff].empty else cutoff
            # 例えば -3% のCVaRなら 0.97 の係数
            return max(0.4, 1.0 + cvar)
        except Exception:
            return 1.0

    def calculate_position_size(self, ticker: str, price: float, confidence: float = 1.0) -> int:
        """Calculates the number of shares to buy based on risk management."""
        balance = self.pt.get_current_balance()
        equity = float(balance.get("total_equity", 0.0))
        cash = float(balance.get("cash", 0.0))

        target_amount = equity * self.max_position_size_pct
        target_amount *= confidence
        target_amount *= self._volatility_slowdown_factor()
        target_amount *= self._cvar_adjustment()
        target_amount = min(target_amount, cash)

        if target_amount <= 0:
            return 0

        is_us_stock = "." not in ticker
        is_japan_stock = ticker.endswith(".T")

        if is_us_stock:
            unit_size = 1
        elif is_japan_stock:
            unit_size = self.get_japan_unit_size()
        else:
            unit_size = 1

        min_order = float(self.mini_stock_config.get("min_order_amount", 500.0))
        if self.mini_stock_enabled and target_amount < min_order:
            return 0

        if target_amount < price * unit_size:
            return 0

        shares = int(target_amount / price / unit_size) * unit_size
        return shares

    def execute_orders(self, signals: List[Dict[str, Any]], prices: Dict[str, float]) -> List[Dict[str, Any]]:
        """Executes a list of trade signals. Returns a list of executed trades."""
        executed_trades: List[Dict[str, Any]] = []

        health = quick_health_check(endpoints=self.health_endpoints)
        if not health.get("disk_ok", True) or not health.get("memory_ok", True):
            logger.error("Environment health check failed (disk/memory). Trading skipped.")
            return executed_trades
        if not health.get("api_ok", True):
            logger.warning("API health degraded; skipping trades for safety.")
            return executed_trades

        if os.getenv("SAFE_MODE", "").lower() in {"1", "true", "yes", "on"}:
            logger.warning("SAFE_MODE is ON. BUY orders are suppressed.")
            # SELLは許可、BUYはスキップ
            signals = [s for s in signals if s.get("action") == "SELL"]

        if not self.check_risk():
            return executed_trades

        def _retry_trade(func) -> bool:
            for attempt in range(3):
                if func():
                    return True
                time.sleep(1)
            return False

        for signal in signals:
            ticker = signal.get("ticker")
            if not ticker or not isinstance(ticker, str):
                continue

            action = signal.get("action")
            confidence = float(signal.get("confidence", 1.0))
            price = prices.get(ticker)
            reason = str(signal.get("reason", "Auto-Trade"))

            if not price:
                logger.info(f"Skipping {ticker}: No price data.")
                continue

            if action == "BUY":
                qty = int(signal.get("quantity", 0))
                if qty == 0:
                    qty = self.calculate_position_size(ticker, price, confidence)

                if qty > 0:
                    ok, reason = self._check_exposure_limit(ticker, qty, price)
                    if not ok:
                        logger.warning("Exposure limit hit: %s", reason)
                        continue

                    if self.real_broker:
                        logger.info(f"🚀 REAL TRADE: BUY {qty} {ticker} @ {price}")
                        try:
                            success = self.real_broker.buy_order(ticker, qty, price, order_type="指値")
                        except Exception as e:
                            logger.error(f"Real broker error: {e}")
                            success = False

                        if success:
                            self.pt.execute_trade(
                                ticker, "BUY", qty, price, reason=f"Real Trade Sync (Conf: {confidence:.2f})"
                            )
                            executed_trades.append(
                                {"ticker": ticker, "action": "BUY", "quantity": qty, "price": price, "reason": reason}
                            )
                    else:
                        # Phase 72: Forced Stop Loss (Default 5%)
                        initial_stop = price * 0.95

                        success = _retry_trade(
                            lambda: self.pt.execute_trade(
                                ticker,
                                "BUY",
                                qty,
                                price,
                                reason=f"{reason} (Conf: {confidence:.2f})",
                                initial_stop_price=initial_stop,
                            )
                        )
                        if success:
                            logger.info(f"EXECUTED: BUY {qty} {ticker} @ {price} (Stop: {initial_stop:.2f})")
                            executed_trades.append(
                                {
                                    "ticker": ticker,
                                    "action": "BUY",
                                    "quantity": qty,
                                    "price": price,
                                    "reason": reason,
                                    "stop_price": initial_stop,
                                }
                            )
                        else:
                            logger.warning(f"FAILED: BUY {ticker} (Insufficient funds?)")

            elif action == "SELL":
                positions = self.pt.get_positions()

                if not positions.empty and "ticker" in positions.columns and ticker in positions["ticker"].values:
                    row = positions[positions["ticker"] == ticker].iloc[0]
                    qty = int(row["quantity"])

                    if self.real_broker:
                        logger.info(f"🚀 REAL TRADE: SELL {qty} {ticker} @ {price}")
                        logger.warning("⚠️ 実取引の売り注文は未実装のためスキップします（安全のため）")
                        success = False
                    else:
                        success = _retry_trade(lambda: self.pt.execute_trade(ticker, "SELL", qty, price, reason=reason))
                        if success:
                            logger.info(f"EXECUTED: SELL {qty} {ticker} @ {price}")
                            executed_trades.append(
                                {"ticker": ticker, "action": "SELL", "quantity": qty, "price": price, "reason": reason}
                            )

        return executed_trades
