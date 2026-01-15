from typing import Dict, List

from src.constants import CRYPTO_PAIRS, FX_PAIRS, NIKKEI_225_TICKERS, SP500_TICKERS, STOXX50_TICKERS
from src.data_loader import fetch_fundamental_data


class AssetSelector:
    """
    ポートフォリオバランスに基づいて対象銘柄を選定し、フィルタリングする機能を提供します。
    """

    def __init__(self, config: dict, paper_trader, logger):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.asset_config = self.config.get(
            "assets", {"japan_stocks": True, "us_stocks": True, "europe_stocks": True, "crypto": False, "fx": False}
        )
        # ポートフォリオ配分目標
        portfolio_targets = self.config.get(
            "portfolio_targets", {"japan": 40, "us": 30, "europe": 10, "crypto": 10, "fx": 10}
        )
        self.target_japan_pct = portfolio_targets.get("japan", 40)
        self.target_us_pct = portfolio_targets.get("us", 30)
        self.target_europe_pct = portfolio_targets.get("europe", 10)
        self.target_crypto_pct = portfolio_targets.get("crypto", 10)
        self.target_fx_pct = portfolio_targets.get("fx", 10)

        self.allow_small_mid_cap = True  # FullyAutomatedTraderから引き継ぎ

    def get_target_tickers(self) -> List[str]:
        """ポートフォリオバランスに基づいて対象銘柄を返す"""
        positions = self.pt.get_positions()
        balance = self.pt.get_current_balance()

        # 現在の地域別比率計算
        japan_value = 0
        us_value = 0
        europe_value = 0
        crypto_value = 0
        fx_value = 0

        for _, pos in positions.iterrows():
            ticker = pos["ticker"]
            value = pos.get("market_value", pos["quantity"] * pos["current_price"])

            if ticker in CRYPTO_PAIRS:
                crypto_value += value
            elif ticker in FX_PAIRS:
                fx_value += value
            elif ticker in NIKKEI_225_TICKERS:
                japan_value += value
            elif ticker in SP500_TICKERS:
                us_value += value
            else:
                europe_value += value

        total_value = float(balance.get("total_equity", 0))

        if total_value > 0:
            japan_pct = (japan_value / total_value) * 100
            us_pct = (us_value / total_value) * 100
            europe_pct = (europe_value / total_value) * 100
            crypto_pct = (crypto_value / total_value) * 100
            fx_pct = (fx_value / total_value) * 100
        else:
            japan_pct = us_pct = europe_pct = crypto_pct = fx_pct = 0

        self.logger.info(
            f"現在の資産配分: 日本{japan_pct:.1f}% 米国{us_pct:.1f}% 欧州{europe_pct:.1f}% Crypto{crypto_pct:.1f}% FX{fx_pct:.1f}%"
        )

        # 目標との差分を計算し、優先的にスキャンする地域を決定
        tickers = []

        # 日本株
        if self.asset_config.get("japan_stocks", True):
            japan_count = 30 if japan_pct < self.target_japan_pct else 15
            tickers.extend(NIKKEI_225_TICKERS[:japan_count])

        # 米国株
        if self.asset_config.get("us_stocks", True):
            us_count = 20 if us_pct < self.target_us_pct else 10
            tickers.extend(SP500_TICKERS[:us_count])

        # 欧州株
        if self.asset_config.get("europe_stocks", True):
            europe_count = 10 if europe_pct < self.target_europe_pct else 5
            tickers.extend(STOXX50_TICKERS[:europe_count])

        # 暗号資産
        if self.asset_config.get("crypto", False):
            tickers.extend(CRYPTO_PAIRS)

        # FX
        if self.asset_config.get("fx", False):
            tickers.extend(FX_PAIRS)

        return tickers

    def filter_by_market_cap(self, ticker: str, fundamentals: dict) -> bool:
        """時価総額で銘柄をフィルタリング（中小型株も許可）"""
        if not self.allow_small_mid_cap:
            return True  # フィルタなし

        market_cap = fundamentals.get("marketCap", 0)

        # 0円の場合はデータ取得失敗なので許可
        if market_cap == 0:
            return True

        # 10億円以上なら許可（極小型株は除外）
        if market_cap >= 1_000_000_000:
            return True

        return False
