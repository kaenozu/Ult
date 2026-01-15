import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf

from src.broker import Broker
from src.broker import Position as BrokerPosition
from src.constants import DEFAULT_VOLATILITY_SYMBOL, FALLBACK_VOLATILITY_SYMBOLS
from src.strategies import Order, OrderType, Strategy

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Alias for backward compatibility
Position = BrokerPosition


class PaperBroker(Broker):
    """
    Simulates a brokerage account for paper trading.
    Manages cash, positions, and order execution.
    Persists state to a JSON file (local storage).
    """

    def __init__(self, initial_capital: float = 100_000.0, state_file: str = "paper_trading_state.json"):
        self.initial_capital = initial_capital
        self.state_file = state_file
        self.cash = initial_capital
        self.positions: Dict[str, Position] = {}
        self.trade_history: List[Dict[str, Any]] = []
        self.orders: List[Dict[str, Any]] = []

        self.load_state()

    def load_state(self):
        if Path(self.state_file).exists():
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)

                self.cash = data.get("cash", self.initial_capital)
                self.trade_history = data.get("trade_history", [])
                positions_data = data.get("positions", {})
                self.positions = {ticker: Position(**pos_data) for ticker, pos_data in positions_data.items()}
                logger.info(f"Loaded paper trading state. Cash: {self.cash}")
            except Exception as e:
                logger.error(f"Failed to load state: {e}")
        else:
            logger.info("No existing state found. Starting fresh.")

    def save_state(self):
        try:
            data = {
                "cash": self.cash,
                "positions": {t: p.to_dict() for t, p in self.positions.items()},
                "trade_history": self.trade_history,
                "last_updated": datetime.now().isoformat(),
            }
            with open(self.state_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")

    def get_cash(self) -> float:
        """Returns available cash (Broker interface method)."""
        return self.cash

    def get_positions(self) -> Dict[str, Position]:
        """Returns current positions (Broker interface method)."""
        return self.positions

    def get_trade_history(self) -> List[Dict[str, Any]]:
        """Returns trade history (Broker interface method)."""
        return self.trade_history

    def get_portfolio_value(self, current_prices: Dict[str, float]) -> float:
        positions_value = 0.0
        for ticker, pos in self.positions.items():
            price = current_prices.get(ticker, pos.current_price)  # Use last known if current not available
            if price > 0:
                positions_value += pos.quantity * price
                # Update position current price for display
                pos.current_price = price
                pos.unrealized_pnl = (price - pos.average_entry_price) * pos.quantity
        return self.cash + positions_value

    def execute_order(self, order: Order, current_price: float, timestamp: datetime):
        """
        Executes an order immediately at the current price (Market Order simulation).
        For Limit/Stop orders, the Engine should only call this when conditions are met.
        """
        cost = 0.0
        if order.action.upper() == "BUY":
            cost = order.quantity * current_price
            if self.cash >= cost:
                self.cash -= cost

                # Update position
                if order.ticker in self.positions:
                    pos = self.positions[order.ticker]
                    total_cost = (pos.quantity * pos.average_entry_price) + cost
                    pos.quantity += order.quantity
                    pos.average_entry_price = total_cost / pos.quantity
                else:
                    self.positions[order.ticker] = Position(
                        ticker=order.ticker,
                        quantity=order.quantity,
                        average_entry_price=current_price,
                        current_price=current_price,
                    )

                self._log_trade(order, current_price, timestamp)
                logger.info(f"BUY EXECUTED: {order.ticker} x {order.quantity} @ {current_price}")
            else:
                logger.warning(f"Insufficient funds for BUY {order.ticker}")

        elif order.action.upper() == "SELL":
            if order.ticker in self.positions:
                pos = self.positions[order.ticker]
                if pos.quantity >= order.quantity:
                    proceeds = order.quantity * current_price
                    self.cash += proceeds

                    pos.quantity -= order.quantity
                    if pos.quantity <= 0:
                        del self.positions[order.ticker]

                    self._log_trade(order, current_price, timestamp)
                    logger.info(f"SELL EXECUTED: {order.ticker} x {order.quantity} @ {current_price}")
                else:
                    logger.warning(f"Insufficient position for SELL {order.ticker}")
            else:
                logger.warning(f"No position found for SELL {order.ticker}")

        self.save_state()

    def _log_trade(self, order: Order, price: float, timestamp: datetime):
        self.trade_history.append(
            {
                "timestamp": timestamp.isoformat(),
                "ticker": order.ticker,
                "action": order.action,
                "quantity": order.quantity,
                "price": price,
                "type": order.type.name if hasattr(order.type, "name") else str(order.type),
            }
        )


class LiveTradingEngine:
    """
    Orchestrates the live trading process.
    Fetches data, runs strategies, and sends orders to the broker.
    """

    def __init__(
        self,
        broker: Broker,
        strategies: Dict[str, Strategy],
        tickers: List[str],
        enable_risk_guard: bool = True,
        initial_portfolio_value: float = 100_000.0,
        vol_symbol: str = DEFAULT_VOLATILITY_SYMBOL,
    ):
        self.broker = broker
        self.strategies = strategies
        self.tickers = tickers
        self.is_running = False
        self.interval_seconds = 60  # Run every minute
        self.emergency_stop = False
        self.vol_symbol = vol_symbol
        self._last_vix_level: Optional[float] = None

        # Initialize RiskGuard
        if enable_risk_guard:
            from src.risk_guard import RiskGuard

            self.risk_guard = RiskGuard(
                initial_portfolio_value=initial_portfolio_value,
                daily_loss_limit_pct=-5.0,
                max_position_size_pct=10.0,
                max_vix=40.0,
            )
        else:
            self.risk_guard = None

    def fetch_realtime_data(self, ticker: str) -> Optional[pd.DataFrame]:
        # This will be replaced by the actual data_loader function
        # For now, we import it inside the method to avoid circular imports if any
        from src.data_loader import fetch_realtime_data

        return fetch_realtime_data(ticker)

    def _get_vix_level(self) -> Optional[float]:
        """最新のVIX/代替ボラ指標を取得。失敗時は最後の成功値を返す。"""
        # 候補シンボルを設定で上書き可能に
        fallback_list = [self.vol_symbol]
        # 設定ファイルからリストを読み込む簡易対応（存在しなければ従来通り）
        try:
            with open("config.json", "r", encoding="utf-8") as f:
                cfg = json.load(f)
            # バリデーション: volatility_symbolsが存在し、リスト形式であることを確認
            vol_list = cfg.get("volatility_symbols")
            if vol_list is not None:
                if isinstance(vol_list, list) and all(isinstance(s, str) for s in vol_list if s):
                    fallback_list = [str(s) for s in vol_list if s]
                else:
                    logger.warning("Invalid volatility_symbols format in config.json. Using default VIX symbol.")
        except FileNotFoundError:
            # config.jsonが存在しない場合はデフォルトのまま継続
            pass
        except json.JSONDecodeError:
            logger.warning("Invalid JSON format in config.json. Using default VIX symbol.")
        except Exception:
            logger.warning("Error reading config.json. Using default VIX symbol.")

        if "^VIX" not in fallback_list:
            fallback_list.append("^VIX")
        if "^VXO" not in fallback_list:
            fallback_list.append("^VXO")

        for sym in fallback_list:
            try:
                vix = yf.Ticker(sym)
                hist = vix.history(period="5d", interval="1d")
                if hist is None or hist.empty or "Close" not in hist.columns:
                    continue
                val = float(hist["Close"].iloc[-1])
                self._last_vix_level = val
                return val
            except Exception as exc:
                logger.warning("Failed to fetch volatility symbol: %s, error: %s", sym, exc)
                continue

        return self._last_vix_level

    def run_cycle(self):
        """Execute one trading cycle with risk checks."""
        if self.emergency_stop:
            logger.warning("⛔ Emergency stop active - cycle skipped")
            return

        logger.info("Starting trading cycle...")
        current_prices = {}

        # Risk Guard: Check if trading should be halted
        if self.risk_guard:
            portfolio_value = self.broker.get_portfolio_value({})
            vix_level = self._get_vix_level()
            should_halt, reason = self.risk_guard.should_halt_trading(portfolio_value, vix_level)
            if should_halt:
                logger.critical(f"🚨 Trading halted: {reason}")
                self.emergency_stop = True
                return

        for ticker in self.tickers:
            try:
                df = self.fetch_realtime_data(ticker)
                if df is None or df.empty:
                    logger.warning(f"No data for {ticker}")
                    continue

                current_price = df["Close"].iloc[-1]
                current_prices[ticker] = current_price

                # Run strategy
                strategy = self.strategies.get(ticker)
                if strategy:
                    # Generate signal for the latest data point
                    # Note: Strategies usually expect a history. fetch_realtime_data should return enough history.
                    signals = strategy.generate_signals(df)
                    latest_signal = signals.iloc[-1] if not signals.empty else 0

                    # Process signal
                    # This is a simplified logic. In a real system, we'd handle Order objects more robustly.
                    # Here we assume the strategy might return an int or an Order object.

                    if isinstance(latest_signal, Order):
                        # If it's an Order object, we need to check if it matches current conditions
                        # For Market orders, execute immediately.
                        # For Limit/Stop, we'd need an Order Book in the Broker.
                        # For simplicity in Phase 1, we execute Market orders immediately.
                        if latest_signal.type == OrderType.MARKET:
                            self.broker.execute_order(latest_signal, current_price, datetime.now())

                    elif isinstance(latest_signal, (int, np.integer)):
                        # Legacy integer signal support
                        qty = 10  # Default quantity for int signals
                        if latest_signal == 1:  # BUY
                            order = Order(ticker=ticker, action="BUY", quantity=qty, type=OrderType.MARKET, price=0)
                            self.broker.execute_order(order, current_price, datetime.now())
                        elif latest_signal == -1:  # SELL
                            order = Order(ticker=ticker, action="SELL", quantity=qty, type=OrderType.MARKET, price=0)
                            self.broker.execute_order(order, current_price, datetime.now())

            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}")

        # Update portfolio value
        total_value = self.broker.get_portfolio_value(current_prices)
        logger.info(f"Cycle complete. Portfolio Value: {total_value:,.2f}")
        self.broker.save_state()

    def start(self):
        self.is_running = True
        logger.info("Live Trading Engine Started")
        while self.is_running:
            self.run_cycle()
            time.sleep(self.interval_seconds)

    def stop(self):
        self.is_running = False
        logger.info("Live Trading Engine Stopped")
