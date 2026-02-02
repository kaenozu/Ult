---
title: トレーディング心理学分析と自律的トレーディング支援
labels: enhancement, psychology, priority:high, winning-edge
---

## 説明

### 問題
トレーディングで最も重要な要素の一つは心理ですが、現在のシステムには以下の問題があります：

1. **感情トレードの検出不足**：恐怖や贪婪（グリード）による非合理的な判断を検知できない
2. **トレードジャーナル機能不十分**：パターン分析と改善提案が弱い
3. **規律監視機能不在**：自分のルールを守っているかのチェックがない
4. **メンタルヘルス管理不在**：バーンアウトや過度のストレスを検知できない
5. **自動警告システム不在**：危険な心理状態で取引しようとした時に止められない

### 影響
- 連敗時に感情が入り、更大的な損失を出す
- 勝っている時に調子に乗って過剰にリスクを取る
- 優れた戦略を持っていても実行できない
- 長期的なパフォーマンスが不安定
- トレーダーとしての成長が遅い

### 推奨される解決策

#### 1. AIトレーディングコーチ
```python
# backend/src/psychology/trading_coach.py
from typing import Dict, List
from datetime import datetime, timedelta
import numpy as np

class AITradingCoach:
    """AIトレーディングコーチ"""

    def __init__(self):
        self.trade_history = []
        self.emotional_patterns = {}
        self.coaching_sessions = []

    def analyze_emotional_state(self, recent_trades: List[Dict]) -> Dict:
        """感情状態分析"""
        fear_score = 0
        greed_score = 0
        confidence_score = 0
        tilt_score = 0

        # 恐怖の指標
        # 1. 早すぎる利食い
        early_exits = [t for t in recent_trades if t.get('early_exit', False)]
        if len(early_exits) / len(recent_trades) > 0.3:
            fear_score += 30

        # 2. 過度な損切り回避
        avoided_stops = [t for t in recent_trades if t.get('avoided_stop', False)]
        if len(avoided_stops) > 0:
            fear_score += 40

        # 3. エントリー回避
        missed_valid_setups = [t for t in recent_trades if t.get('missed_setup', False)]
        if len(missed_valid_setups) > 2:
            fear_score += 30

        # 貪欲の指標
        # 1. ポジションサイズの急増
        if len(recent_trades) >= 2:
            avg_size = np.mean([t['size'] for t in recent_trades[:-2]])
            if recent_trades[-1]['size'] > avg_size * 2:
                greed_score += 40

        # 2. 利食い未実行（利益が伸びているのに決済しない）
        unrealized_losses = [t for t in recent_trades if t.get('unrealized_loss', False)]
        if len(unrealized_losses) > 0:
            greed_score += 30

        # 3. 過度なトレード頻度
        trades_per_hour = len(recent_trades)
        if trades_per_hour > 5:
            greed_score += 30

        # 自信の指標
        win_rate = len([t for t in recent_trades if t['pnl'] > 0]) / len(recent_trades)
        confidence_score = win_rate * 100

        # ティルトスコア（既存のティルト検出ロジック）
        tilt_indicators = self._calculate_tilt_indicators(recent_trades)
        tilt_score = tilt_indicators['score']

        # 総合的な感情状態判定
        if fear_score > 50:
            emotional_state = 'FEARFUL'
            message = "恐怖が支配しています。リスクを取りすぎていませんか？"
        elif greed_score > 50:
            emotional_state = 'GREEDY'
            message = "貪欲が過剰です。冷静さを保っていますか？"
        elif tilt_score > 50:
            emotional_state = 'TILTED'
            message = "ティルト状態です。取引を中止してください。"
        elif confidence_score > 80:
            emotional_state = 'OVERCONFIDENT'
            message = "過度な自信に注意してください。"
        else:
            emotional_state = 'BALANCED'
            message = "良好な心理状態です。"

        return {
            'emotional_state': emotional_state,
            'fear_score': fear_score,
            'greed_score': greed_score,
            'confidence_score': confidence_score,
            'tilt_score': tilt_score,
            'message': message,
            'recommendations': self._generate_emotional_recommendations(emotional_state)
        }

    def _calculate_tilt_indicators(self, trades: List[Dict]) -> Dict:
        """ティルト指標計算"""
        score = 0
        reasons = []

        # 連敗
        consecutive_losses = self._count_consecutive_losses(trades)
        if consecutive_losses >= 3:
            score += 25
            reasons.append(f"連敗{consecutive_losses}回")

        # 復讐トレード
        revenge_trades = sum(1 for i, t in enumerate(trades[1:], 1)
                            if trades[i-1]['pnl'] < 0 and t['size'] > trades[i-1]['size'] * 1.5)
        if revenge_trades > 0:
            score += 30
            reasons.append(f"復讐トレード{revenge_trades}回")

        # 規律違反
        discipline_violations = sum(1 for t in trades if not t.get('followed_rules', True))
        if discipline_violations > 0:
            score += 20
            reasons.append(f"規律違反{discipline_violations}回")

        # 過度取引
        if len(trades) > 10:
            score += 15
            reasons.append("過度取引")

        return {'score': score, 'reasons': reasons}

    def generate_coaching_insight(self, user_id: str,
                                 period: str = 'weekly') -> Dict:
        """コーチングインサイト生成"""
        # 期間データを取得
        trades = self._get_trades_by_period(user_id, period)

        # パターン分析
        patterns = self._analyze_patterns(trades)

        # 弱点特定
        weaknesses = self._identify_weaknesses(trades)

        # 改善提案
        improvements = self._suggest_improvements(patterns, weaknesses)

        # 目標設定
        goals = self._set_goals(trades)

        return {
            'period': period,
            'patterns': patterns,
            'weaknesses': weaknesses,
            'improvements': improvements,
            'goals': goals,
            'motivational_message': self._generate_motivation(trades)
        }

    def _analyze_patterns(self, trades: List[Dict]) -> Dict:
        """パターン分析"""
        patterns = {
            'best_time_of_day': self._find_best_time(trades),
            'worst_time_of_day': self._find_worst_time(trades),
            'best_day_of_week': self._find_best_day(trades),
            'worst_day_of_week': self._find_worst_day(trades),
            'most_profitable_setup': self._find_best_setup(trades),
            'least_profitable_setup': self._find_worst_setup(trades),
            'winning_streak_max': self._find_max_winning_streak(trades),
            'losing_streak_max': self._find_max_losing_streak(trades),
            'avg_win': self._calculate_avg_win(trades),
            'avg_loss': self._calculate_avg_loss(trades),
            'profit_factor': self._calculate_profit_factor(trades)
        }
        return patterns

    def _identify_weaknesses(self, trades: List[Dict]) -> List[str]:
        """弱点特定"""
        weaknesses = []

        # 1. 利食いが早すぎる
        early_exits = [t for t in trades if t.get('early_exit', False)]
        if len(early_exits) / len(trades) > 0.3:
            weaknesses.append('early_exit')

        # 2. 損切りが遅い
        late_stops = [t for t in trades if t.get('late_stop', False)]
        if len(late_stops) / len(trades) > 0.2:
            weaknesses.append('late_stop_loss')

        # 3. 規律違反
        violations = [t for t in trades if not t.get('followed_rules', True)]
        if len(violations) / len(trades) > 0.1:
            weaknesses.append('discipline')

        # 4. ポジションサイジング問題
        size_issues = [t for t in trades if t.get('size_issue', False)]
        if len(size_issues) / len(trades) > 0.2:
            weaknesses.append('position_sizing')

        return weaknesses

    def _suggest_improvements(self, patterns: Dict, weaknesses: List[str]) -> List[Dict]:
        """改善提案"""
        suggestions = []

        for weakness in weaknesses:
            if weakness == 'early_exit':
                suggestions.append({
                    'weakness': 'early_exit',
                    'suggestion': '利食い基準を見直してください',
                    'action': '次回の利益目標を+Rに設定して、利食いを我慢する練習を',
                    'expected_improvement': '平均利益が30-50%向上する可能性があります'
                })
            elif weakness == 'late_stop_loss':
                suggestions.append({
                    'weakness': 'late_stop_loss',
                    'suggestion': '損切りを自動化してください',
                    'action': 'OCO注文（One-Cancels-Other）を使用して、ストップロスを自動実行',
                    'expected_improvement': '最大損失が50%削減されます'
                })
            elif weakness == 'discipline':
                suggestions.append({
                    'weakness': 'discipline',
                    'suggestion': 'トレード前チェックリストを作成してください',
                    'action': '各トレード前に「このトレードは自分のルールに合致しているか」を確認',
                    'expected_improvement': '勝率が10-15%向上します'
                })
            elif weakness == 'position_sizing':
                suggestions.append({
                    'weakness': 'position_sizing',
                    'suggestion': 'ポジションサイジングを一定にしてください',
                    'action': 'ケリー基準または固定%ルールを適用',
                    'expected_improvement': 'ボラティリティが減り、精神的余裕が生まれます'
                })

        return suggestions
```

#### 2. トレードジャーナルアナライザー
```python
# backend/src/psychology/journal_analyzer.py
from transformers import pipeline
import re

class TradeJournalAnalyzer:
    """トレードジャーナルアナライザー"""

    def __init__(self):
        self.sentiment_analyzer = pipeline('sentiment-analysis')
        self.journal_entries = []

    def analyze_journal_entry(self, entry: str, trade_data: Dict) -> Dict:
        """ジャーナルエントリー分析"""
        # 感情分析
        sentiment = self.sentiment_analyzer(entry)[0]

        # キーワード抽出
        emotions = self._extract_emotions(entry)

        # 思考のパターン分析
        thought_patterns = self._analyze_thought_patterns(entry)

        # トレード結果との整合性チェック
        consistency_check = self._check_consistency(entry, trade_data)

        # 改善提案
        insights = self._generate_insights(entry, trade_data, sentiment, emotions)

        return {
            'sentiment': sentiment,
            'emotions': emotions,
            'thought_patterns': thought_patterns,
            'consistency_check': consistency_check,
            'insights': insights,
            'emotional_intelligence_score': self._calculate_eq_score(emotions, thought_patterns)
        }

    def _extract_emotions(self, text: str) -> Dict:
        """感情抽出"""
        emotion_keywords = {
            'fear': ['恐', '怖', '不安', '心配', 'パニック'],
            'greed': ['欲', '欲張', 'もっと', '足りない'],
            'anger': ['怒', '苛立', 'イラ', '腹立'],
            'sadness': ['悲', '落ち込', '悔', '嫌'],
            'excitement': ['興奮', 'わくわく', 'テンション', 'ハイ'],
            'calm': ['冷静', '落ち着', '平常', 'リラックス']
        }

        detected_emotions = {}
        for emotion, keywords in emotion_keywords.items():
            count = sum(1 for kw in keywords if kw in text)
            if count > 0:
                detected_emotions[emotion] = count

        return detected_emotions

    def _analyze_thought_patterns(self, text: str) -> Dict:
        """思考パターン分析"""
        patterns = {
            'cognitive_distortions': [],
            'rational_thinking': [],
            'growth_mindset': []
        }

        # 認知の歪み
        distortions = {
            'all_or_nothing': ['常に', '決して', '完全に'],
            'overgeneralization': ['いつも', '毎回', '全て'],
            'catastrophizing': ['最悪', '終わり', '破滅'],
            'should_statements': ['すべき', 'しなきゃ', 'はず']
        }

        for distortion, keywords in distortions.items():
            if any(kw in text for kw in keywords):
                patterns['cognitive_distortions'].append(distortion)

        # 合理的思考の指標
        rational_indicators = ['事実', 'データ', '計画', '戦略', '分析']
        if any(ind in text for ind in rational_indicators):
            patterns['rational_thinking'].append('fact_based')

        # 成長思考の指標
        growth_indicators = ['学んだ', '改善', '次は', '経験', '教訓']
        if any(ind in text for ind in growth_indicators):
            patterns['growth_mindset'].append('learning_oriented')

        return patterns

    def generate_weekly_report(self, user_id: str) -> Dict:
        """週次レポート生成"""
        entries = self._get_week_entries(user_id)

        if not entries:
            return {'message': '今週のジャーナルエントリーがありません'}

        # 感情の推移
        emotion_timeline = self._build_emotion_timeline(entries)

        # 主要なパターン
        dominant_emotions = self._find_dominant_emotions(entries)

        # 成長の兆候
        growth_indicators = self._assess_growth(entries)

        # 改善が必要な領域
        areas_for_improvement = self._identify_improvement_areas(entries)

        return {
            'emotion_timeline': emotion_timeline,
            'dominant_emotions': dominant_emotions,
            'growth_indicators': growth_indicators,
            'areas_for_improvement': areas_for_improvement,
            'weekly_summary': self._generate_weekly_summary(entries),
            'action_items': self._generate_action_items(areas_for_improvement)
        }
```

#### 3. 規律監視システム
```python
# backend/src/psychology/discipline_monitor.py
class DisciplineMonitor:
    """規律監視システム"""

    def __init__(self, trading_rules: Dict):
        self.trading_rules = trading_rules
        self.violations = []
        self.discipline_score = 100

    def check_trade_compliance(self, trade: Dict) -> Dict:
        """トレードの規律チェック"""
        violations = []
        warnings = []

        # ルール1: エントリー条件チェック
        if not self._check_entry_conditions(trade):
            violations.append({
                'rule': 'entry_conditions',
                'message': 'エントリー条件が満たされていません'
            })

        # ルール2: ポジションサイズチェック
        if not self._check_position_size(trade):
            violations.append({
                'rule': 'position_size',
                'message': 'ポジションサイズがルールを超えています'
            })

        # ルール3: ストップロスチェック
        if not self._check_stop_loss(trade):
            violations.append({
                'rule': 'stop_loss',
                'message': 'ストップロスが設定されていません'
            })

        # ルール4: リスク/リワード比チェック
        if not self._check_risk_reward(trade):
            warnings.append({
                'rule': 'risk_reward',
                'message': 'R/R比が低いです'
            })

        # ルール5: 1日のトレード回数チェック
        if not self._check_daily_trade_limit(trade):
            violations.append({
                'rule': 'daily_limit',
                'message': '1日のトレード回数上限を超えました'
            })

        # 規律スコアを更新
        if violations:
            self.discipline_score = max(0, self.discipline_score - len(violations) * 10)

        return {
            'compliant': len(violations) == 0,
            'violations': violations,
            'warnings': warnings,
            'discipline_score': self.discipline_score
        }

    def generate_discipline_report(self, user_id: str) -> Dict:
        """規律レポート生成"""
        recent_violations = self._get_recent_violations(user_id, days=7)

        # 違反頻度
        violation_frequency = self._calculate_violation_frequency(recent_violations)

        # 最も多い違反
        most_common_violations = self._find_most_common_violations(recent_violations)

        # 規律スコアの推移
        score_trend = self._calculate_score_trend(user_id)

        # 改善提案
        recommendations = self._generate_discipline_recommendations(most_common_violations)

        return {
            'current_discipline_score': self.discipline_score,
            'violation_frequency': violation_frequency,
            'most_common_violations': most_common_violations,
            'score_trend': score_trend,
            'recommendations': recommendations,
            'discipline_level': self._classify_discipline_level(self.discipline_score)
        }

    def _classify_discipline_level(self, score: int) -> str:
        """規律レベル分類"""
        if score >= 90:
            return 'EXCELLENT'
        elif score >= 70:
            return 'GOOD'
        elif score >= 50:
            return 'FAIR'
        else:
            return 'POOR'
```

### 実装タスク
- [ ] AIトレーディングコーチの実装
- [ ] トレードジャーナルアナライザーの実装
- [ ] 規律監視システムの実装
- [ ] メンタルヘルスチェック機能の実装
- [ ] 感情分析モデルの学習
- [ ] パターン認識アルゴリズムの実装
- [ ] 週次レポート生成の実装
- [ ] 心理ダッシュボードUIの実装
- [ ] モバイル通知機能の実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `backend/src/psychology/trading_coach.py` (新規ファイル)
- `backend/src/psychology/journal_analyzer.py` (新規ファイル)
- `backend/src/psychology/discipline_monitor.py` (新規ファイル)
- `backend/src/psychology/mental_health_checker.py` (新規ファイル)
- `trading-platform/components/PsychologyPanel.tsx` (新規ファイル)
- `trading-platform/components/JournalEditor.tsx` (新規ファイル)
- `trading-platform/components/DisciplineReport.tsx` (新規ファイル)

### 優先度
**高（High）** - 心理がトレード結果に直結する

### 複雑度
中〜高

### 見積もり時間
3-4週間

### 成功指標
- トレードジャーナル記入率が80%以上
- 規律スコアが80以上に改善
- ティルトによる損失が70%削減
- トレーダー満足度アンケートで4.5/5以上
- 自己認識スコアが30%向上
