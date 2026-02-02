---
title: リアルなバックテスト環境と戦略最適化
labels: enhancement, backtesting, priority:high, winning-edge
---

## 説明

### 問題
現在のバックテストシステムには以下の問題があります：

1. **過去最適化の問題**：ヒストリカルデータに過度に適合した戦略が生成される
2. **現実的でない仮定**：スリッページ、手数料、市場インパクトが適切に考慮されていない
3. **サンプリングバイアス**：生存バイアス、先行情報バイアスがある
4. **パラメータ過剰最適化**：多くのパラメータを最適化しすぎて、将来のパフォーマンスが悪い
5. **ウォークフォワード分析不在**：データの期間分割検証が不十分

### 影響
- バックテストでは素晴らしい戦略が、実際には負ける
- 過度の自信で大きな資金を失う
- 時間を浪費して価値のない戦略を開発する
- 戦略の有効性を正しく評価できない

### 推奨される解決策

#### 1. リアルisticトレードシミュレーター
```python
# backend/src/backtesting/realistic_simulator.py
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from datetime import datetime

@dataclass
class TradeCostModel:
    """取引コストモデル"""
    commission_rate: float = 0.001  # 0.1%手数料
    min_commission: float = 100  # 最低手数料
    slippage_model: str = 'realistic'  # 'none', 'fixed', 'realistic', 'market_impact'
    financing_rate: float = 0.0002  # ポジション維持コスト（日次）

@dataclass
class MarketImpactModel:
    """市場インパクトモデル"""
    use_impact: bool = True
    impact_factor: float = 0.1  # Almgren-Chrissモデルの係数
    temporary_impact: float = 0.05
    permanent_impact: float = 0.02

class RealisticTradeSimulator:
    """リアリスティック取引シミュレーター"""

    def __init__(self,
                 cost_model: TradeCostModel,
                 impact_model: MarketImpactModel):
        self.cost_model = cost_model
        self.impact_model = impact_model
        self.order_book = {}

    def simulate_market_order(self,
                             symbol: str,
                             side: str,
                             quantity: float,
                             market_data: pd.Series) -> Dict:
        """市場注文のシミュレーション"""
        # 1. 基本価格
        base_price = market_data['close']

        # 2. スリッページ計算
        slippage = self._calculate_slippage(
            symbol, quantity, side, market_data
        )
        execution_price = base_price * (1 + slippage) if side == 'buy' else base_price * (1 - slippage)

        # 3. 市場インパクト計算
        if self.impact_model.use_impact:
            price_impact = self._calculate_market_impact(
                symbol, quantity, market_data
            )
            execution_price *= (1 + price_impact) if side == 'buy' else (1 - price_impact)

        # 4. 手数料計算
        notional = execution_price * quantity
        commission = max(
            notional * self.cost_model.commission_rate,
            self.cost_model.min_commission
        )

        # 5. 最終実行価格
        total_cost = notional + commission if side == 'buy' else notional - commission

        return {
            'execution_price': execution_price,
            'quantity': quantity,
            'commission': commission,
            'slippage_bps': slippage * 10000,
            'market_impact_bps': price_impact * 10000 if self.impact_model.use_impact else 0,
            'total_cost': total_cost,
            'effective_price': total_cost / quantity
        }

    def _calculate_slippage(self,
                           symbol: str,
                           quantity: float,
                           side: str,
                           market_data: pd.Series) -> float:
        """スリッページ計算"""
        if self.cost_model.slippage_model == 'none':
            return 0.0

        # 平均ボリュームに対する注文サイズ
        avg_volume = market_data.get('volume', 1000000)
        volume_ratio = quantity / avg_volume

        # ボラティリティ（高いほどスリッページが大きい）
        volatility = market_data.get('volatility', 0.02)

        # スプレッド（日中平均）
        spread = market_data.get('spread', 0.001)

        if self.cost_model.slippage_model == 'fixed':
            # 固定スリッページ（例：5ベーシスポイント）
            return 0.0005

        elif self.cost_model.slippage_model == 'realistic':
            # リアルなモデル：ボリューム比率、ボラティリティ、スプレッドを考慮
            base_slippage = spread / 2  # 半分ずつ悪化

            # ボリューム比率による調整
            volume_adjustment = volume_ratio * 0.001  # 0.1% per volume ratio

            # ボラティリティによる調整
            volatility_adjustment = volatility * 0.1

            total_slippage = base_slippage + volume_adjustment + volatility_adjustment

            # ランダム要素（市場ノイズ）
            noise = np.random.normal(0, total_slippage * 0.2)

            return max(0, total_slippage + noise)

    def _calculate_market_impact(self,
                                symbol: str,
                                quantity: float,
                                market_data: pd.Series) -> float:
        """市場インパクト計算（Almgren-Chrissモデル）"""
        # 日次出来高
        daily_volume = market_data.get('volume', 1000000)

        # インパクト（永久 + 一時的）
        # 永久的インパクト：注文の情報としての価値
        permanent_impact = self.impact_model.permanent_impact * (quantity / daily_volume)

        # 一時的インパクト：流動性プロバイダーへの報酬
        temporary_impact = self.impact_model.temporary_impact * (quantity / daily_volume)

        return permanent_impact + temporary_impact

    def simulate_limit_order(self,
                            symbol: str,
                            side: str,
                            quantity: float,
                            limit_price: float,
                            market_data: pd.DataFrame,
                            order_duration: int = 1) -> Dict:
        """指値注文のシミュレーション"""
        # 指定期間内の価格データを取得
        future_prices = market_data[market_data.index >= order_duration]

        if len(future_prices) == 0:
            return {
                'filled': False,
                'fill_price': None,
                'fill_time': None
            }

        # 指値価格が到達したかチェック
        if side == 'buy':
            # 買い指値：価格が指値以下になったら約定
            fill_opportunities = future_prices[future_prices['low'] <= limit_price]
        else:
            # 売り指値：価格が指値以上になったら約定
            fill_opportunities = future_prices[future_prices['high'] >= limit_price]

        if len(fill_opportunities) > 0:
            # 最初の機会で約定
            fill_bar = fill_opportunities.iloc[0]

            # 約定価格（指値またはより良い価格）
            if side == 'buy':
                actual_fill_price = min(limit_price, fill_bar['open'])
            else:
                actual_fill_price = max(limit_price, fill_bar['open'])

            # 部分約定の可能性（流動性不足）
            fill_probability = self._calculate_fill_probability(quantity, market_data)

            if np.random.random() < fill_probability:
                return {
                    'filled': True,
                    'fill_price': actual_fill_price,
                    'fill_time': fill_bar.name,
                    'partial_fill': fill_probability < 1.0
                }

        return {
            'filled': False,
            'fill_price': None,
            'fill_time': None,
            'reason': 'Limit price not reached'
        }

    def _calculate_fill_probability(self, quantity: float, market_data: pd.Series) -> float:
        """約定確率計算"""
        # 出来高に対する注文サイズ
        volume_ratio = quantity / market_data.get('volume', 1000000)

        # 注文サイズが大きいほど約定確率が低い
        if volume_ratio < 0.01:
            return 1.0  # 1%以下なら確実に約定
        elif volume_ratio < 0.05:
            return 0.9
        elif volume_ratio < 0.1:
            return 0.7
        else:
            return 0.5  # 10%以上なら50%の確率で部分約定
```

#### 2. ウォークフォワード分析フレームワーク
```python
# backend/src/backtesting/walk_forward.py
class WalkForwardAnalyzer:
    """ウォークフォワード分析"""

    def __init__(self, strategy_params: Dict, data: pd.DataFrame):
        self.strategy_params = strategy_params
        self.data = data

    def run_walk_forward_analysis(self,
                                 in_sample_periods: int = 252,  # 1年
                                 out_sample_periods: int = 63,  # 3ヶ月
                                 step_size: int = 21) -> Dict:  # 1ヶ月ステップ
        """ウォークフォワード分析実行"""
        total_periods = len(self.data)
        results = []

        # ウィンドウをスライドさせながら分析
        for start in range(0, total_periods - in_sample_periods - out_sample_periods, step_size):
            in_sample_end = start + in_sample_periods
            out_sample_start = in_sample_end
            out_sample_end = out_sample_start + out_sample_periods

            if out_sample_end > total_periods:
                break

            # インサンプル期間でパラメータ最適化
            in_sample_data = self.data.iloc[start:in_sample_end]
            optimal_params = self._optimize_parameters(in_sample_data)

            # アウトオブサンプル期間でテスト
            out_sample_data = self.data.iloc[out_sample_start:out_sample_end]
            out_sample_result = self._test_strategy(out_sample_data, optimal_params)

            results.append({
                'period': f"{start}-{out_sample_end}",
                'in_sample_start': start,
                'in_sample_end': in_sample_end,
                'out_sample_start': out_sample_start,
                'out_sample_end': out_sample_end,
                'optimal_params': optimal_params,
                'in_sample_performance': out_sample_result['in_sample_perf'],
                'out_sample_performance': out_sample_result['out_sample_perf'],
                'parameter_stability': self._assess_parameter_stability(optimal_params, results)
            })

        # 集計
        return self._aggregate_walk_forward_results(results)

    def _optimize_parameters(self, data: pd.DataFrame) -> Dict:
        """パラメータ最適化（インサンプル）"""
        # グリッドサーチまたはベイズ最適化
        from sklearn.model_selection import ParameterGrid

        param_grid = ParameterGrid(self.strategy_params)

        best_params = None
        best_score = -np.inf

        for params in param_grid:
            # クロスバリデーション
            scores = []
            for fold in range(5):  # 5-fold CV
                # 各フォールドでバックテスト実行
                score = self._run_backtest(data, params, fold)
                scores.append(score)

            avg_score = np.mean(scores)

            # 調整後シャープレシオで評価（ペナルティ付き）
            adjusted_score = avg_score - self._calculate_complexity_penalty(params)

            if adjusted_score > best_score:
                best_score = adjusted_score
                best_params = params

        return best_params

    def _calculate_complexity_penalty(self, params: Dict) -> float:
        """パラメータ数に対するペナルティ（AIC/BICのような）"""
        n_params = len(params)
        # 過度な複雑さにペナルティ
        return 0.01 * n_params  # パラメータ1つあたり1%ペナルティ

    def _assess_parameter_stability(self, current_params: Dict,
                                   previous_results: List[Dict]) -> Dict:
        """パラメータ安定性評価"""
        if not previous_results:
            return {'stable': True, 'variance': 0}

        # 以前の最適パラメータとの分散を計算
        param_variations = {}
        for key in current_params:
            variations = [r['optimal_params'].get(key, current_params[key])
                          for r in previous_results[-5:]]  # 直近5期間
            param_variations[key] = np.std(variations)

        avg_variation = np.mean(list(param_variations.values()))

        return {
            'stable': avg_variation < 0.2,  # 変動が20%未満なら安定
            'variance': avg_variation,
            'param_variations': param_variations
        }

    def _aggregate_walk_forward_results(self, results: List[Dict]) -> Dict:
        """ウォークフォワード結果の集計"""
        # アウトオブサンプルパフォーマンスのみを集計
        out_sample_returns = [r['out_sample_performance']['total_return']
                              for r in results]

        in_sample_returns = [r['in_sample_performance']['total_return']
                             for r in results]

        # オーバーフィッティングの兆候
        overfitting_signal = np.mean(in_sample_returns) - np.mean(out_sample_returns)

        # パラメータ安定性
        stability_scores = [r['parameter_stability']['stable'] for r in results]
        stability_rate = sum(stability_scores) / len(stability_scores)

        return {
            'walk_forward_return': np.mean(out_sample_returns),
            'in_sample_return': np.mean(in_sample_returns),
            'overfitting_indicator': overfitting_signal,
            'parameter_stability_rate': stability_rate,
            'is_strategy_robust': (overfitting_signal < 0.05 and stability_rate > 0.7),
            'period_results': results,
            'recommendation': self._generate_walk_forward_recommendation(
                overfitting_signal, stability_rate
            )
        }

    def _generate_walk_forward_recommendation(self, overfitting: float,
                                            stability: float) -> str:
        """推奨事項生成"""
        if overfitting > 0.1:
            return "戦略は過度に最適化されています。パラメータ数を減らしてください。"
        elif stability < 0.5:
            return "パラメータが不安定です。より頑健な戦略が必要です。"
        elif overfitting < 0.05 and stability > 0.7:
            return "戦略は頑健です。ライブトレーディングの候補です。"
        else:
            return "戦略は中程度の信頼性です。追加の検証が必要です。"
```

#### 3. モンテカルロ・シミュレーション
```python
# backend/src/backtesting/monte_carlo.py
class MonteCarloSimulator:
    """モンテカルロ・シミュレーション"""

    def __init__(self, trade_history: List[Dict]):
        self.trade_history = trade_history

    def run_simulation(self, n_simulations: int = 1000) -> Dict:
        """モンテカルロ・シミュレーション実行"""
        simulation_results = []

        for i in range(n_simulations):
            # トレードをリサンプリング（ブートストラップ法）
            resampled_trades = self._resample_trades()

            # キャリアパスを計算
            equity_curve = self._calculate_equity_curve(resampled_trades)

            # パフォーマンス指標
            metrics = self._calculate_metrics(equity_curve, resampled_trades)
            simulation_results.append(metrics)

        # 統計分析
        return self._analyze_simulation_results(simulation_results)

    def _resample_trades(self) -> List[Dict]:
        """トレードをリサンプリング（置換あり）"""
        n_trades = len(self.trade_history)
        resampled = np.random.choice(self.trade_history, size=n_trades, replace=True)
        return resampled.tolist()

    def _calculate_equity_curve(self, trades: List[Dict]) -> np.ndarray:
        """エクイティカーブ計算"""
        equity = [100000]  # 初期資本
        for trade in trades:
            equity.append(equity[-1] + trade.get('pnl', 0))
        return np.array(equity)

    def _calculate_metrics(self, equity_curve: np.ndarray,
                          trades: List[Dict]) -> Dict:
        """パフォーマンス指標計算"""
        returns = np.diff(equity_curve) / equity_curve[:-1]

        total_return = (equity_curve[-1] - equity_curve[0]) / equity_curve[0]
        max_drawdown = self._calculate_max_drawdown(equity_curve)
        sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) > 0 else 0
        sortino_ratio = np.mean(returns) / np.std([r for r in returns if r < 0]) * np.sqrt(252) \
            if len([r for r in returns if r < 0]) > 0 else 0

        return {
            'total_return': total_return,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'sortino_ratio': sortino_ratio,
            'final_equity': equity_curve[-1],
            'equity_curve': equity_curve
        }

    def _analyze_simulation_results(self, results: List[Dict]) -> Dict:
        """シミュレーション結果の統計分析"""
        # 各指標の分布
        returns = [r['total_return'] for r in results]
        drawdowns = [r['max_drawdown'] for r in results]
        sharpe_ratios = [r['sharpe_ratio'] for r in results]

        # パーセンタイル
        return_percentiles = np.percentile(returns, [5, 25, 50, 75, 95])
        drawdown_percentiles = np.percentile(drawdowns, [5, 25, 50, 75, 95])

        # 確率計算
        prob_profit = sum(1 for r in returns if r > 0) / len(returns)
        prob_target = sum(1 for r in returns if r > 0.20) / len(returns)  # 20%以上の利益

        return {
            'return_statistics': {
                'mean': np.mean(returns),
                'std': np.std(returns),
                'median': np.median(returns),
                'percentiles': {
                    '5th': return_percentiles[0],
                    '25th': return_percentiles[1],
                    '50th': return_percentiles[2],
                    '75th': return_percentiles[3],
                    '95th': return_percentiles[4]
                }
            },
            'drawdown_statistics': {
                'mean': np.mean(drawdowns),
                'worst_case': np.max(drawdowns),
                'percentiles': {
                    '5th': drawdown_percentiles[0],
                    '25th': drawdown_percentiles[1],
                    '50th': drawdown_percentiles[2],
                    '75th': drawdown_percentiles[3],
                    '95th': drawdown_percentiles[4]
                }
            },
            'probabilities': {
                'prob_of_profit': prob_profit,
                'prob_of_20pct_return': prob_target
            },
            'risk_assessment': {
                'probability_of_ruin': sum(1 for dd in drawdowns if dd > 0.50) / len(drawdowns),
                'expected_shortfall_5pct': np.mean(sorted(returns)[:int(len(returns) * 0.05)])
            },
            'recommendation': self._generate_monte_carlo_recommendation(prob_profit, prob_target)
        }

    def _calculate_max_drawdown(self, equity_curve: np.ndarray) -> float:
        """最大ドローダウン計算"""
        running_max = np.maximum.accumulate(equity_curve)
        drawdown = (equity_curve - running_max) / running_max
        return abs(np.min(drawdown))
```

### 実装タスク
- [ ] リアルisticトレードシミュレーターの実装
- [ ] ウォークフォワード分析フレームワークの実装
- [ ] モンテカルロ・シミュレーションの実装
- [ ] パラメータ最適化アルゴリズムの実装
- [ ] 過度最適化検出機能の実装
- [ ] サバイバーシップバイアス補正の実装
- [ ] 先行情報バイアス防止の実装
- [ ] バックテスト結果ダッシュボードの実装
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/backtesting/realistic_simulator.py` (新規ファイル)
- `backend/src/backtesting/walk_forward.py` (新規ファイル)
- `backend/src/backtesting/monte_carlo.py` (新規ファイル)
- `backend/src/backtesting/optimization.py` (新規ファイル)
- `trading-platform/components/BacktestPanel.tsx` (新規ファイル)
- `trading-platform/components/MonteCarloResults.tsx` (新規ファイル)

### 優先度
**高（High）** - 正確なバックテストがなければ、良い戦略かどうか分からない

### 複雑度
高

### 見積もり時間
4-5週間

### 成功指標
- ウォークフォワード分析のパス率が70%以上
- バックテストと実パフォーマンスの相関係数が0.7以上
- モンテカルロ95%パーセンタイルの信頼区間が実際のパフォーマンスを含む確率が95%以上
- 過度最適化検出精度が90%以上
