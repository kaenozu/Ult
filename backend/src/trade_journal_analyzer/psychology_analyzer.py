"""
Trading Psychology Analyzer

Analyzes trader psychology, emotions, and mental state.
Detects tilt, emotional trading, and discipline issues.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class EmotionType(Enum):
    """Types of trading emotions"""
    FEAR = "fear"
    GREED = "greed"
    CONFIDENCE = "confidence"
    ANXIETY = "anxiety"
    EUPHORIA = "euphoria"
    FRUSTRATION = "frustration"
    DISCIPLINE = "discipline"
    NEUTRAL = "neutral"


class MentalState(Enum):
    """Current mental state of trader"""
    OPTIMAL = "optimal"          # Best state for trading
    CAUTIOUS = "cautious"        # Slightly stressed but manageable
    STRESSED = "stressed"        # High stress, should be careful
    TILT = "tilt"               # Emotional trading, should stop
    BURNOUT = "burnout"         # Exhausted, must take break


@dataclass
class EmotionScore:
    """Emotion scoring result"""
    emotion: EmotionType
    score: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    indicators: List[str]  # What triggered this emotion


@dataclass
class MentalHealthMetrics:
    """Mental health assessment metrics"""
    overall_score: float  # 0-100
    stress_level: float  # 0-100
    discipline_score: float  # 0-100
    emotional_stability: float  # 0-100
    fatigue_level: float  # 0-100
    state: MentalState
    days_since_break: int
    consecutive_losing_days: int
    consecutive_winning_days: int
    risk_of_tilt: float  # 0-1
    risk_of_burnout: float  # 0-1
    recommendations: List[str]


@dataclass
class DisciplineViolation:
    """Represents a trading discipline violation"""
    rule_type: str
    severity: str  # low, medium, high
    description: str
    trade_id: Optional[str]
    timestamp: datetime
    impact: str  # Description of impact


@dataclass
class TradingSession:
    """Represents a trading session"""
    start_time: datetime
    end_time: Optional[datetime]
    trades_count: int
    win_count: int
    loss_count: int
    total_profit: float
    emotions: List[EmotionScore]
    violations: List[DisciplineViolation]
    notes: str


@dataclass
class PsychologyAnalysisResult:
    """Complete psychology analysis result"""
    mental_health: MentalHealthMetrics
    dominant_emotions: List[EmotionScore]
    recent_violations: List[DisciplineViolation]
    trading_pattern_issues: List[str]
    should_stop_trading: bool
    warning_level: str  # none, low, medium, high, critical
    coaching_recommendations: List[Dict[str, Any]]


class TradingPsychologyAnalyzer:
    """Analyzes trading psychology and mental state"""

    # Constants for analysis
    TILT_LOSS_SEQUENCE_THRESHOLD = 3
    TILT_RAPID_ENTRY_MINUTES = 10
    BURNOUT_TRADING_DAYS_THRESHOLD = 20
    BURNOUT_HOURS_PER_DAY_THRESHOLD = 8
    OPTIMAL_DISCIPLINE_SCORE = 80
    STRESS_CONSECUTIVE_LOSSES = 4
    HIGH_STRESS_WIN_AFTER_LOSS_MINUTES = 15

    def __init__(self):
        """Initialize psychology analyzer"""
        self._sessions: List[TradingSession] = []
        self._discipline_rules: Dict[str, Any] = {}

    def add_session(self, session: TradingSession) -> None:
        """Add a trading session for analysis

        Args:
            session: Trading session to add
        """
        self._sessions.append(session)

    def set_discipline_rules(self, rules: Dict[str, Any]) -> None:
        """Set trader's personal discipline rules

        Args:
            rules: Dictionary of discipline rules
        """
        self._discipline_rules = rules

    def analyze_emotions(
        self,
        recent_trades: List[Dict[str, Any]],
        time_window_hours: int = 24
    ) -> List[EmotionScore]:
        """Analyze emotions based on trading behavior

        Args:
            recent_trades: List of recent trades
            time_window_hours: Time window for analysis

        Returns:
            List of detected emotions with scores
        """
        emotions = []

        if not recent_trades:
            emotions.append(EmotionScore(
                emotion=EmotionType.NEUTRAL,
                score=1.0,
                confidence=1.0,
                indicators=["No recent trading activity"]
            ))
            return emotions

        # Detect fear (hesitation, small positions after losses)
        fear_score = self._detect_fear(recent_trades)
        if fear_score.score > 0.3:
            emotions.append(fear_score)

        # Detect greed (oversized positions, overtrading)
        greed_score = self._detect_greed(recent_trades)
        if greed_score.score > 0.3:
            emotions.append(greed_score)

        # Detect frustration (revenge trading after losses)
        frustration_score = self._detect_frustration(recent_trades)
        if frustration_score.score > 0.3:
            emotions.append(frustration_score)

        # Detect euphoria (overconfidence after wins)
        euphoria_score = self._detect_euphoria(recent_trades)
        if euphoria_score.score > 0.3:
            emotions.append(euphoria_score)

        if not emotions:
            emotions.append(EmotionScore(
                emotion=EmotionType.DISCIPLINE,
                score=0.8,
                confidence=0.7,
                indicators=["Consistent trading behavior"]
            ))

        return emotions

    def calculate_mental_health(
        self,
        recent_trades: List[Dict[str, Any]],
        sessions: Optional[List[TradingSession]] = None
    ) -> MentalHealthMetrics:
        """Calculate comprehensive mental health metrics

        Args:
            recent_trades: List of recent trades
            sessions: Optional list of trading sessions

        Returns:
            Mental health metrics
        """
        if sessions is None:
            sessions = self._sessions

        # Calculate stress level
        stress_level = self._calculate_stress_level(recent_trades)

        # Calculate discipline score
        discipline_score = self._calculate_discipline_score(recent_trades, sessions)

        # Calculate emotional stability
        emotional_stability = self._calculate_emotional_stability(recent_trades)

        # Calculate fatigue level
        fatigue_level = self._calculate_fatigue_level(sessions)

        # Determine mental state
        state = self._determine_mental_state(
            stress_level, discipline_score, emotional_stability, fatigue_level
        )

        # Calculate consecutive patterns
        consecutive_losing_days = self._count_consecutive_losing_days(recent_trades)
        consecutive_winning_days = self._count_consecutive_winning_days(recent_trades)

        # Calculate days since break
        days_since_break = self._calculate_days_since_break(sessions)

        # Calculate risk scores
        risk_of_tilt = self._calculate_tilt_risk(
            recent_trades, stress_level, consecutive_losing_days
        )
        risk_of_burnout = self._calculate_burnout_risk(
            fatigue_level, days_since_break
        )

        # Generate recommendations
        recommendations = self._generate_mental_health_recommendations(
            state, stress_level, discipline_score, risk_of_tilt, risk_of_burnout
        )

        # Calculate overall score (weighted average)
        overall_score = (
            discipline_score * 0.3 +
            emotional_stability * 0.3 +
            (100 - stress_level) * 0.2 +
            (100 - fatigue_level) * 0.2
        )

        return MentalHealthMetrics(
            overall_score=overall_score,
            stress_level=stress_level,
            discipline_score=discipline_score,
            emotional_stability=emotional_stability,
            fatigue_level=fatigue_level,
            state=state,
            days_since_break=days_since_break,
            consecutive_losing_days=consecutive_losing_days,
            consecutive_winning_days=consecutive_winning_days,
            risk_of_tilt=risk_of_tilt,
            risk_of_burnout=risk_of_burnout,
            recommendations=recommendations
        )

    def check_discipline_violations(
        self,
        trade: Dict[str, Any]
    ) -> List[DisciplineViolation]:
        """Check if a trade violates discipline rules

        Args:
            trade: Trade to check

        Returns:
            List of violations found
        """
        violations = []

        if not self._discipline_rules:
            return violations

        # Check position size limits
        if 'max_position_size' in self._discipline_rules:
            max_size = self._discipline_rules['max_position_size']
            position_size = trade.get('quantity', 0) * trade.get('entry_price', 0)
            if position_size > max_size:
                violations.append(DisciplineViolation(
                    rule_type="position_size",
                    severity="high",
                    description=f"Position size ${position_size:.2f} exceeds limit ${max_size:.2f}",
                    trade_id=trade.get('id'),
                    timestamp=datetime.fromisoformat(trade.get('timestamp', datetime.now().isoformat())),
                    impact="Excessive risk exposure"
                ))

        # Check daily loss limits
        if 'max_daily_loss' in self._discipline_rules:
            # This would need to check cumulative daily loss
            pass

        # Check risk per trade
        if 'max_risk_per_trade' in self._discipline_rules:
            max_risk = self._discipline_rules['max_risk_per_trade']
            stop_loss = trade.get('stop_loss')
            if stop_loss:
                risk_amount = abs(trade.get('entry_price', 0) - stop_loss) * trade.get('quantity', 0)
                if risk_amount > max_risk:
                    violations.append(DisciplineViolation(
                        rule_type="risk_per_trade",
                        severity="high",
                        description=f"Risk ${risk_amount:.2f} exceeds limit ${max_risk:.2f}",
                        trade_id=trade.get('id'),
                        timestamp=datetime.fromisoformat(trade.get('timestamp', datetime.now().isoformat())),
                        impact="Excessive risk on single trade"
                    ))

        return violations

    def should_stop_trading(
        self,
        mental_health: MentalHealthMetrics,
        recent_trades: List[Dict[str, Any]]
    ) -> tuple[bool, str]:
        """Determine if trader should stop trading

        Args:
            mental_health: Current mental health metrics
            recent_trades: List of recent trades

        Returns:
            Tuple of (should_stop, reason)
        """
        # Critical conditions that require stopping
        if mental_health.state == MentalState.TILT:
            return True, "Tilt detected - emotional trading in progress"

        if mental_health.state == MentalState.BURNOUT:
            return True, "Burnout detected - mental exhaustion"

        if mental_health.risk_of_tilt > 0.8:
            return True, "High risk of tilt - take a break"

        if mental_health.consecutive_losing_days >= self.STRESS_CONSECUTIVE_LOSSES:
            return True, f"{mental_health.consecutive_losing_days} consecutive losing days - stop and review"

        if mental_health.stress_level > 80:
            return True, "Stress level too high for optimal trading"

        if mental_health.discipline_score < 50:
            return True, "Multiple discipline violations - stop and reset"

        # Check for rapid consecutive losses
        if len(recent_trades) >= 3:
            last_three = recent_trades[-3:]
            if all(t.get('profit', 0) < 0 for t in last_three):
                time_span = self._get_trade_time_span(last_three)
                if time_span and time_span < timedelta(minutes=30):
                    return True, "Rapid consecutive losses - emotional trading likely"

        return False, ""

    def generate_coaching_recommendations(
        self,
        mental_health: MentalHealthMetrics,
        emotions: List[EmotionScore],
        violations: List[DisciplineViolation]
    ) -> List[Dict[str, Any]]:
        """Generate AI coaching recommendations

        Args:
            mental_health: Mental health metrics
            emotions: Detected emotions
            violations: Discipline violations

        Returns:
            List of coaching recommendations
        """
        recommendations = []

        # State-based recommendations
        if mental_health.state == MentalState.TILT:
            recommendations.append({
                'type': 'urgent',
                'priority': 'critical',
                'title': 'Stop Trading Immediately',
                'message': 'You are in tilt. Stop trading and take a break.',
                'actions': [
                    'Close your trading platform',
                    'Take a 24-hour break',
                    'Review your trades when calm',
                    'Consider journaling your emotions'
                ]
            })

        # Emotion-based recommendations
        for emotion in emotions:
            if emotion.emotion == EmotionType.FEAR and emotion.score > 0.6:
                recommendations.append({
                    'type': 'warning',
                    'priority': 'high',
                    'title': 'Fear Detected',
                    'message': 'Your recent behavior shows signs of fear-based trading',
                    'actions': [
                        'Review your risk management rules',
                        'Consider reducing position sizes temporarily',
                        'Focus on high-probability setups only',
                        'Take a break if needed'
                    ]
                })
            elif emotion.emotion == EmotionType.GREED and emotion.score > 0.6:
                recommendations.append({
                    'type': 'warning',
                    'priority': 'high',
                    'title': 'Greed Detected',
                    'message': 'You may be overtrading or taking excessive risks',
                    'actions': [
                        'Review your position sizing',
                        'Stick to your trading plan',
                        'Consider taking some profits',
                        'Avoid FOMO (Fear Of Missing Out)'
                    ]
                })

        # Discipline-based recommendations
        if mental_health.discipline_score < 70:
            recommendations.append({
                'type': 'advice',
                'priority': 'medium',
                'title': 'Discipline Issues Detected',
                'message': f'Your discipline score is {mental_health.discipline_score:.1f}. Review your violations.',
                'actions': [
                    'Review recent discipline violations',
                    'Recommit to your trading rules',
                    'Consider using automated alerts',
                    'Keep a pre-trade checklist'
                ]
            })

        # Fatigue recommendations
        if mental_health.fatigue_level > 60:
            recommendations.append({
                'type': 'advice',
                'priority': 'medium',
                'title': 'Fatigue Detected',
                'message': 'You may be trading too much. Consider taking breaks.',
                'actions': [
                    f'You haven\'t taken a break in {mental_health.days_since_break} days',
                    'Schedule regular breaks',
                    'Limit daily trading hours',
                    'Focus on quality over quantity'
                ]
            })

        return recommendations

    # Private helper methods
    def _detect_fear(self, trades: List[Dict[str, Any]]) -> EmotionScore:
        """Detect fear-based trading"""
        indicators = []
        score = 0.0

        if not trades:
            return EmotionScore(EmotionType.FEAR, 0.0, 0.0, [])

        # Small positions after losses
        recent_losses = [t for t in trades[-5:] if t.get('profit', 0) < 0]
        if recent_losses:
            avg_loss_size = sum(abs(t.get('quantity', 0)) for t in recent_losses) / len(recent_losses)
            recent_winners = [t for t in trades[-5:] if t.get('profit', 0) > 0]
            if recent_winners:
                avg_win_size = sum(t.get('quantity', 0) for t in recent_winners) / len(recent_winners)
                if avg_loss_size > 0 and avg_win_size < avg_loss_size * 0.7:
                    score += 0.4
                    indicators.append("Reducing position size after losses")

        # Hesitation (long gaps after losses)
        for i in range(len(trades) - 1):
            if trades[i].get('profit', 0) < 0:
                time_diff = self._get_time_diff_minutes(trades[i], trades[i + 1])
                if time_diff and time_diff > 120:  # 2 hours
                    score += 0.2
                    indicators.append("Long hesitation after losses")
                    break

        return EmotionScore(EmotionType.FEAR, min(score, 1.0), 0.7, indicators)

    def _detect_greed(self, trades: List[Dict[str, Any]]) -> EmotionScore:
        """Detect greed-based trading"""
        indicators = []
        score = 0.0

        if len(trades) < 3:
            return EmotionScore(EmotionType.GREED, 0.0, 0.0, [])

        # Overtrading
        recent_24h = [t for t in trades if self._is_within_hours(t, 24)]
        if len(recent_24h) > 15:
            score += 0.3
            indicators.append(f"High frequency trading: {len(recent_24h)} trades in 24h")

        # Increasing position size after wins
        recent_wins = [t for t in trades[-5:] if t.get('profit', 0) > 0]
        if len(recent_wins) >= 2:
            sizes = [t.get('quantity', 0) for t in recent_wins]
            if all(sizes[i] < sizes[i + 1] for i in range(len(sizes) - 1)):
                score += 0.4
                indicators.append("Increasing position size after wins")

        return EmotionScore(EmotionType.GREED, min(score, 1.0), 0.7, indicators)

    def _detect_frustration(self, trades: List[Dict[str, Any]]) -> EmotionScore:
        """Detect frustration and revenge trading"""
        indicators = []
        score = 0.0

        if len(trades) < 2:
            return EmotionScore(EmotionType.FRUSTRATION, 0.0, 0.0, [])

        # Quick re-entry after losses
        for i in range(len(trades) - 1):
            if trades[i].get('profit', 0) < 0:
                time_diff = self._get_time_diff_minutes(trades[i], trades[i + 1])
                if time_diff and time_diff < self.TILT_RAPID_ENTRY_MINUTES:
                    score += 0.5
                    indicators.append("Rapid re-entry after loss (revenge trading)")
                    break

        # Multiple consecutive losses
        consecutive_losses = 0
        for trade in reversed(trades):
            if trade.get('profit', 0) < 0:
                consecutive_losses += 1
            else:
                break
        if consecutive_losses >= 3:
            score += 0.3
            indicators.append(f"{consecutive_losses} consecutive losses")

        return EmotionScore(EmotionType.FRUSTRATION, min(score, 1.0), 0.8, indicators)

    def _detect_euphoria(self, trades: List[Dict[str, Any]]) -> EmotionScore:
        """Detect euphoria and overconfidence"""
        indicators = []
        score = 0.0

        if len(trades) < 3:
            return EmotionScore(EmotionType.EUPHORIA, 0.0, 0.0, [])

        # Multiple consecutive wins
        consecutive_wins = 0
        for trade in reversed(trades):
            if trade.get('profit', 0) > 0:
                consecutive_wins += 1
            else:
                break

        if consecutive_wins >= 4:
            # Check for increasing risk after wins
            recent_wins = [t for t in trades[-consecutive_wins:]]
            sizes = [t.get('quantity', 0) for t in recent_wins]
            if sizes[-1] > sizes[0] * 1.5:
                score += 0.5
                indicators.append(f"{consecutive_wins} wins with increasing position size")

        return EmotionScore(EmotionType.EUPHORIA, min(score, 1.0), 0.6, indicators)

    def _calculate_stress_level(self, trades: List[Dict[str, Any]]) -> float:
        """Calculate stress level (0-100)"""
        stress = 0.0

        if not trades:
            return 0.0

        # Recent losses increase stress
        recent_10 = trades[-10:] if len(trades) >= 10 else trades
        losses = [t for t in recent_10 if t.get('profit', 0) < 0]
        loss_rate = len(losses) / len(recent_10) if recent_10 else 0
        stress += loss_rate * 40

        # Consecutive losses
        consecutive_losses = 0
        for trade in reversed(trades):
            if trade.get('profit', 0) < 0:
                consecutive_losses += 1
            else:
                break
        stress += min(consecutive_losses * 10, 30)

        # Large losses
        if trades:
            large_losses = [t for t in trades[-20:] if t.get('profit', 0) < -1000]
            stress += min(len(large_losses) * 10, 30)

        return min(stress, 100.0)

    def _calculate_discipline_score(
        self,
        trades: List[Dict[str, Any]],
        sessions: List[TradingSession]
    ) -> float:
        """Calculate discipline score (0-100)"""
        if not trades and not sessions:
            return 100.0

        # Count violations
        total_violations = sum(len(s.violations) for s in sessions)
        total_trades = sum(s.trades_count for s in sessions) if sessions else len(trades)

        if total_trades == 0:
            return 100.0

        # Calculate score based on violation rate
        violation_rate = total_violations / max(total_trades, 1)
        discipline_score = max(0, 100 - (violation_rate * 100))

        return discipline_score

    def _calculate_emotional_stability(self, trades: List[Dict[str, Any]]) -> float:
        """Calculate emotional stability (0-100)"""
        if len(trades) < 5:
            return 80.0  # Not enough data

        # Check for erratic behavior
        recent_20 = trades[-20:] if len(trades) >= 20 else trades

        # Position size variance
        sizes = [t.get('quantity', 0) for t in recent_20]
        if sizes:
            avg_size = sum(sizes) / len(sizes)
            variance = sum((s - avg_size) ** 2 for s in sizes) / len(sizes)
            size_stability = max(0, 100 - (variance / (avg_size ** 2) * 100)) if avg_size > 0 else 50

            # Time consistency
            time_diffs = []
            for i in range(len(recent_20) - 1):
                diff = self._get_time_diff_minutes(recent_20[i], recent_20[i + 1])
                if diff:
                    time_diffs.append(diff)

            if time_diffs:
                avg_time = sum(time_diffs) / len(time_diffs)
                time_variance = sum((t - avg_time) ** 2 for t in time_diffs) / len(time_diffs)
                time_stability = max(0, 100 - (time_variance / (avg_time ** 2) * 50)) if avg_time > 0 else 50
            else:
                time_stability = 80

            return (size_stability + time_stability) / 2

        return 80.0

    def _calculate_fatigue_level(self, sessions: List[TradingSession]) -> float:
        """Calculate fatigue level (0-100)"""
        if not sessions:
            return 0.0

        recent_7_days = [s for s in sessions if self._is_session_within_days(s, 7)]

        if not recent_7_days:
            return 0.0

        # Hours traded
        total_hours = 0
        for session in recent_7_days:
            if session.end_time:
                duration = (session.end_time - session.start_time).total_seconds() / 3600
                total_hours += duration

        # Number of consecutive trading days
        consecutive_days = self._count_consecutive_trading_days(sessions)

        fatigue = 0.0
        fatigue += min((total_hours / 7) * 2, 40)  # Hours per day factor
        fatigue += min(consecutive_days * 3, 40)    # Consecutive days factor
        fatigue += min(len(recent_7_days) * 5, 20)  # Session count factor

        return min(fatigue, 100.0)

    def _determine_mental_state(
        self,
        stress: float,
        discipline: float,
        stability: float,
        fatigue: float
    ) -> MentalState:
        """Determine overall mental state"""
        # Critical conditions
        if stress > 80 or fatigue > 80:
            return MentalState.TILT
        if fatigue > 70 or discipline < 40:
            return MentalState.BURNOUT

        # Calculate weighted score
        score = (discipline * 0.3 + stability * 0.3 +
                (100 - stress) * 0.2 + (100 - fatigue) * 0.2)

        if score >= 75:
            return MentalState.OPTIMAL
        elif score >= 60:
            return MentalState.CAUTIOUS
        elif score >= 45:
            return MentalState.STRESSED
        else:
            return MentalState.TILT

    def _calculate_tilt_risk(
        self,
        trades: List[Dict[str, Any]],
        stress_level: float,
        consecutive_losses: int
    ) -> float:
        """Calculate risk of tilt (0-1)"""
        risk = 0.0

        # Stress contributes to tilt risk
        risk += (stress_level / 100) * 0.4

        # Consecutive losses
        if consecutive_losses >= 2:
            risk += min(consecutive_losses * 0.15, 0.4)

        # Recent rapid trading
        recent_1h = [t for t in trades if self._is_within_hours(t, 1)]
        if len(recent_1h) > 5:
            risk += 0.2

        return min(risk, 1.0)

    def _calculate_burnout_risk(
        self,
        fatigue_level: float,
        days_since_break: int
    ) -> float:
        """Calculate risk of burnout (0-1)"""
        risk = 0.0

        # Fatigue contributes to burnout
        risk += (fatigue_level / 100) * 0.5

        # Days without break
        if days_since_break > 14:
            risk += min((days_since_break - 14) * 0.05, 0.5)

        return min(risk, 1.0)

    def _generate_mental_health_recommendations(
        self,
        state: MentalState,
        stress: float,
        discipline: float,
        tilt_risk: float,
        burnout_risk: float
    ) -> List[str]:
        """Generate mental health recommendations"""
        recommendations = []

        if state in [MentalState.TILT, MentalState.BURNOUT]:
            recommendations.append("⚠️ STOP TRADING IMMEDIATELY")
            recommendations.append("Take at least 24 hours off")

        if stress > 60:
            recommendations.append("Practice stress management techniques")
            recommendations.append("Review and adjust your risk parameters")

        if discipline < 70:
            recommendations.append("Review your discipline violations")
            recommendations.append("Recommit to your trading rules")

        if tilt_risk > 0.6:
            recommendations.append("High risk of emotional trading detected")
            recommendations.append("Take a break before your next trade")

        if burnout_risk > 0.6:
            recommendations.append("Signs of fatigue - schedule time off")
            recommendations.append("Reduce daily trading hours")

        if not recommendations:
            recommendations.append("Mental state is good - continue trading carefully")

        return recommendations

    # Utility methods
    def _count_consecutive_losing_days(self, trades: List[Dict[str, Any]]) -> int:
        """Count consecutive losing days"""
        if not trades:
            return 0

        # Group trades by day
        daily_pnl: Dict[str, float] = {}
        for trade in trades:
            date = trade.get('timestamp', '')[:10]  # Get date part
            daily_pnl[date] = daily_pnl.get(date, 0) + trade.get('profit', 0)

        # Count consecutive losing days from most recent
        consecutive = 0
        for date in sorted(daily_pnl.keys(), reverse=True):
            if daily_pnl[date] < 0:
                consecutive += 1
            else:
                break

        return consecutive

    def _count_consecutive_winning_days(self, trades: List[Dict[str, Any]]) -> int:
        """Count consecutive winning days"""
        if not trades:
            return 0

        # Group trades by day
        daily_pnl: Dict[str, float] = {}
        for trade in trades:
            date = trade.get('timestamp', '')[:10]
            daily_pnl[date] = daily_pnl.get(date, 0) + trade.get('profit', 0)

        # Count consecutive winning days from most recent
        consecutive = 0
        for date in sorted(daily_pnl.keys(), reverse=True):
            if daily_pnl[date] > 0:
                consecutive += 1
            else:
                break

        return consecutive

    def _calculate_days_since_break(self, sessions: List[TradingSession]) -> int:
        """Calculate days since last break"""
        if not sessions:
            return 0

        # Sort sessions by start time
        sorted_sessions = sorted(sessions, key=lambda s: s.start_time, reverse=True)

        consecutive_days = 0
        last_date = None

        for session in sorted_sessions:
            session_date = session.start_time.date()
            if last_date is None:
                last_date = session_date
                consecutive_days = 1
            elif (last_date - session_date).days == 1:
                consecutive_days += 1
                last_date = session_date
            else:
                break

        return consecutive_days

    def _count_consecutive_trading_days(self, sessions: List[TradingSession]) -> int:
        """Count consecutive trading days"""
        return self._calculate_days_since_break(sessions)

    def _get_time_diff_minutes(
        self,
        trade1: Dict[str, Any],
        trade2: Dict[str, Any]
    ) -> Optional[float]:
        """Get time difference between trades in minutes"""
        try:
            time1 = datetime.fromisoformat(trade1.get('timestamp', ''))
            time2 = datetime.fromisoformat(trade2.get('timestamp', ''))
            return abs((time2 - time1).total_seconds() / 60)
        except (ValueError, TypeError):
            return None

    def _get_trade_time_span(self, trades: List[Dict[str, Any]]) -> Optional[timedelta]:
        """Get time span of trades"""
        if len(trades) < 2:
            return None

        try:
            times = [datetime.fromisoformat(t.get('timestamp', '')) for t in trades]
            return max(times) - min(times)
        except (ValueError, TypeError):
            return None

    def _is_within_hours(self, trade: Dict[str, Any], hours: int) -> bool:
        """Check if trade is within specified hours from now"""
        try:
            trade_time = datetime.fromisoformat(trade.get('timestamp', ''))
            return (datetime.now() - trade_time).total_seconds() < hours * 3600
        except (ValueError, TypeError):
            return False

    def _is_session_within_days(self, session: TradingSession, days: int) -> bool:
        """Check if session is within specified days"""
        return (datetime.now() - session.start_time).days < days
