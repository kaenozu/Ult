---
title: アドバンストリスク管理とポジションサイジング
labels: enhancement, risk-management, priority:critical, winning-edge
---

## 説明

### 問題
現在のリスク管理システムには以下の不十分な点があります：

1. **静的リスク管理**：市場状況に応じた動的な調整がない
2. **単純なポジションサイジング**：ケリーや最適fなどの高度な手法未実装
3. **相関リスク無視**：ポートフォリオ内の銘柄間相関を考慮していない
4. **テールリスク対応不足**：ブラックスワンイベントへの対策がない
5. **心理的リスク管理不在**：連敗時のティルト検出と自動防止機能がない

### 影響
- 一つの負けトレードで大きな損失を出す可能性
- 相関高的な銘柄を同時に保有し、市場暴落時に全滅
- 連敗時に感情が入り、規律を失う（ティルト）
- ポジションサイズが最適化されておらず、期待値が最大化されない

### 推奨される解決策

#### 1. 動的ポジションサイジングエンジン
```python
# backend/src/risk/position_sizing.py
import numpy as np
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class PositionSizeResult:
    """ポジションサイズ計算結果"""
    size: float  # 株数または通貨単位
    percentage: float  # ポートフォリオの何%か
    reason: str
    confidence: float
    max_loss: float
    expected_return: float

class DynamicPositionSizer:
    """動的ポジションサイジング"""

    def __init__(self, initial_capital: float = 1000000):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.risk_per_trade = 0.01  # デフォルト1%
        self.max_position_pct = 0.25  # 最大25%
        self.win_loss_history = []

    def calculate_kelly_position_size(self,
                                     win_prob: float,
                                     avg_win: float,
                                     avg_loss: float,
                                     current_price: float,
                                     stop_loss_price: float) -> PositionSizeResult:
        """ケリー基準によるポジションサイジング

        f* = (bp - q) / b
        f*: 購入すべき資産の割合
        b: 勝った時の平均利益/負けた時の平均損失
        p: 勝率
        q: 敗率 = 1 - p
        """
        # オッズ計算
        b = avg_win / abs(avg_loss) if avg_loss != 0 else 1

        # ケリー比率
        kelly_fraction = (win_prob * b - (1 - win_prob)) / b

        # 保守的ケリー（ハーフケリーまたはクォーターケリー）
        # 実際のデータにはノイズがあるため、通常は半分にする
        conservative_kelly = max(0, kelly_fraction * 0.5)

        # 最大ポジションサイズ制限
        position_pct = min(conservative_kelly, self.max_position_pct)

        # 金額計算
        position_value = self.current_capital * position_pct

        # 株数計算
        shares = int(position_value / current_price)

        # 最大損失計算（ストップロス）
        max_loss_per_share = abs(current_price - stop_loss_price)
        total_max_loss = max_loss_per_share * shares

        return PositionSizeResult(
            size=shares,
            percentage=position_pct * 100,
            reason=f"ケリー基準（勝率:{win_prob:.1%}, オッズ:{b:.2f}）",
            confidence=win_prob * 100,
            max_loss=total_max_loss,
            expected_return=position_value * (win_prob * avg_win - (1 - win_prob) * avg_loss)
        )

    def calculate_volatility_adjusted_size(self,
                                         symbol: str,
                                         current_price: float,
                                         atr: float,
                                         stop_loss_distance: float) -> PositionSizeResult:
        """ボラティリティ調整済みポジションサイジング

        ボラティリティが高い銘柄はポジションを小さくする
        """
        # ボラティリティベースリスク調整
        # ATRが価格の2%以下なら基準サイズ
        # ATRが価格の5%以上なら半分のサイズ
        atr_pct = (atr / current_price) * 100

        if atr_pct <= 1:
            volatility_multiplier = 1.3  # 低ボラティリティ：大きめ
        elif atr_pct <= 2:
            volatility_multiplier = 1.0  # 標準
        elif atr_pct <= 3:
            volatility_multiplier = 0.7
        elif atr_pct <= 5:
            volatility_multiplier = 0.5
        else:
            volatility_multiplier = 0.3  # 高ボラティリティ：小さめ

        # 基本ポジションサイズ（リスク1%基準）
        risk_amount = self.current_capital * self.risk_per_trade

        # ストップロス距離から株数を計算
        shares = int(risk_amount / stop_loss_distance)

        # ボラティリティ調整
        adjusted_shares = int(shares * volatility_multiplier)

        return PositionSizeResult(
            size=adjusted_shares,
            percentage=(adjusted_shares * current_price / self.current_capital) * 100,
            reason=f"ボラティリティ調整（ATR:{atr_pct:.2f}%）",
            confidence=75,
            max_loss=risk_amount,
            expected_return=None
        )

    def calculate_correlation_adjusted_size(self,
                                          existing_positions: Dict[str, float],
                                          new_symbol: str,
                                          correlation_matrix: Dict,
                                          base_size: float) -> PositionSizeResult:
        """相関調整済みポジションサイジング

        既存ポジションとの相関が高い場合、サイズを削減
        """
        # 既存ポジションとの加重平均相関を計算
        weighted_correlation = 0
        total_weight = 0

        for symbol, weight in existing_positions.items():
            if symbol in correlation_matrix.get(new_symbol, {}):
                corr = correlation_matrix[new_symbol][symbol]
                weighted_correlation += corr * weight
                total_weight += weight

        avg_correlation = weighted_correlation / total_weight if total_weight > 0 else 0

        # 相関に応じてサイズを調整
        # 相関0.7以上なら半分、0.9以上なら1/4
        if avg_correlation >= 0.9:
            correlation_multiplier = 0.25
        elif avg_correlation >= 0.7:
            correlation_multiplier = 0.5
        elif avg_correlation >= 0.5:
            correlation_multiplier = 0.75
        else:
            correlation_multiplier = 1.0

        adjusted_size = int(base_size * correlation_multiplier)

        return PositionSizeResult(
            size=adjusted_size,
            percentage=None,
            reason=f"相関調整（平均相関:{avg_correlation:.2f}）",
            confidence=80,
            max_loss=None,
            expected_return=None
        )
```

#### 2. ポートフォリオリスクモニター
```python
# backend/src/risk/portfolio_monitor.py
class PortfolioRiskMonitor:
    """ポートフォリオリスクモニター"""

    def __init__(self):
        self.positions = {}
        self.risk_limits = {
            'max_portfolio_var': 0.02,  # 1日VaR 2%
            'max_portfolio_beta': 1.5,
            'max_correlation_exposure': 0.6,
            'max_sector_exposure': 0.4,  # 1セクター40%以下
            'max_single_position': 0.1  # 1銘柄10%以下
        }

    def calculate_portfolio_var(self, confidence_level: float = 0.95) -> Dict:
        """ポートフォリオVaR計算（パラメトリック法）"""
        if not self.positions:
            return {'var_1day': 0, 'var_1day_pct': 0}

        # ポジションのリターンとボラティリティを取得
        weights = []
        volatilities = []
        correlations = self._get_correlation_matrix()

        # 共分散行列計算
        cov_matrix = self._calculate_covariance_matrix(volatilities, correlations)

        # ポートフォリオボラティリティ
        weights_array = np.array(weights)
        portfolio_variance = weights_array @ cov_matrix @ weights_array.T
        portfolio_volatility = np.sqrt(portfolio_variance)

        # VaR計算（正規分布仮定）
        z_score = 1.645  # 95%信頼区間
        var_1day_pct = z_score * portfolio_volatility
        total_value = sum(p['value'] for p in self.positions.values())
        var_1day = total_value * var_1day_pct

        return {
            'var_1day': var_1day,
            'var_1day_pct': var_1day_pct * 100,
            'portfolio_volatility': portfolio_volatility,
            'within_limit': var_1day_pct <= self.risk_limits['max_portfolio_var']
        }

    def calculate_beta_exposure(self, market_return: float) -> Dict:
        """ベータエクスポージャー計算"""
        total_beta = 0
        portfolio_value = 0

        for symbol, position in self.positions.items():
            beta = position.get('beta', 1.0)
            value = position['value']
            weight = value / sum(p['value'] for p in self.positions.values())

            total_beta += beta * weight
            portfolio_value += value

        return {
            'portfolio_beta': total_beta,
            'market_exposure': total_beta * portfolio_value,
            'within_limit': total_beta <= self.risk_limits['max_portfolio_beta']
        }

    def check_sector_concentration(self) -> Dict:
        """セクター集中度チェック"""
        sector_exposure = {}

        for symbol, position in self.positions.items():
            sector = position.get('sector', 'Unknown')
            value = position['value']

            if sector not in sector_exposure:
                sector_exposure[sector] = 0
            sector_exposure[sector] += value

        total_value = sum(p['value'] for p in self.positions.values())
        sector_pcts = {s: v/total_value for s, v in sector_exposure.items()}

        max_sector = max(sector_pcts.items(), key=lambda x: x[1])

        return {
            'sector_exposures': sector_pcts,
            'max_sector': max_sector[0],
            'max_sector_pct': max_sector[1] * 100,
            'within_limit': max_sector[1] <= self.risk_limits['max_sector_exposure']
        }

    def generate_risk_report(self) -> Dict:
        """リスクレポート生成"""
        var_analysis = self.calculate_portfolio_var()
        beta_analysis = self.calculate_beta_exposure(0.001)  # 日次リターン
        sector_analysis = self.check_sector_concentration()

        # リスクスコア計算（0-100、高いほどリスク）
        risk_score = 0
        risk_factors = []

        if not var_analysis['within_limit']:
            risk_score += 30
            risk_factors.append('VaR超過')

        if not beta_analysis['within_limit']:
            risk_score += 20
            risk_factors.append('ベータ超過')

        if not sector_analysis['within_limit']:
            risk_score += 20
            risk_factors.append('セクター集中')

        # 総リスク評価
        if risk_score >= 50:
            risk_level = 'HIGH'
        elif risk_score >= 30:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'

        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'risk_factors': risk_factors,
            'var_analysis': var_analysis,
            'beta_analysis': beta_analysis,
            'sector_analysis': sector_analysis,
            'recommendations': self._generate_recommendations(risk_factors)
        }
```

#### 3. テールリスクヘッジモジュール
```python
# backend/src/risk/tail_risk.py
class TailRiskHedger:
    """テールリスクヘッジ"""

    def __init__(self):
        self.hedge_instruments = {
            'put_options': [],
            'vix_futures': [],
            'inverse_etf': []
        }

    def detect_tail_risk_regime(self, market_data: pd.DataFrame) -> Dict:
        """テールリスクレジーム検出"""
        # VIXの急騰
        vix = market_data['VIX']
        vix_spike = vix > vix.rolling(20).mean() + 2 * vix.rolling(20).std()

        # オプションの put/call ratio 急増
        put_call_ratio = market_data['put_volume'] / market_data['call_volume']
        pcr_spike = put_call_ratio > put_call_ratio.rolling(20).mean() + 2 * put_call_ratio.rolling(20).std()

        # 市場幅の縮小
        advance_decline = market_data['advancing'] / (market_data['advancing'] + market_data['declining'])
        breadth_narrow = advance_decline < 0.3

        # スキューnessの急変
        returns = market_data['returns']
        skewness = returns.rolling(20).skew()
        skew_shift = skewness < -1.0  # 負の歪度

        tail_risk_signals = sum([vix_spike.iloc[-1], pcr_spike.iloc[-1], breadth_narrow.iloc[-1], skew_shift.iloc[-1]])

        return {
            'tail_risk_detected': tail_risk_signals >= 2,
            'signal_count': tail_risk_signals,
            'vix_spike': vix_spike.iloc[-1],
            'pcr_spike': pcr_spike.iloc[-1],
            'breadth_narrow': breadth_narrow.iloc[-1],
            'skew_shift': skew_shift.iloc[-1]
        }

    def calculate_hedge_ratio(self, portfolio_value: float,
                            portfolio_beta: float) -> Dict:
        """ヘッジ比率計算"""
        # プットオプションヘッジ
        # ポートフォリオ価値の5-10%をプットプレミアムに充当
        put_premium_budget = portfolio_value * 0.05

        # VIX先物ヘッジ
        # VIXが20%上昇した場合の損失をカバー
        vix_hedge_notional = portfolio_value * portfolio_beta * 0.5

        # インバースETFヘッジ
        # ポートフォリオのベータ × ポートフォリオ価値の10-20%
        inverse_etf_value = portfolio_value * portfolio_beta * 0.15

        return {
            'put_option_budget': put_premium_budget,
            'vix_hedge_notional': vix_hedge_notional,
            'inverse_etf_value': inverse_etf_value,
            'total_hedge_cost': put_premium_budget * 0.3  # プレミアムの約30%が期待コスト
        }

    def auto_hedge(self, tail_risk_detected: bool,
                  portfolio_value: float,
                  portfolio_beta: float) -> Dict:
        """自動ヘッジ実行"""
        if not tail_risk_detected:
            return {'action': 'none', 'reason': 'テールリスク未検出'}

        hedge_ratio = self.calculate_hedge_ratio(portfolio_value, portfolio_beta)

        # ヘッジ実行ロジック
        # 実際のブローカーAPI呼び出し
        hedge_actions = []

        # 1. プットオプション購入
        hedge_actions.append({
            'type': 'put_option',
            'action': 'buy',
            'budget': hedge_ratio['put_option_budget'],
            'strike': 'ATM',  # アット・ザ・マネー
            'expiry': '1month'
        })

        # 2. VIX先物購入
        hedge_actions.append({
            'type': 'vix_future',
            'action': 'buy',
            'notional': hedge_ratio['vix_hedge_notional']
        })

        # 3. インバースETF購入
        hedge_actions.append({
            'type': 'inverse_etf',
            'action': 'buy',
            'value': hedge_ratio['inverse_etf_value']
        })

        return {
            'action': 'hedge',
            'hedge_actions': hedge_actions,
            'estimated_cost': hedge_ratio['total_hedge_cost']
        }
```

#### 4. 心理的リスクモニター（ティルト検出）
```python
# backend/src/risk/psychological_monitor.py
class PsychologicalRiskMonitor:
    """心理的リスクモニター（ティルト検出）"""

    def __init__(self):
        self.trade_history = []
        self.emotional_state = 'CALM'
        self.tilt_indicators = {
            'consecutive_losses': 0,
            'revenge_trading_count': 0,
            'position_size_chasing': 0,
            'overtrading': False
        }

    def analyze_trade_sequence(self, trades: List[Dict]) -> Dict:
        """トレードシーケンス分析"""
        tilt_score = 0
        warnings = []

        # 1. 連敗カウント
        consecutive_losses = self._count_consecutive_losses(trades)
        if consecutive_losses >= 3:
            tilt_score += 25
            warnings.append(f"連敗{consecutive_losses}回")
            self.tilt_indicators['consecutive_losses'] = consecutive_losses

        # 2. 復讐トレード検出（負け直後の大きなポジション）
        revenge_trades = self._detect_revenge_trading(trades)
        if revenge_trades > 0:
            tilt_score += 30
            warnings.append(f"復讐トレード{revenge_trades}回検出")
            self.tilt_indicators['revenge_trading_count'] = revenge_trades

        # 3. ポジションサイズ増加検出
        size_chasing = self._detect_position_size_chasing(trades)
        if size_chasing:
            tilt_score += 20
            warnings.append("損失回復のためのポジションサイズ増加")
            self.tilt_indicators['position_size_chasing'] = True

        # 4. 過度取引検出
        overtrading = self._detect_overtrading(trades)
        if overtrading:
            tilt_score += 15
            warnings.append("過度な取引")
            self.tilt_indicators['overtrading'] = True

        # ティルトレベル判定
        if tilt_score >= 70:
            tilt_level = 'SEVERE'
            recommendation = '取引停止、1日休憩'
        elif tilt_score >= 50:
            tilt_level = 'HIGH'
            recommendation = '取引停止、数時間休憩'
        elif tilt_score >= 30:
            tilt_level = 'MODERATE'
            recommendation = 'ポジションサイズ半減、注意深く'
        else:
            tilt_level = 'LOW'
            recommendation = '平常通り'

        self.emotional_state = tilt_level

        return {
            'tilt_level': tilt_level,
            'tilt_score': tilt_score,
            'warnings': warnings,
            'recommendation': recommendation,
            'indicators': self.tilt_indicators,
            'should_pause_trading': tilt_score >= 50
        }

    def _detect_revenge_trading(self, trades: List[Dict]) -> int:
        """復讐トレード検出"""
        count = 0
        for i in range(1, len(trades)):
            if trades[i-1]['pnl'] < 0:  # 前回が負け
                # 前回よりもポジションサイズが2倍以上
                if trades[i]['size'] >= trades[i-1]['size'] * 2:
                    count += 1
        return count

    def _detect_overtrading(self, trades: List[Dict]) -> bool:
        """過度取引検出"""
        if len(trades) < 5:
            return False

        # 1時間以内のトレード回数
        from datetime import datetime, timedelta
        now = datetime.now()
        recent_trades = [t for t in trades if now - t['timestamp'] < timedelta(hours=1)]

        return len(recent_trades) > 10  # 1時間に10回以上

    def generate_intervention_plan(self, tilt_level: str) -> Dict:
        """介入プラン生成"""
        if tilt_level == 'SEVERE':
            return {
                'action': 'force_stop',
                'duration_hours': 24,
                'cooldown_exercises': [
                    '散歩',
                    '瞑想',
                    'マインドフルネス'
                ],
                'review_questions': [
                    'なぜ負けたのか？',
                    'ルールを守ったか？',
                    '感情で取引していないか？'
                ]
            }
        elif tilt_level == 'HIGH':
            return {
                'action': 'force_stop',
                'duration_hours': 4,
                'cooldown_exercises': ['深呼吸', '休憩'],
                'review_questions': ['今の精神状態は？']
            }
        else:
            return {
                'action': 'reduce_size',
                'size_multiplier': 0.5,
                'review_questions': ['冷静に判断できているか？']
            }
```

### 実装タスク
- [ ] 動的ポジションサイジングエンジンの実装
- [ ] ポートフォリオリスクモニターの実装
- [ ] テールリスクヘッジモジュールの実装
- [ ] 心理的リスクモニターの実装
- [ ] 相関行列計算の実装
- [ ] VaR計算の実装
- [ ] リスクダッシュボードUIの実装
- [ ] 自動ヘッジ実行システムの実装
- [ ] ユニットテストの作成
- [ ] 統合テストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/risk/position_sizing.py` (新規ファイル)
- `backend/src/risk/portfolio_monitor.py` (新規ファイル)
- `backend/src/risk/tail_risk.py` (新規ファイル)
- `backend/src/risk/psychological_monitor.py` (新規ファイル)
- `trading-platform/components/RiskMonitorPanel.tsx` (新規ファイル)
- `trading-platform/components/TiltWarningModal.tsx` (新規ファイル)

### 優先度
**最重要（Critical）** - 資本を守らなければ継続的に勝てない

### 複雑度
中〜高

### 見積もり時間
3-5週間

### 成功指標
- 最大ドローダウンが15%以下
- 1トレードあたりのリスクが1%以下
- シャープレシオが1.5以上
- ティルトによる損失が80%削減
- ポートフォリオVaRが信頼区間内に収まる確率が95%以上
