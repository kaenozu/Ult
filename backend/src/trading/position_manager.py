from typing import Dict, List

import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential  # _fetch_data_with_retry は SafetyChecks にある

from src.data_loader import (
    get_latest_price,
)  # fetch_stock_data は SafetyChecks にあるので必要に応じてインポート


class PositionManager:
    """
    保有ポジションの評価と管理、および損切り・利確シグナルの生成を行います。
    """

    def __init__(self, config: dict, paper_trader, logger, dynamic_stop_manager, risk_manager):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.dynamic_stop_manager = dynamic_stop_manager
        self.risk_manager = risk_manager

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_data_with_retry(self, tickers: List[str]) -> Dict:
        """
        リトライロジック付きでデータ取得
        """
        from src.data_loader import fetch_stock_data  # ここでインポートすることで循環参照を避ける

        try:
            self.logger.info(f"データ取得中... ({len(tickers)}銘柄)")
            data_map = fetch_stock_data(tickers, period="2y")
            self.logger.info(f"データ取得完了: {len(data_map)}銘柄")
            return data_map
        except Exception as e:
            self.logger.warning(f"データ取得失敗（リトライします）: {e}")
            raise  # リトライのために例外を再throw

    def evaluate_positions(self) -> List[Dict]:
        """
        保有ポジションを評価し、損切り・利確のシグナルを生成
        - DynamicStopManager でのストップ更新・保存
        - ATRベースの下支え
        - トレーリング／固定利確
        """
        positions = self.pt.get_positions()
        if positions.empty:
            return []

        tickers = [pos.get("ticker") for _, pos in positions.iterrows() if pos.get("ticker")]
        if not tickers:
            return []

        data_map = self._fetch_data_with_retry(tickers)
        signals: List[Dict] = []

        for _, position in positions.iterrows():
            ticker = position.get("ticker")
            if not ticker:
                continue

            df = data_map.get(ticker)
            if df is None or df.empty:
                continue

            latest_price = get_latest_price(df)
            entry_price = position.get("entry_price") or position.get("avg_price")
            quantity = position.get("quantity", 0)
            if entry_price is None or quantity <= 0 or latest_price is None:
                self.logger.warning(f"エントリー価格または数量が不明: {ticker}")
                continue

            pnl_pct = (latest_price - entry_price) / entry_price
            unrealized_pct = position.get("unrealized_pnl_pct", pnl_pct * 100)

            # Dynamic Stop Managerでストップを再計算してDBに保存
            highest_price = position.get("highest_price", entry_price)
            self.dynamic_stop_manager.highest_prices[ticker] = highest_price
            self.dynamic_stop_manager.entry_prices[ticker] = entry_price

            new_stop = self.dynamic_stop_manager.update_stop(ticker, latest_price, df)
            new_highest = self.dynamic_stop_manager.highest_prices.get(ticker, latest_price)
            self.pt.update_position_stop(ticker, new_stop, new_highest)

            should_exit, exit_reason = self.dynamic_stop_manager.check_exit(ticker, latest_price)
            if should_exit:
                signals.append(
                    {
                        "ticker": ticker,
                        "action": "SELL",
                        "reason": exit_reason,
                        "confidence": 1.0,
                        "price": latest_price,
                        "quantity": quantity,
                    }
                )
                self.logger.info(f"Exit Signal ({ticker}): {exit_reason}")
                continue

            # DynamicRiskManagerの利確閾値
            try:
                params = self.risk_manager.current_params
                take_profit_threshold = params.get("take_profit", 0.10)
                if pnl_pct > take_profit_threshold:
                    signals.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "reason": f"利確({pnl_pct:.1%}、閾値{take_profit_threshold:.1%})",
                            "confidence": 1.0,
                            "price": latest_price,
                            "quantity": quantity,
                        }
                    )
                    self.logger.info(f"利確判断: {ticker} ({pnl_pct:.1%})")
                    continue
            except Exception:
                pass

            # ATRベースの下支えとトレーリング利確
            if len(df) >= 20:
                high = df["High"]
                low = df["Low"]
                close = df["Close"]

                tr1 = high - low
                tr2 = (high - close.shift()).abs()
                tr3 = (low - close.shift()).abs()
                tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
                atr = tr.rolling(window=14).mean().iloc[-1]

                stop_loss_price = entry_price - (atr * 2)
                stop_loss_pct = ((stop_loss_price - entry_price) / entry_price) * 100

                if latest_price <= stop_loss_price:
                    self.logger.info(f"🛑 {ticker}: 動的ストップロス発動 ({stop_loss_pct:.1f}%)")
                    signals.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "confidence": 1.0,
                            "price": latest_price,
                            "quantity": quantity,
                            "strategy": "Dynamic Stop-Loss",
                            "reason": f"ATRベース損切り ({unrealized_pct:.1f}%)",
                        }
                    )
                    continue

                if unrealized_pct >= 5.0:
                    recent_high = df["High"].tail(20).max()
                    trailing_stop_price = recent_high * 0.97

                    if latest_price <= trailing_stop_price:
                        self.logger.info(f"📈 {ticker}: トレーリングストップ発動 (利益確定 +{unrealized_pct:.1f}%)")
                        signals.append(
                            {
                                "ticker": ticker,
                                "action": "SELL",
                                "confidence": 1.0,
                                "price": latest_price,
                                "quantity": quantity,
                                "strategy": "Trailing Stop",
                                "reason": f"利益確定 (+{unrealized_pct:.1f}%)",
                            }
                        )
                        continue

                if unrealized_pct >= 20.0:
                    self.logger.info(f"🎯 {ticker}: 目標利益達成 (+{unrealized_pct:.1f}%)")
                    signals.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "confidence": 1.0,
                            "price": latest_price,
                            "quantity": quantity,
                            "strategy": "Target Profit",
                            "reason": f"目標利益達成 (+{unrealized_pct:.1f}%)",
                        }
                    )

        return signals
