"""配当再投資自動化（DRIP: Dividend Reinvestment Plan）

配当受領時に自動で同銘柄または指定銘柄へ再投資
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

import yfinance as yf

logger = logging.getLogger(__name__)


class DRIPStrategy(Enum):
    """配当再投資戦略"""

    SAME_STOCK = "same_stock"  # 同じ銘柄に再投資
    TARGET_STOCK = "target_stock"  # 指定銘柄に再投資
    DIVERSIFIED = "diversified"  # 複数銘柄に分散
    ACCUMULATE = "accumulate"  # 現金として蓄積


@dataclass
class DividendInfo:
    """配当情報"""

    ticker: str
    ex_date: datetime
    payment_date: Optional[datetime]
    amount: float
    frequency: str  # "quarterly", "monthly", "annual"
    yield_pct: float


@dataclass
class DRIPOrder:
    """再投資注文"""

    source_ticker: str
    target_ticker: str
    dividend_amount: float
    shares_to_buy: float
    estimated_price: float
    status: str  # "pending", "executed", "failed"
    created_at: datetime
    executed_at: Optional[datetime] = None


class DRIPManager:
    """配当再投資管理クラス"""

    def __init__(
        self,
        strategy: DRIPStrategy = DRIPStrategy.SAME_STOCK,
        target_ticker: Optional[str] = None,
        diversified_tickers: Optional[List[str]] = None,
        min_reinvest_amount: float = 100.0,
    ):
        """初期化

        Args:
            strategy: 再投資戦略
            target_ticker: ターゲット銘柄（TARGET_STOCK時）
            diversified_tickers: 分散投資先リスト（DIVERSIFIED時）
            min_reinvest_amount: 最小再投資額
        """
        self.strategy = strategy
        self.target_ticker = target_ticker
        self.diversified_tickers = diversified_tickers or []
        self.min_reinvest_amount = min_reinvest_amount
        self._pending_orders: List[DRIPOrder] = []
        self._executed_orders: List[DRIPOrder] = []

    def get_upcoming_dividends(self, tickers: List[str], days_ahead: int = 30) -> List[DividendInfo]:
        """今後の配当予定を取得

        Args:
            tickers: 銘柄リスト
            days_ahead: 先読み日数

        Returns:
            配当情報リスト
        """
        dividends = []
        now = datetime.now()
        cutoff = now + timedelta(days=days_ahead)

        for ticker in tickers:
            try:
                div_info = self._get_dividend_info(ticker)
                if div_info and div_info.ex_date:
                    if now <= div_info.ex_date <= cutoff:
                        dividends.append(div_info)
            except Exception as e:
                logger.warning(f"Failed to get dividend info for {ticker}: {e}")

        return sorted(dividends, key=lambda x: x.ex_date)

    def _get_dividend_info(self, ticker: str) -> Optional[DividendInfo]:
        """単一銘柄の配当情報を取得"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            # 配当利回り
            div_yield = info.get("dividendYield", 0) or 0
            div_rate = info.get("dividendRate", 0) or 0

            if div_rate == 0:
                return None

            # 配当履歴から次回の配当日を推定
            dividends = stock.dividends
            if dividends.empty:
                return None

            # 配当頻度を推定
            if len(dividends) >= 4:
                avg_gap = (dividends.index[-1] - dividends.index[-4]).days / 3
                if avg_gap < 45:
                    frequency = "monthly"
                elif avg_gap < 120:
                    frequency = "quarterly"
                else:
                    frequency = "annual"
            else:
                frequency = "annual"

            # 次回の配当日を推定
            last_div_date = dividends.index[-1].to_pydatetime()
            if frequency == "quarterly":
                next_ex_date = last_div_date + timedelta(days=90)
            elif frequency == "monthly":
                next_ex_date = last_div_date + timedelta(days=30)
            else:
                next_ex_date = last_div_date + timedelta(days=365)

            # 過去の日付なら調整
            while next_ex_date < datetime.now():
                if frequency == "quarterly":
                    next_ex_date += timedelta(days=90)
                elif frequency == "monthly":
                    next_ex_date += timedelta(days=30)
                else:
                    next_ex_date += timedelta(days=365)

            return DividendInfo(
                ticker=ticker,
                ex_date=next_ex_date,
                payment_date=next_ex_date + timedelta(days=14),
                amount=float(dividends.iloc[-1]),
                frequency=frequency,
                yield_pct=div_yield * 100,
            )

        except Exception as e:
            logger.debug(f"Dividend info fetch failed for {ticker}: {e}")
            return None

    def calculate_reinvestment(
        self,
        source_ticker: str,
        dividend_amount: float,
        shares_held: int,
    ) -> Optional[DRIPOrder]:
        """再投資計画を計算

        Args:
            source_ticker: 配当元銘柄
            dividend_amount: 1株あたり配当額
            shares_held: 保有株数

        Returns:
            DRIPOrderまたはNone
        """
        total_dividend = dividend_amount * shares_held

        if total_dividend < self.min_reinvest_amount:
            logger.info(
                f"Dividend {total_dividend:.2f} below minimum " f"{self.min_reinvest_amount:.2f}, skipping DRIP"
            )
            return None

        # 再投資先を決定
        if self.strategy == DRIPStrategy.SAME_STOCK:
            target = source_ticker
        elif self.strategy == DRIPStrategy.TARGET_STOCK:
            target = self.target_ticker or source_ticker
        elif self.strategy == DRIPStrategy.DIVERSIFIED:
            # 最も安い銘柄を選択（簡易実装）
            target = self._select_cheapest_target()
        else:  # ACCUMULATE
            return None

        # 現在価格を取得
        try:
            stock = yf.Ticker(target)
            current_price = stock.info.get("currentPrice", 0)
            if current_price == 0:
                hist = stock.history(period="1d")
                if not hist.empty:
                    current_price = float(hist["Close"].iloc[-1])
        except Exception:
            current_price = 0

        if current_price <= 0:
            return None

        shares_to_buy = total_dividend / current_price

        order = DRIPOrder(
            source_ticker=source_ticker,
            target_ticker=target,
            dividend_amount=total_dividend,
            shares_to_buy=shares_to_buy,
            estimated_price=current_price,
            status="pending",
            created_at=datetime.now(),
        )

        self._pending_orders.append(order)
        return order

    def _select_cheapest_target(self) -> str:
        """分散投資先から最も安い銘柄を選択"""
        if not self.diversified_tickers:
            return self.diversified_tickers[0] if self.diversified_tickers else ""

        cheapest = None
        lowest_price = float("inf")

        for ticker in self.diversified_tickers:
            try:
                stock = yf.Ticker(ticker)
                price = stock.info.get("currentPrice", float("inf"))
                if price < lowest_price:
                    lowest_price = price
                    cheapest = ticker
            except Exception:
                continue

        return cheapest or self.diversified_tickers[0]

    def execute_pending_orders(self, paper_trader) -> List[DRIPOrder]:
        """ペンディング注文を実行

        Args:
            paper_trader: PaperTraderインスタンス

        Returns:
            実行された注文リスト
        """
        executed = []

        for order in self._pending_orders:
            try:
                # 小数株対応（切り捨て）
                whole_shares = int(order.shares_to_buy)
                if whole_shares < 1:
                    logger.info("DRIP: Less than 1 share, accumulating cash")
                    order.status = "accumulated"
                    continue

                # 注文実行
                paper_trader.buy(
                    order.target_ticker,
                    whole_shares,
                    order.estimated_price,
                )

                order.status = "executed"
                order.executed_at = datetime.now()
                executed.append(order)

                logger.info(
                    f"DRIP executed: {whole_shares} shares of {order.target_ticker} " f"@ {order.estimated_price:.2f}"
                )

            except Exception as e:
                logger.error(f"DRIP execution failed: {e}")
                order.status = "failed"

        # 実行済みを移動
        self._executed_orders.extend(executed)
        self._pending_orders = [o for o in self._pending_orders if o.status == "pending"]

        return executed

    def get_drip_summary(self, portfolio: Dict[str, int]) -> Dict[str, Any]:
        """ポートフォリオのDRIPサマリーを取得

        Args:
            portfolio: {銘柄: 保有株数}

        Returns:
            サマリー辞書
        """
        tickers = list(portfolio.keys())
        upcoming = self.get_upcoming_dividends(tickers, days_ahead=90)

        total_expected_dividend = 0
        dividend_schedule = []

        for div in upcoming:
            shares = portfolio.get(div.ticker, 0)
            expected_amount = div.amount * shares
            total_expected_dividend += expected_amount

            dividend_schedule.append(
                {
                    "ticker": div.ticker,
                    "ex_date": div.ex_date.strftime("%Y-%m-%d"),
                    "amount_per_share": div.amount,
                    "shares_held": shares,
                    "expected_total": expected_amount,
                    "yield": div.yield_pct,
                }
            )

        return {
            "strategy": self.strategy.value,
            "total_expected_dividend_90d": total_expected_dividend,
            "dividend_schedule": dividend_schedule,
            "pending_orders": len(self._pending_orders),
            "executed_orders": len(self._executed_orders),
        }


# シングルトン
_drip_manager: Optional[DRIPManager] = None


def get_drip_manager(strategy: DRIPStrategy = DRIPStrategy.SAME_STOCK, **kwargs) -> DRIPManager:
    """シングルトンインスタンスを取得"""
    global _drip_manager
    if _drip_manager is None:
        _drip_manager = DRIPManager(strategy=strategy, **kwargs)
    return _drip_manager
