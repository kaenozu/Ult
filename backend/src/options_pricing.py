"""
Options Pricing - オプション価格計算
Black-Scholesモデル、Greeks計算
"""

from dataclasses import dataclass
from typing import Dict

import numpy as np
from scipy.stats import norm


@dataclass
class OptionContract:
    """オプション契約"""

    ticker: str
    strike: float
    expiry_days: int
    option_type: str  # 'call' or 'put'
    spot_price: float
    volatility: float
    risk_free_rate: float = 0.01


class OptionsCalculator:
    """オプション計算クラス"""

    @staticmethod
    def black_scholes(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call") -> float:
        """
        Black-Scholesモデル

        Args:
            S: 現在価格
            K: 行使価格
            T: 満期までの時間（年）
            r: リスクフリーレート
            sigma: ボラティリティ
            option_type: 'call' or 'put'

        Returns:
            オプション価格
        """
        if T <= 0:
            # 満期時の価値
            if option_type == "call":
                return max(0, S - K)
            else:
                return max(0, K - S)

        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)

        if option_type == "call":
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:  # put
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

        return price

    @staticmethod
    def calculate_greeks(
        S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call"
    ) -> Dict[str, float]:
        """
        Greeks計算

        Returns:
            Delta, Gamma, Theta, Vega, Rho
        """
        if T <= 0:
            return {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}

        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)

        # Delta
        if option_type == "call":
            delta = norm.cdf(d1)
        else:
            delta = norm.cdf(d1) - 1

        # Gamma
        gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))

        # Theta
        if option_type == "call":
            theta = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm.cdf(d2)
        else:
            theta = -(S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm.cdf(-d2)

        # Vega
        vega = S * norm.pdf(d1) * np.sqrt(T)

        # Rho
        if option_type == "call":
            rho = K * T * np.exp(-r * T) * norm.cdf(d2)
        else:
            rho = -K * T * np.exp(-r * T) * norm.cdf(-d2)

        return {
            "delta": delta,
            "gamma": gamma,
            "theta": theta / 365,  # 1日あたり
            "vega": vega / 100,  # 1%あたり
            "rho": rho / 100,  # 1%あたり
        }

    @staticmethod
    def implied_volatility(
        option_price: float,
        S: float,
        K: float,
        T: float,
        r: float,
        option_type: str = "call",
        max_iterations: int = 100,
        tolerance: float = 1e-5,
    ) -> float:
        """
        インプライドボラティリティ計算（Newton-Raphson法）

        Args:
            option_price: 市場価格
            S: 現在価格
            K: 行使価格
            T: 満期までの時間
            r: リスクフリーレート
            option_type: 'call' or 'put'

        Returns:
            インプライドボラティリティ
        """
        sigma = 0.3  # 初期値

        for i in range(max_iterations):
            price = OptionsCalculator.black_scholes(S, K, T, r, sigma, option_type)
            vega = OptionsCalculator.calculate_greeks(S, K, T, r, sigma, option_type)["vega"] * 100

            diff = option_price - price

            if abs(diff) < tolerance:
                return sigma

            if vega == 0:
                break

            sigma = sigma + diff / vega

            # 範囲制限
            sigma = max(0.01, min(sigma, 5.0))

        return sigma


class OptionStrategy:
    """オプション戦略"""

    @staticmethod
    def covered_call(stock_price: float, stock_quantity: int, call_strike: float, call_premium: float) -> Dict:
        """
        カバードコール戦略

        Args:
            stock_price: 株価
            stock_quantity: 保有株数
            call_strike: コール行使価格
            call_premium: コールプレミアム

        Returns:
            戦略詳細
        """
        max_profit = (call_strike - stock_price) * stock_quantity + call_premium * stock_quantity
        max_loss = stock_price * stock_quantity - call_premium * stock_quantity
        breakeven = stock_price - call_premium

        return {
            "strategy": "Covered Call",
            "max_profit": max_profit,
            "max_loss": max_loss,
            "breakeven": breakeven,
            "description": f"株価が{call_strike}円以上で最大利益、下落リスクはプレミアム分軽減",
        }

    @staticmethod
    def protective_put(stock_price: float, stock_quantity: int, put_strike: float, put_premium: float) -> Dict:
        """
        プロテクティブプット戦略

        Args:
            stock_price: 株価
            stock_quantity: 保有株数
            put_strike: プット行使価格
            put_premium: プットプレミアム

        Returns:
            戦略詳細
        """
        max_loss = (stock_price - put_strike) * stock_quantity + put_premium * stock_quantity
        breakeven = stock_price + put_premium

        return {
            "strategy": "Protective Put",
            "max_profit": float("inf"),
            "max_loss": max_loss,
            "breakeven": breakeven,
            "description": f"下落リスクを{put_strike}円で限定、上昇は無限",
        }

    @staticmethod
    def straddle(strike: float, call_premium: float, put_premium: float) -> Dict:
        """
        ストラドル戦略

        Args:
            strike: 行使価格
            call_premium: コールプレミアム
            put_premium: プットプレミアム

        Returns:
            戦略詳細
        """
        total_premium = call_premium + put_premium
        upper_breakeven = strike + total_premium
        lower_breakeven = strike - total_premium

        return {
            "strategy": "Long Straddle",
            "max_profit": float("inf"),
            "max_loss": total_premium,
            "upper_breakeven": upper_breakeven,
            "lower_breakeven": lower_breakeven,
            "description": f"大きな価格変動で利益、{lower_breakeven}円〜{upper_breakeven}円で損失",
        }


if __name__ == "__main__":
    # テスト
    calc = OptionsCalculator()

    # Black-Scholes
    price = calc.black_scholes(
        S=1500,
        K=1550,
        T=30 / 365,
        r=0.01,
        sigma=0.25,
        option_type="call",  # 現在価格  # 行使価格  # 30日  # 1%  # 25%
    )
    print(f"コールオプション価格: ¥{price:.2f}")

    # Greeks
    greeks = calc.calculate_greeks(1500, 1550, 30 / 365, 0.01, 0.25, "call")
    print(f"Delta: {greeks['delta']:.4f}")
    print(f"Gamma: {greeks['gamma']:.4f}")
    print(f"Theta: {greeks['theta']:.4f}")
    print(f"Vega: {greeks['vega']:.4f}")

    # カバードコール
    strategy = OptionStrategy.covered_call(1500, 100, 1550, 30)
    print("\nカバードコール:")
    print(f"最大利益: ¥{strategy['max_profit']:,.0f}")
    print(f"損益分岐点: ¥{strategy['breakeven']:,.0f}")
