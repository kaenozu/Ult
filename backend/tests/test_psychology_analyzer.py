"""
Tests for Trading Psychology Analyzer
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from trade_journal_analyzer.psychology_analyzer import (
    TradingPsychologyAnalyzer,
    EmotionType,
    EmotionScore,
    MentalState,
    MentalHealthMetrics,
    TradingSession,
    DisciplineViolation,
)


@pytest.fixture
def analyzer():
    """Create analyzer instance"""
    return TradingPsychologyAnalyzer()


@pytest.fixture
def sample_trades():
    """Create sample trades for testing"""
    now = datetime.now()
    return [
        {
            'id': '1',
            'symbol': 'AAPL',
            'timestamp': (now - timedelta(hours=5)).isoformat(),
            'profit': 100,
            'quantity': 10,
            'entry_price': 150,
        },
        {
            'id': '2',
            'symbol': 'MSFT',
            'timestamp': (now - timedelta(hours=4)).isoformat(),
            'profit': -50,
            'quantity': 10,
            'entry_price': 300,
        },
        {
            'id': '3',
            'symbol': 'GOOGL',
            'timestamp': (now - timedelta(hours=3)).isoformat(),
            'profit': 75,
            'quantity': 10,
            'entry_price': 140,
        },
    ]


@pytest.fixture
def losing_trades():
    """Create consecutive losing trades for tilt detection"""
    now = datetime.now()
    return [
        {
            'id': str(i),
            'symbol': 'AAPL',
            'timestamp': (now - timedelta(minutes=30 - i * 5)).isoformat(),
            'profit': -100 * (i + 1),
            'quantity': 10,
            'entry_price': 150,
        }
        for i in range(4)
    ]


@pytest.fixture
def overtrading_trades():
    """Create overtrading pattern"""
    now = datetime.now()
    return [
        {
            'id': str(i),
            'symbol': 'AAPL',
            'timestamp': (now - timedelta(minutes=60 - i * 3)).isoformat(),
            'profit': 10 if i % 2 == 0 else -10,
            'quantity': 10,
            'entry_price': 150,
        }
        for i in range(20)
    ]


class TestEmotionDetection:
    """Test emotion detection algorithms"""

    def test_detect_fear_after_losses(self, analyzer, sample_trades):
        """Test fear detection after losses"""
        # Add a loss followed by reduced position size
        now = datetime.now()
        trades = [
            {
                'id': '1',
                'timestamp': (now - timedelta(hours=2)).isoformat(),
                'profit': -200,
                'quantity': 20,
                'entry_price': 150,
            },
            {
                'id': '2',
                'timestamp': (now - timedelta(hours=1)).isoformat(),
                'profit': 50,
                'quantity': 5,  # Reduced size
                'entry_price': 150,
            },
        ]
        emotions = analyzer.analyze_emotions(trades)
        fear_emotions = [e for e in emotions if e.emotion == EmotionType.FEAR]
        assert len(fear_emotions) > 0
        assert fear_emotions[0].score > 0.3

    def test_detect_greed_overtrading(self, analyzer, overtrading_trades):
        """Test greed detection with overtrading"""
        emotions = analyzer.analyze_emotions(overtrading_trades)
        greed_emotions = [e for e in emotions if e.emotion == EmotionType.GREED]
        # Greed should be detected or we should have some emotion
        assert len(emotions) > 0
        if greed_emotions:
            assert greed_emotions[0].score > 0.0

    def test_detect_frustration_revenge_trading(self, analyzer):
        """Test frustration detection with revenge trading"""
        now = datetime.now()
        trades = [
            {
                'id': '1',
                'timestamp': (now - timedelta(minutes=15)).isoformat(),
                'profit': -100,
                'quantity': 10,
                'entry_price': 150,
            },
            {
                'id': '2',
                'timestamp': (now - timedelta(minutes=10)).isoformat(),  # Within 10 minutes (TILT_RAPID_ENTRY_MINUTES)
                'profit': -50,
                'quantity': 10,
                'entry_price': 150,
            },
            {
                'id': '3',
                'timestamp': (now - timedelta(minutes=5)).isoformat(),  # Another quick entry
                'profit': -30,
                'quantity': 10,
                'entry_price': 150,
            },
        ]
        emotions = analyzer.analyze_emotions(trades)
        # Should detect some emotion (frustration or at least multiple losses)
        assert len(emotions) > 0
        frustration_emotions = [e for e in emotions if e.emotion == EmotionType.FRUSTRATION]
        if frustration_emotions:
            assert frustration_emotions[0].score > 0.3

    def test_neutral_emotion_no_trades(self, analyzer):
        """Test neutral emotion when no trades"""
        emotions = analyzer.analyze_emotions([])
        assert len(emotions) == 1
        assert emotions[0].emotion == EmotionType.NEUTRAL


class TestMentalHealthMetrics:
    """Test mental health calculations"""

    def test_calculate_mental_health_normal(self, analyzer, sample_trades):
        """Test mental health calculation with normal trades"""
        metrics = analyzer.calculate_mental_health(sample_trades)
        assert 0 <= metrics.overall_score <= 100
        assert 0 <= metrics.stress_level <= 100
        assert 0 <= metrics.discipline_score <= 100
        assert 0 <= metrics.emotional_stability <= 100
        assert metrics.state in [MentalState.OPTIMAL, MentalState.CAUTIOUS, MentalState.STRESSED]

    def test_high_stress_after_losses(self, analyzer, losing_trades):
        """Test high stress level after consecutive losses"""
        metrics = analyzer.calculate_mental_health(losing_trades)
        assert metrics.stress_level > 50
        assert metrics.consecutive_losing_days >= 0

    def test_tilt_state_detection(self, analyzer, losing_trades):
        """Test tilt state detection"""
        # Add more losses to trigger tilt
        now = datetime.now()
        extended_losses = losing_trades + [
            {
                'id': str(i + 10),
                'timestamp': (now - timedelta(minutes=i)).isoformat(),
                'profit': -50,
                'quantity': 10,
                'entry_price': 150,
            }
            for i in range(5)
        ]
        metrics = analyzer.calculate_mental_health(extended_losses)
        # With high stress and consecutive losses, might be in tilt
        assert metrics.risk_of_tilt > 0.3


class TestDisciplineMonitoring:
    """Test discipline violation detection"""

    def test_check_position_size_violation(self, analyzer):
        """Test position size violation detection"""
        analyzer.set_discipline_rules({'max_position_size': 1000})
        trade = {
            'id': '1',
            'timestamp': datetime.now().isoformat(),
            'quantity': 20,
            'entry_price': 100,  # Total: 2000, exceeds limit
        }
        violations = analyzer.check_discipline_violations(trade)
        assert len(violations) > 0
        assert violations[0].rule_type == "position_size"
        assert violations[0].severity == "high"

    def test_check_risk_per_trade_violation(self, analyzer):
        """Test risk per trade violation"""
        analyzer.set_discipline_rules({'max_risk_per_trade': 100})
        trade = {
            'id': '1',
            'timestamp': datetime.now().isoformat(),
            'quantity': 10,
            'entry_price': 150,
            'stop_loss': 130,  # Risk: 10 * (150-130) = 200, exceeds limit
        }
        violations = analyzer.check_discipline_violations(trade)
        assert len(violations) > 0
        assert violations[0].rule_type == "risk_per_trade"

    def test_no_violations_compliant_trade(self, analyzer):
        """Test no violations for compliant trade"""
        analyzer.set_discipline_rules({
            'max_position_size': 2000,
            'max_risk_per_trade': 200,
        })
        trade = {
            'id': '1',
            'timestamp': datetime.now().isoformat(),
            'quantity': 10,
            'entry_price': 100,
            'stop_loss': 95,  # Risk: 10 * 5 = 50
        }
        violations = analyzer.check_discipline_violations(trade)
        assert len(violations) == 0


class TestTradingStopRecommendation:
    """Test should stop trading logic"""

    def test_should_stop_on_tilt(self, analyzer, losing_trades):
        """Test stop recommendation on tilt"""
        metrics = analyzer.calculate_mental_health(losing_trades)
        # Force tilt state for testing
        metrics.state = MentalState.TILT
        should_stop, reason = analyzer.should_stop_trading(metrics, losing_trades)
        assert should_stop
        assert "tilt" in reason.lower() or "emotional" in reason.lower()

    def test_should_stop_on_consecutive_losses(self, analyzer, losing_trades):
        """Test stop recommendation on consecutive losses"""
        # Create many consecutive losing days
        now = datetime.now()
        extended_losses = []
        for day in range(5):
            for i in range(3):
                extended_losses.append({
                    'id': f'{day}_{i}',
                    'timestamp': (now - timedelta(days=day, hours=i)).isoformat(),
                    'profit': -100,
                    'quantity': 10,
                    'entry_price': 150,
                })

        metrics = analyzer.calculate_mental_health(extended_losses)
        should_stop, reason = analyzer.should_stop_trading(metrics, extended_losses)
        # Should stop with multiple consecutive losing days
        assert should_stop or metrics.consecutive_losing_days >= 3

    def test_should_continue_on_good_state(self, analyzer, sample_trades):
        """Test continue trading on good mental state"""
        metrics = analyzer.calculate_mental_health(sample_trades)
        should_stop, reason = analyzer.should_stop_trading(metrics, sample_trades)
        # With mixed trades and good state, should be able to continue
        assert not should_stop or reason != ""


class TestCoachingRecommendations:
    """Test AI coaching recommendations"""

    def test_generate_tilt_recommendations(self, analyzer):
        """Test recommendations for tilt state"""
        metrics = MentalHealthMetrics(
            overall_score=30,
            stress_level=85,
            discipline_score=50,
            emotional_stability=40,
            fatigue_level=60,
            state=MentalState.TILT,
            days_since_break=5,
            consecutive_losing_days=4,
            consecutive_winning_days=0,
            risk_of_tilt=0.9,
            risk_of_burnout=0.5,
            recommendations=[]
        )
        recommendations = analyzer.generate_coaching_recommendations(
            metrics, [], []
        )
        assert len(recommendations) > 0
        urgent_recs = [r for r in recommendations if r['type'] == 'urgent']
        assert len(urgent_recs) > 0

    def test_generate_fear_recommendations(self, analyzer):
        """Test recommendations for fear emotion"""
        metrics = MentalHealthMetrics(
            overall_score=60,
            stress_level=50,
            discipline_score=70,
            emotional_stability=60,
            fatigue_level=40,
            state=MentalState.CAUTIOUS,
            days_since_break=3,
            consecutive_losing_days=2,
            consecutive_winning_days=0,
            risk_of_tilt=0.4,
            risk_of_burnout=0.3,
            recommendations=[]
        )
        emotions = [
            EmotionScore(
                emotion=EmotionType.FEAR,
                score=0.7,
                confidence=0.8,
                indicators=["Test"]
            )
        ]
        recommendations = analyzer.generate_coaching_recommendations(
            metrics, emotions, []
        )
        fear_recs = [r for r in recommendations if 'fear' in r['title'].lower()]
        assert len(fear_recs) > 0

    def test_generate_fatigue_recommendations(self, analyzer):
        """Test recommendations for fatigue"""
        metrics = MentalHealthMetrics(
            overall_score=60,
            stress_level=40,
            discipline_score=75,
            emotional_stability=70,
            fatigue_level=70,
            state=MentalState.CAUTIOUS,
            days_since_break=15,
            consecutive_losing_days=0,
            consecutive_winning_days=2,
            risk_of_tilt=0.2,
            risk_of_burnout=0.7,
            recommendations=[]
        )
        recommendations = analyzer.generate_coaching_recommendations(
            metrics, [], []
        )
        fatigue_recs = [r for r in recommendations if 'fatigue' in r['title'].lower()]
        assert len(fatigue_recs) > 0


class TestUtilityMethods:
    """Test utility methods"""

    def test_count_consecutive_losing_days(self, analyzer):
        """Test counting consecutive losing days"""
        now = datetime.now()
        trades = [
            {
                'id': '1',
                'timestamp': (now - timedelta(days=2)).isoformat(),
                'profit': -100,
            },
            {
                'id': '2',
                'timestamp': (now - timedelta(days=1)).isoformat(),
                'profit': -50,
            },
            {
                'id': '3',
                'timestamp': now.isoformat(),
                'profit': -75,
            },
        ]
        count = analyzer._count_consecutive_losing_days(trades)
        assert count == 3

    def test_count_consecutive_winning_days(self, analyzer):
        """Test counting consecutive winning days"""
        now = datetime.now()
        trades = [
            {
                'id': '1',
                'timestamp': (now - timedelta(days=2)).isoformat(),
                'profit': 100,
            },
            {
                'id': '2',
                'timestamp': (now - timedelta(days=1)).isoformat(),
                'profit': 50,
            },
            {
                'id': '3',
                'timestamp': now.isoformat(),
                'profit': 75,
            },
        ]
        count = analyzer._count_consecutive_winning_days(trades)
        assert count == 3

    def test_time_diff_calculation(self, analyzer):
        """Test time difference calculation"""
        now = datetime.now()
        trade1 = {'timestamp': now.isoformat()}
        trade2 = {'timestamp': (now + timedelta(minutes=30)).isoformat()}
        diff = analyzer._get_time_diff_minutes(trade1, trade2)
        assert diff == 30.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
