"""決算カレンダー連携モジュール

決算発表前のポジション自動調整でサプライズリスクを回避
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class EarningsCalendar:
    """決算カレンダー管理クラス"""

    def __init__(self, lookforward_days: int = 14):
        """初期化

        Args:
            lookforward_days: 先読み日数（デフォルト14日）
        """
        self.lookforward_days = lookforward_days
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl = timedelta(hours=6)

    def get_upcoming_earnings(self, tickers: List[str]) -> pd.DataFrame:
        """指定銘柄の今後の決算発表日を取得

        Args:
            tickers: 銘柄リスト

        Returns:
            決算発表日のDataFrame
        """
        results = []
        now = datetime.now()

        for ticker in tickers:
            try:
                earnings_date = self._get_earnings_date(ticker)
                if earnings_date:
                    days_until = (earnings_date - now).days
                    if 0 <= days_until <= self.lookforward_days:
                        results.append(
                            {
                                "ticker": ticker,
                                "earnings_date": earnings_date,
                                "days_until": days_until,
                                "risk_level": self._calculate_risk_level(days_until),
                            }
                        )
            except Exception as e:
                logger.warning(f"Failed to get earnings for {ticker}: {e}")
                continue

        df = pd.DataFrame(results)
        if not df.empty:
            df = df.sort_values("days_until")
        return df

    def _get_earnings_date(self, ticker: str) -> Optional[datetime]:
        """単一銘柄の決算日を取得（キャッシュ付き）"""
        # キャッシュチェック
        if self._is_cache_valid() and ticker in self._cache:
            return self._cache[ticker].get("earnings_date")

        try:
            stock = yf.Ticker(ticker)
            calendar = stock.calendar

            if calendar is not None and not calendar.empty:
                # calendar can be a DataFrame or dict depending on yfinance version
                if isinstance(calendar, pd.DataFrame):
                    if "Earnings Date" in calendar.columns:
                        dates = calendar["Earnings Date"].dropna()
                        if len(dates) > 0:
                            earnings_date = pd.to_datetime(dates.iloc[0])
                            self._update_cache(ticker, earnings_date)
                            return earnings_date.to_pydatetime()
                elif isinstance(calendar, dict):
                    if "Earnings Date" in calendar:
                        dates = calendar["Earnings Date"]
                        if dates:
                            earnings_date = pd.to_datetime(dates[0])
                            self._update_cache(ticker, earnings_date)
                            return earnings_date.to_pydatetime()
        except Exception as e:
            logger.debug(f"Calendar fetch failed for {ticker}: {e}")

        return None

    def _is_cache_valid(self) -> bool:
        """キャッシュが有効かチェック"""
        if self._cache_timestamp is None:
            return False
        return datetime.now() - self._cache_timestamp < self._cache_ttl

    def _update_cache(self, ticker: str, earnings_date: datetime):
        """キャッシュを更新"""
        self._cache[ticker] = {"earnings_date": earnings_date}
        self._cache_timestamp = datetime.now()

    def _calculate_risk_level(self, days_until: int) -> str:
        """決算までの日数からリスクレベルを算出"""
        if days_until <= 2:
            return "CRITICAL"
        elif days_until <= 5:
            return "HIGH"
        elif days_until <= 10:
            return "MEDIUM"
        else:
            return "LOW"

    def should_reduce_position(self, ticker: str, current_weight: float) -> Tuple[bool, float, str]:
        """ポジション縮小が必要か判断

        Args:
            ticker: 銘柄コード
            current_weight: 現在のポートフォリオ比率

        Returns:
            (縮小必要か, 推奨比率, 理由)
        """
        earnings_date = self._get_earnings_date(ticker)
        if not earnings_date:
            return False, current_weight, "No earnings date found"

        days_until = (earnings_date - datetime.now()).days

        if days_until < 0:
            return False, current_weight, "Earnings already passed"

        risk_level = self._calculate_risk_level(days_until)

        # リスクレベルに応じた推奨比率
        reduction_map = {
            "CRITICAL": 0.25,  # 75%削減
            "HIGH": 0.5,  # 50%削減
            "MEDIUM": 0.75,  # 25%削減
            "LOW": 1.0,  # 削減なし
        }

        multiplier = reduction_map.get(risk_level, 1.0)
        recommended_weight = current_weight * multiplier

        if multiplier < 1.0:
            reason = f"Earnings in {days_until} days ({risk_level} risk)"
            return True, recommended_weight, reason

        return False, current_weight, "No reduction needed"

    def get_earnings_risk_summary(self, portfolio: Dict[str, float]) -> Dict[str, Any]:
        """ポートフォリオ全体の決算リスクサマリーを取得

        Args:
            portfolio: {ticker: weight} の辞書

        Returns:
            リスクサマリー辞書
        """
        tickers = list(portfolio.keys())
        upcoming = self.get_upcoming_earnings(tickers)

        if upcoming.empty:
            return {
                "total_risk_exposure": 0.0,
                "critical_tickers": [],
                "high_risk_tickers": [],
                "recommendations": [],
            }

        critical = upcoming[upcoming["risk_level"] == "CRITICAL"]["ticker"].tolist()
        high = upcoming[upcoming["risk_level"] == "HIGH"]["ticker"].tolist()

        # リスクエクスポージャー計算
        risk_weights = {
            "CRITICAL": 1.0,
            "HIGH": 0.7,
            "MEDIUM": 0.3,
            "LOW": 0.1,
        }

        total_risk = 0.0
        recommendations = []

        for _, row in upcoming.iterrows():
            ticker = row["ticker"]
            weight = portfolio.get(ticker, 0)
            risk_level = row["risk_level"]
            total_risk += weight * risk_weights.get(risk_level, 0)

            if risk_level in ["CRITICAL", "HIGH"]:
                should_reduce, new_weight, reason = self.should_reduce_position(ticker, weight)
                if should_reduce:
                    recommendations.append(
                        {
                            "ticker": ticker,
                            "action": "REDUCE",
                            "current_weight": weight,
                            "recommended_weight": new_weight,
                            "reason": reason,
                        }
                    )

        return {
            "total_risk_exposure": total_risk,
            "critical_tickers": critical,
            "high_risk_tickers": high,
            "upcoming_earnings": upcoming.to_dict("records"),
            "recommendations": recommendations,
        }


# シングルトンインスタンス
_calendar_instance: Optional[EarningsCalendar] = None


def get_earnings_calendar() -> EarningsCalendar:
    """EarningsCalendarのシングルトンインスタンスを取得"""
    global _calendar_instance
    if _calendar_instance is None:
        _calendar_instance = EarningsCalendar()
    return _calendar_instance
