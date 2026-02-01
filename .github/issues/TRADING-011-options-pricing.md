---
title: オプション価格モデルの実装（ブラック・ショールズ、バイナリー）
labels: enhancement, derivatives, priority:high
---

## 説明

### 問題
現在のシステムには、オプション価格計算とギリシャス（Greeks）計算の機能がありません。これにより、オプション戦略の構築、リスク管理、プライシングができません。

### 影響
- オプション取引戦略を構築できない
- オプションポジションのリスクを正確に評価できない
- インプライドボラティリティを計算できない
- ヘッジ戦略を最適化できない

### 推奨される解決策

#### 1. ブラック・ショールズモデル
```python
# backend/src/derivatives/black_scholes.py
import numpy as np
from scipy.stats import norm

class BlackScholesModel:
    def __init__(self, S: float, K: float, T: float, r: float, sigma: float):
        """
        Args:
            S: 現在の株価
            K: 行使価格
            T: 満期までの時間（年）
            r: 無リスク金利
            sigma: ボラティリティ
        """
        self.S = S
        self.K = K
        self.T = T
        self.r = r
        self.sigma = sigma
        self.d1 = self._calculate_d1()
        self.d2 = self._calculate_d2()
    
    def _calculate_d1(self) -> float:
        """d1パラメータを計算"""
        return (np.log(self.S / self.K) + (self.r + 0.5 * self.sigma ** 2) * self.T) / (self.sigma * np.sqrt(self.T))
    
    def _calculate_d2(self) -> float:
        """d2パラメータを計算"""
        return self.d1 - self.sigma * np.sqrt(self.T)
    
    def call_price(self) -> float:
        """コールオプション価格を計算"""
        return self.S * norm.cdf(self.d1) - self.K * np.exp(-self.r * self.T) * norm.cdf(self.d2)
    
    def put_price(self) -> float:
        """プットオプション価格を計算"""
        return self.K * np.exp(-self.r * self.T) * norm.cdf(-self.d2) - self.S * norm.cdf(-self.d1)
    
    def calculate_greeks(self) -> Dict:
        """ギリシャスを計算"""
        return {
            'delta': self._delta(),
            'gamma': self._gamma(),
            'theta': self._theta(),
            'vega': self._vega(),
            'rho': self._rho()
        }
    
    def _delta(self) -> Dict:
        """Delta（原資産価格に対する感応度）"""
        return {
            'call': norm.cdf(self.d1),
            'put': norm.cdf(self.d1) - 1
        }
    
    def _gamma(self) -> float:
        """Gamma（Deltaの変化率）"""
        return norm.pdf(self.d1) / (self.S * self.sigma * np.sqrt(self.T))
    
    def _theta(self) -> Dict:
        """Theta（時間経過による価値減少）"""
        theta_call = (-self.S * norm.pdf(self.d1) * self.sigma / (2 * np.sqrt(self.T)) 
                      - self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(self.d2))
        theta_put = (-self.S * norm.pdf(self.d1) * self.sigma / (2 * np.sqrt(self.T)) 
                     + self.r * self.K * np.exp(-self.r * self.T) * norm.cdf(-self.d2))
        return {
            'call': theta_call,
            'put': theta_put
        }
    
    def _vega(self) -> float:
        """Vega（ボラティリティに対する感応度）"""
        return self.S * norm.pdf(self.d1) * np.sqrt(self.T)
    
    def _rho(self) -> Dict:
        """Rho（金利に対する感応度）"""
        rho_call = self.K * self.T * np.exp(-self.r * self.T) * norm.cdf(self.d2)
        rho_put = -self.K * self.T * np.exp(-self.r * self.T) * norm.cdf(-self.d2)
        return {
            'call': rho_call,
            'put': rho_put
        }
```

#### 2. バイナリーオプションモデル
```python
# backend/src/derivatives/binary_options.py
class BinaryOptionModel:
    def __init__(self, S: float, K: float, T: float, r: float, sigma: float):
        self.S = S
        self.K = K
        self.T = T
        self.r = r
        self.sigma = sigma
        self.d1 = self._calculate_d1()
        self.d2 = self._calculate_d2()
    
    def _calculate_d1(self) -> float:
        return (np.log(self.S / self.K) + (self.r + 0.5 * self.sigma ** 2) * self.T) / (self.sigma * np.sqrt(self.T))
    
    def _calculate_d2(self) -> float:
        return self.d1 - self.sigma * np.sqrt(self.T)
    
    def cash_or_nothing_call(self, payout: float = 1.0) -> float:
        """キャッシュ・オア・ナッシング・コール"""
        return payout * np.exp(-self.r * self.T) * norm.cdf(self.d2)
    
    def cash_or_nothing_put(self, payout: float = 1.0) -> float:
        """キャッシュ・オア・ナッシング・プット"""
        return payout * np.exp(-self.r * self.T) * norm.cdf(-self.d2)
    
    def asset_or_nothing_call(self) -> float:
        """アセット・オア・ナッシング・コール"""
        return self.S * norm.cdf(self.d1)
    
    def asset_or_nothing_put(self) -> float:
        """アセット・オア・ナッシング・プット"""
        return self.S * norm.cdf(-self.d1)
```

#### 3. インプライドボラティリティ計算
```python
# backend/src/derivatives/implied_volatility.py
from scipy.optimize import brentq

class ImpliedVolatilityCalculator:
    def __init__(self):
        self.bs_model = None
    
    def calculate_implied_volatility(self, S: float, K: float, T: float, 
                                     r: float, market_price: float, 
                                     option_type: str = 'call') -> float:
        """インプライドボラティリティを計算"""
        def objective(sigma):
            bs = BlackScholesModel(S, K, T, r, sigma)
            if option_type == 'call':
                return bs.call_price() - market_price
            else:
                return bs.put_price() - market_price
        
        try:
            # ブラケットを設定してBrent法で解を探索
            implied_vol = brentq(objective, 0.001, 5.0)
            return implied_vol
        except ValueError:
            return None
    
    def calculate_iv_surface(self, strikes: List[float], maturities: List[float],
                             market_prices: Dict) -> Dict:
        """ボラティリティサーフェスを計算"""
        iv_surface = {}
        
        for maturity in maturities:
            iv_surface[maturity] = {}
            for strike in strikes:
                key = (maturity, strike)
                if key in market_prices:
                    iv = self.calculate_implied_volatility(
                        market_prices[key]['S'],
                        strike,
                        maturity,
                        market_prices[key]['r'],
                        market_prices[key]['price'],
                        market_prices[key]['type']
                    )
                    iv_surface[maturity][strike] = iv
        
        return iv_surface
```

### 実装タスク
- [ ] ブラック・ショールズモデルの実装
- [ ] ギリシャス計算の実装
- [ ] バイナリーオプションモデルの実装
- [ ] インプライドボラティリティ計算の実装
- [ ] ボラティリティサーフェス分析の実装
- [ ] オプション戦略ビルダーの実装
- [ ] オプションリスク管理の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/derivatives/black_scholes.py` (新規ファイル)
- `backend/src/derivatives/binary_options.py` (新規ファイル)
- `backend/src/derivatives/implied_volatility.py` (新規ファイル)
- `backend/src/derivatives/models.py` (新規ファイル)
- `backend/tests/test_options_pricing.py` (新規ファイル)

### 優先度
高 - オプション取引には必須の機能

### 複雑度
高

### 見積もり時間
3-4週間
