"""
Options Strategy & Risk Hedging
ブラック・ショールズ・モデルによるオプション価格計算とヘッジ助言
"""

import math
import logging
from typing import Dict, Any

from scipy.stats import norm

logger = logging.getLogger(__name__)


class OptionsEngine:
    """
    オプション価格の計算とポートフォリオヘッジの算定
    """

    def __init__(self, risk_free_rate: float = 0.001):
        self.r = risk_free_rate  # 無リスク金利（デフォルト0.1%）

    def black_scholes(self, S: float, K: float, T: float, sigma: float, option_type: str = "put") -> Dict[str, float]:
        """
        ブラック・ショールズ・モデルによる価格とデルタの計算

        Args:
            S: 現資産価格
            K: 行使価格
            T: 満期までの期間（年単位）
            sigma: ボラティリティ（年率）
            option_type: "call" or "put"
        """
        if T <= 0:
            return {
                "price": max(0.0, (K - S) if option_type == "put" else (S - K)),
                "delta": 0.0,
            }

        d1 = (math.log(S / K) + (self.r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)

        if option_type == "put":
            price = K * math.exp(-self.r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
            delta = norm.cdf(d1) - 1
        else:
            price = S * norm.cdf(d1) - K * math.exp(-self.r * T) * norm.cdf(d2)
            delta = norm.cdf(d1)

        return {
            "price": price,
            "delta": delta,
            "gamma": norm.pdf(d1) / (S * sigma * math.sqrt(T)),
            "vega": S * norm.pdf(d1) * math.sqrt(T),
            "theta": -(S * norm.pdf(d1) * sigma) / (2 * math.sqrt(T))
            - self.r * K * math.exp(-self.r * T) * norm.cdf(d2 if option_type == "call" else -d2),
        }

    def get_hedge_advice(self, portfolio: Dict[str, Any], market_vix: float = 20.0) -> Dict[str, Any]:
        """
        ポートフォリオに対するプットオプションによるヘッジ助言

        Args:
            portfolio: {"equity": 総評価額, "positions": [...]}
            market_vix: 市場のボラティリティ（VIX）
        """
        total_equity = portfolio.get("equity", 1000000)
        vix_decimal = market_vix / 100.0

        # ターゲット：5%の下落から保護するプット（OTM 5%）
        S = 1.0  # 正規化
        K = 0.95
        T = 30 / 365  # 30日満期
        sigma = vix_decimal

        bs_res = self.black_scholes(S, K, T, sigma, "put")
        put_price_pct = bs_res["price"]
        put_delta = bs_res["delta"]

        # 必要なプット枚数の概算（デルタヘッジに基づく）
        # 完全ヘッジ(Delta=0)にするには: Portfolio_Delta + N * Put_Delta = 0
        # 簡易的にポートフォリオのデルタを1.0とする（全て株式）
        1.0 / abs(put_delta)

        cost_to_hedge = total_equity * put_price_pct

        return {
            "status": "CAUTION" if market_vix > 25 else "NORMAL",
            "vix": market_vix,
            "hedge_cost_estimate": cost_to_hedge,
            "hedge_cost_pct": put_price_pct * 100,
            "recommended_strike_pct": 95,
            "expiry_days": 30,
            "put_delta": put_delta,
            "advice": self._generate_advice_text(market_vix, cost_to_hedge, put_price_pct),
        }

    def _generate_advice_text(self, vix: float, cost: float, cost_pct: float) -> str:
        if vix > 30:
            return f"市場のボラティリティが非常に高まっています({vix:.1f})。ポートフォリオの約{cost_pct:.1f}%のコストでプットオプションによるヘッジを強く推奨します。"
        elif vix > 20:
            return "ボラティリティが上昇傾向にあります。念のため、一部ポジションの利確またはプットオプションでの保険を検討してください。"
        else:
            return "市場は比較的穏やかです。ヘッジコストは安価ですが、現時点では強いヘッジは不要と考えられます。"


if __name__ == "__main__":
    # Test
    engine = OptionsEngine()
    # S=100, K=95, T=1 month, Vol=20%
    res = engine.black_scholes(100, 95, 1 / 12, 0.2, "put")
    print(f"Put Price: {res['price']:.2f}, Delta: {res['delta']:.2f}")

    advice = engine.get_hedge_advice({"equity": 10000000}, 25.0)
    print(f"Hedge Advice: {advice['advice']}")
