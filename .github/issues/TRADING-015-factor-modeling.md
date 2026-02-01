---
title: ファクターモデリングとリスクプレミアム分析の実装
labels: enhancement, quantitative-research, priority:medium
---

## 説明

### 問題
現在のシステムには、ファクターモデリング（Fama-French、Carhartなど）やリスクプレミアム分析の機能がありません。これにより、リターンの源泉を体系的に分析したり、リスク調整後のパフォーマンスを評価することができません。

### 影響
- ポートフォリオのリターン源泉を特定できない
- リスクファクターのエクスポージャーを管理できない
- スタイル分析ができない
- リスクプレミアムを活用した戦略を構築できない

### 推奨される解決策

#### 1. Fama-French 5ファクターモデル
```python
# backend/src/quant/factor_models.py
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from typing import Dict, List, Tuple

class FamaFrench5Factor:
    """Fama-French 5ファクターモデル実装"""
    
    def __init__(self):
        self.factors = ['MKT', 'SMB', 'HML', 'RMW', 'CMA']
        self.model = LinearRegression()
        self.factor_returns = None
        self.factor_loadings = None
    
    def calculate_factor_returns(self, stock_returns: pd.DataFrame,
                                 market_caps: pd.DataFrame,
                                 book_to_market: pd.DataFrame,
                                 operating_profitability: pd.DataFrame,
                                 asset_growth: pd.DataFrame) -> pd.DataFrame:
        """ファクターリターンを計算"""
        
        # 1. Market Factor (MKT)
        market_return = stock_returns.mean(axis=1)
        risk_free_rate = self._get_risk_free_rate()
        mkt_factor = market_return - risk_free_rate
        
        # 2. Size Factor (SMB - Small Minus Big)
        smb_factor = self._calculate_size_factor(stock_returns, market_caps)
        
        # 3. Value Factor (HML - High Minus Low)
        hml_factor = self._calculate_value_factor(stock_returns, book_to_market)
        
        # 4. Profitability Factor (RMW - Robust Minus Weak)
        rmw_factor = self._calculate_profitability_factor(stock_returns, operating_profitability)
        
        # 5. Investment Factor (CMA - Conservative Minus Aggressive)
        cma_factor = self._calculate_investment_factor(stock_returns, asset_growth)
        
        factor_returns = pd.DataFrame({
            'MKT': mkt_factor,
            'SMB': smb_factor,
            'HML': hml_factor,
            'RMW': rmw_factor,
            'CMA': cma_factor
        })
        
        return factor_returns
    
    def _calculate_size_factor(self, returns: pd.DataFrame, 
                               market_caps: pd.DataFrame) -> pd.Series:
        """サイズファクターを計算"""
        # 各時点でサイズでソート
        size_ranks = market_caps.rank(axis=1, pct=True)
        
        small_mask = size_ranks <= 0.5
        big_mask = size_ranks > 0.5
        
        small_returns = returns[small_mask].mean(axis=1)
        big_returns = returns[big_mask].mean(axis=1)
        
        return small_returns - big_returns
    
    def _calculate_value_factor(self, returns: pd.DataFrame,
                                book_to_market: pd.DataFrame) -> pd.Series:
        """バリューファクターを計算"""
        # B/Mでソート
        value_ranks = book_to_market.rank(axis=1, pct=True)
        
        value_mask = value_ranks >= 0.7  # High B/M
        growth_mask = value_ranks <= 0.3  # Low B/M
        
        value_returns = returns[value_mask].mean(axis=1)
        growth_returns = returns[growth_mask].mean(axis=1)
        
        return value_returns - growth_returns
    
    def estimate_factor_loadings(self, stock_returns: pd.Series,
                                  factor_returns: pd.DataFrame) -> Dict:
        """個別銘柄のファクターローディングを推定"""
        # リターンをアライメント
        aligned_data = pd.concat([stock_returns, factor_returns], axis=1).dropna()
        
        y = aligned_data.iloc[:, 0]  # 銘柄リターン
        X = aligned_data.iloc[:, 1:]  # ファクターリターン
        
        # 回帰分析
        self.model.fit(X, y)
        
        # 結果を格納
        loadings = {
            'alpha': self.model.intercept_,
            'MKT': self.model.coef_[0],
            'SMB': self.model.coef_[1],
            'HML': self.model.coef_[2],
            'RMW': self.model.coef_[3],
            'CMA': self.model.coef_[4],
            'r_squared': self.model.score(X, y)
        }
        
        return loadings
```

#### 2. リスクプレミアム分析
```python
class RiskPremiumAnalyzer:
    """リスクプレミアム分析"""
    
    def __init__(self):
        self.risk_premiums = {}
        self.factor_models = {}
    
    def calculate_historical_premiums(self, factor_returns: pd.DataFrame,
                                      risk_free_rate: pd.Series) -> Dict:
        """歴史的リスクプレミアムを計算"""
        premiums = {}
        
        for factor in factor_returns.columns:
            excess_return = factor_returns[factor] - risk_free_rate
            
            premiums[factor] = {
                'mean_annual': excess_return.mean() * 252,
                'volatility_annual': excess_return.std() * np.sqrt(252),
                'sharpe_ratio': (excess_return.mean() * 252) / (excess_return.std() * np.sqrt(252)),
                't_statistic': self._calculate_t_stat(excess_return),
                'significance': self._test_significance(excess_return)
            }
        
        return premiums
    
    def analyze_factor_timing(self, factor_returns: pd.DataFrame,
                              macro_indicators: pd.DataFrame) -> Dict:
        """マクロ指標に基づくファクタータイミング分析"""
        timing_signals = {}
        
        for factor in factor_returns.columns:
            # 各マクロ指標との相関を分析
            correlations = {}
            for indicator in macro_indicators.columns:
                corr = factor_returns[factor].corr(macro_indicators[indicator])
                correlations[indicator] = corr
            
            # タイミングシグナルを生成
            timing_signals[factor] = {
                'correlations': correlations,
                'regime_sensitivity': self._analyze_regime_sensitivity(
                    factor_returns[factor], macro_indicators
                ),
                'timing_score': self._calculate_timing_score(correlations)
            }
        
        return timing_signals
    
    def construct_factor_portfolio(self, target_exposures: Dict,
                                   stock_universe: List[str]) -> Dict:
        """目標ファクターエクスポージャーに基づくポートフォリオ構築"""
        # 最適化問題を設定
        # min || w' * loadings - target ||^2 + lambda * risk_penalty
        
        # 各銘柄のファクターローディングを取得
        stock_loadings = self._get_stock_loadings(stock_universe)
        
        # 最適化を実行
        optimal_weights = self._optimize_factor_exposure(
            stock_loadings, target_exposures
        )
        
        return {
            'weights': optimal_weights,
            'expected_exposures': self._calculate_portfolio_exposures(
                optimal_weights, stock_loadings
            ),
            'tracking_error': self._estimate_tracking_error(
                optimal_weights, target_exposures
            )
        }
```

#### 3. スタイル分析
```python
class StyleAnalyzer:
    """ポートフォリオスタイル分析"""
    
    def __init__(self):
        self.style_indices = {
            'large_growth': None,
            'large_value': None,
            'small_growth': None,
            'small_value': None,
            'mid_cap': None
        }
    
    def perform_returns_based_style_analysis(self, portfolio_returns: pd.Series,
                                             style_indices: pd.DataFrame) -> Dict:
        """リターンベースのスタイル分析（Sharpe, 1992）"""
        # 制約付き回帰（重みの合計=1、各重み>=0）
        from scipy.optimize import minimize
        
        def objective(weights):
            portfolio_style = style_indices @ weights
            tracking_error = portfolio_returns - portfolio_style
            return np.sum(tracking_error ** 2)
        
        constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
        bounds = [(0, 1) for _ in style_indices.columns]
        initial_guess = np.ones(len(style_indices.columns)) / len(style_indices.columns)
        
        result = minimize(objective, initial_guess, method='SLSQP',
                         bounds=bounds, constraints=constraints)
        
        style_weights = dict(zip(style_indices.columns, result.x))
        
        # スタイルリターンと選択リターンを分離
        style_return = style_indices @ result.x
        selection_return = portfolio_returns - style_return
        
        return {
            'style_weights': style_weights,
            'style_return_annual': style_return.mean() * 252,
            'selection_return_annual': selection_return.mean() * 252,
            'r_squared': 1 - result.fun / np.sum((portfolio_returns - portfolio_returns.mean()) ** 2),
            'tracking_error': np.sqrt(result.fun / len(portfolio_returns)) * np.sqrt(252)
        }
```

### 実装タスク
- [ ] Fama-French 5ファクターモデルの実装
- [ ] Carhart 4ファクターモデルの実装
- [ ] リスクプレミアム計算の実装
- [ ] ファクタータイミング分析の実装
- [ ] スタイル分析の実装
- [ ] ファクターポートフォリオ構築の実装
- [ ] バックテスト機能の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/quant/factor_models.py` (新規ファイル)
- `backend/src/quant/risk_premium.py` (新規ファイル)
- `backend/src/quant/style_analysis.py` (新規ファイル)
- `backend/tests/test_factor_models.py` (新規ファイル)

### 優先度
中 - 機関投資家レベルの分析に必要

### 複雑度
高

### 見積もり時間
4週間
