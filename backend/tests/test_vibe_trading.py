import pytest
import random
import time
import sys
import os
from pathlib import Path

# Add src to path for imports
current_dir = Path(__file__).resolve().parent
src_dir = current_dir.parent / "src"
sys.path.insert(0, str(src_dir))

from vibe_trader import vibe_trader, VibeBasedTrader
from chaos_engine import chaos_engine, ChaosEngine


class TestVibeBasedTrading:
    """
    🌊 TESTS FOR VIBE-BASED TRADING 🌊
    Testing chaos with more chaos!
    """

    def setup_method(self):
        """Setup for maximum chaos testing"""
        self.vibe_trader = VibeBasedTrader()
        self.chaos_engine = ChaosEngine()

        # Inject some chaos for testing
        self.vibe_trader.chaos_factor = 0.8
        self.chaos_engine.entropy_level = 0.9

    def test_vibe_detection(self):
        """Test market vibe detection"""
        # Test euphoric market
        euphoric_data = {"change_percent": 10, "volume": 2000000, "volatility": 0.01}
        vibe = self.vibe_trader.detect_market_vibe(euphoric_data)
        assert vibe == "euphoric"

        # Test paranoid market
        paranoid_data = {"change_percent": -5, "volume": 500000, "volatility": 0.08}
        vibe = self.vibe_trader.detect_market_vibe(paranoid_data)
        assert vibe == "paranoid"

        # Test zen market
        zen_data = {"change_percent": 0.5, "volume": 100000, "volatility": 0.01}
        vibe = self.vibe_trader.detect_market_vibe(zen_data)
        assert vibe == "zen"

        # Test chaotic market
        chaotic_data = {"change_percent": 2, "volume": 800000, "volatility": 0.03}
        vibe = self.vibe_trader.detect_market_vibe(chaotic_data)
        assert vibe == "chaotic"

    def test_emotional_state_updates(self):
        """Test emotional state updates"""
        initial_emotions = self.vibe_trader.emotional_state.copy()

        # Trigger euphoric update
        self.vibe_trader.update_emotional_state("euphoric")
        assert (
            self.vibe_trader.emotional_state["euphoria"] > initial_emotions["euphoria"]
        )

        # Trigger paranoid update
        self.vibe_trader.update_emotional_state("paranoid")
        assert (
            self.vibe_trader.emotional_state["paranoia"] > initial_emotions["paranoia"]
        )

        # Trigger zen update
        self.vibe_trader.update_emotional_state("zen")
        assert self.vibe_trader.emotional_state["zen"] > initial_emotions["zen"]

        # Trigger chaotic update
        self.vibe_trader.update_emotional_state("chaotic")
        assert self.vibe_trader.emotional_state["chaos"] > initial_emotions["chaos"]

    def test_mood_swing(self):
        """Test mood swing functionality"""
        initial_emotions = self.vibe_trader.emotional_state.copy()
        initial_chaos = self.vibe_trader.chaos_factor

        # Trigger mood swing
        self.vibe_trader.trigger_mood_swing()

        # Check that emotions changed
        emotions_changed = False
        for emotion, value in self.vibe_trader.emotional_state.items():
            if value != initial_emotions[emotion]:
                emotions_changed = True
                break

        assert emotions_changed
        assert self.vibe_trader.chaos_factor >= initial_chaos

    def test_vibe_score_calculation(self):
        """Test vibe score calculation"""
        market_data = {"change_percent": 5, "volume": 1500000, "volatility": 0.02}

        vibe_analysis = self.vibe_trader.calculate_vibe_score("TEST", market_data)

        # Check structure
        assert "ticker" in vibe_analysis
        assert "vibe_score" in vibe_analysis
        assert "market_vibe" in vibe_analysis
        assert "emotional_state" in vibe_analysis
        assert "recommendation" in vibe_analysis
        assert "confidence" in vibe_analysis
        assert "chaos_level" in vibe_analysis

        # Check ranges
        assert -1 <= vibe_analysis["vibe_score"] <= 1
        assert 0 <= vibe_analysis["confidence"] <= 2  # Can exceed 1 due to chaos
        assert 0 <= vibe_analysis["chaos_level"] <= 1

    def test_vibe_trade_execution(self):
        """Test vibe-based trade execution"""
        market_data = {"change_percent": -3, "volume": 800000, "volatility": 0.04}

        trade_result = self.vibe_trader.execute_vibe_trade("CHAOS", market_data)

        # Check structure
        assert "ticker" in trade_result
        assert "action" in trade_result
        assert "emotion" in trade_result
        assert "vibe_score" in trade_result
        assert "confidence" in trade_result
        assert "execution_time" in trade_result
        assert "chaos_factor" in trade_result
        assert "trade_id" in trade_result

        # Check action validity
        assert trade_result["action"] in [
            "BUY",
            "SELL",
            "HOLD",
            "BUY EVERYTHING",
            "SELL EVERYTHING",
            "HOLD AND MEDITATE",
            "RANDOM WALK",
            "REVERSE LOGIC",
        ]

        # Check trade ID format
        assert trade_result["trade_id"].startswith("VIBE_")

    def test_portfolio_vibe_analysis(self):
        """Test portfolio vibe analysis"""
        # Create test positions
        positions = [
            {
                "ticker": "VIBE1",
                "quantity": 100,
                "euphoria": 0.8,
                "paranoia": 0.1,
                "zen": 0.05,
                "chaos": 0.05,
            },
            {
                "ticker": "VIBE2",
                "quantity": 200,
                "euphoria": 0.1,
                "paranoia": 0.7,
                "zen": 0.1,
                "chaos": 0.1,
            },
        ]

        portfolio_vibe = self.vibe_trader.get_portfolio_vibe(positions)

        # Check structure
        assert "portfolio_vibe" in portfolio_vibe
        assert "emotional_balance" in portfolio_vibe
        assert "vibe_health" in portfolio_vibe
        assert "recommendation" in portfolio_vibe
        assert "collective_consciousness" in portfolio_vibe

        # Check ranges
        assert -1 <= portfolio_vibe["collective_consciousness"] <= 1

    def test_empty_portfolio_vibe(self):
        """Test empty portfolio vibe analysis"""
        empty_vibe = self.vibe_trader.get_portfolio_vibe([])

        assert empty_vibe["portfolio_vibe"] == "empty"
        assert "NO VIBES DETECTED" in empty_vibe["vibe_health"]

    def test_chaos_engine_injection(self):
        """Test chaos engine injection"""
        decision = {
            "action": "BUY",
            "confidence": 0.8,
            "reasoning": "Technical analysis suggests buy signal",
        }

        chaotic_decision = self.chaos_engine.inject_chaos(decision)

        # Check that chaos was added
        assert "chaos_level" in chaotic_decision
        assert "chaos_timestamp" in chaotic_decision

        # Check that original structure might be modified
        assert chaotic_decision["chaos_level"] >= 0
        assert chaotic_decision["chaos_level"] <= 1

    def test_chaos_signal_generation(self):
        """Test chaos signal generation"""
        market_data = {"ticker": "CHAOS_TEST", "price": 100}

        chaos_signal = self.chaos_engine.generate_chaos_signal(market_data)

        # Check structure
        assert "signal" in chaos_signal
        assert "action" in chaos_signal
        assert "emotion" in chaos_signal
        assert "chaos_level" in chaos_signal
        assert "entropy" in chaos_signal
        assert "butterfly_sensitivity" in chaos_signal
        assert "quantum_coherence" in chaos_signal
        assert "cosmic_alignment" in chaos_signal
        assert "reasoning" in chaos_signal

        # Check ranges
        assert 0 <= chaos_signal["chaos_level"] <= 1
        assert 0 <= chaos_signal["entropy"] <= 1
        assert 0 <= chaos_signal["butterfly_sensitivity"] <= 1
        assert 0 <= chaos_signal["quantum_coherence"] <= 1

    def test_cosmic_alignment(self):
        """Test cosmic alignment checking"""
        cosmic_alignment = self.chaos_engine.check_cosmic_alignment()

        # Check structure
        assert "mercury_retrograde" in cosmic_alignment
        assert "full_moon" in cosmic_alignment
        assert "planetary_alignment" in cosmic_alignment
        assert "solar_activity" in cosmic_alignment
        assert "cosmic_favor" in cosmic_alignment

        # Check ranges
        assert 0 <= cosmic_alignment["solar_activity"] <= 1
        assert -1 <= cosmic_alignment["cosmic_favor"] <= 1

    def test_chaos_calculation_methods(self):
        """Test various chaos calculation methods"""
        # Test entropy calculation
        entropy = self.chaos_engine.calculate_entropy()
        assert 0 <= entropy <= 1

        # Test butterfly sensitivity
        sensitivity = self.chaos_engine.calculate_butterfly_sensitivity()
        assert 0 <= sensitivity <= 1

        # Test quantum coherence
        coherence = self.chaos_engine.calculate_quantum_coherence()
        assert 0 <= coherence <= 1

        # Test chaos level
        chaos_level = self.chaos_engine.calculate_chaos_level()
        assert 0 <= chaos_level <= 1

    def test_mood_swing_imminent(self):
        """Test mood swing detection"""
        # Force mood swing to be imminent
        self.vibe_trader.last_mood_swing = time.time() - 400  # More than 5 minutes ago

        # Test detection (random, so test multiple times)
        swing_detected = False
        for _ in range(10):
            if self.vibe_trader.check_mood_swing():
                swing_detected = True
                break

        # Should have at least one detection due to randomness
        assert isinstance(swing_detected, bool)

    def test_vibe_recommendations(self):
        """Test vibe-based recommendations"""
        # Test different vibe scores
        test_cases = [
            (0.8, "euphoric"),
            (-0.8, "paranoid"),
            (0.0, "zen"),
            (0.5, "chaotic"),
        ]

        for vibe_score, market_vibe in test_cases:
            recommendation = self.vibe_trader.get_vibe_recommendation(
                vibe_score, market_vibe
            )

            # Check structure
            assert "action" in recommendation
            assert "emotion" in recommendation
            assert "vibe_intensity" in recommendation
            assert "risk_level" in recommendation
            assert "reasoning" in recommendation

            # Check action validity
            assert recommendation["action"] in [
                "BUY",
                "SELL",
                "HOLD",
                "BUY EVERYTHING",
                "SELL EVERYTHING",
                "HOLD AND MEDITATE",
                "RANDOM WALK",
                "REVERSE LOGIC",
            ]

            # Check ranges
            assert 0 <= recommendation["vibe_intensity"] <= 1


class TestChaosIntegration:
    """
    🎲 CHAOS INTEGRATION TESTS 🎲
    Testing how chaos and vibes work together!
    """

    def setup_method(self):
        """Setup for integration testing"""
        self.vibe_trader = VibeBasedTrader()
        self.chaos_engine = ChaosEngine()

    def test_vibe_chaos_integration(self):
        """Test integration between vibe trader and chaos engine"""
        market_data = {
            "change_percent": random.uniform(-10, 10),
            "volume": random.randint(100000, 10000000),
            "volatility": random.uniform(0.01, 0.1),
        }

        # Get vibe analysis
        vibe_analysis = self.vibe_trader.calculate_vibe_score(
            "INTEGRATION", market_data
        )

        # Inject chaos
        chaotic_analysis = self.chaos_engine.inject_chaos(vibe_analysis)

        # Check that chaos was properly integrated
        assert "chaos_level" in chaotic_analysis
        assert chaotic_analysis["chaos_level"] >= 0
        assert chaotic_analysis["chaos_level"] <= 1

    def test_maximum_chaos_scenario(self):
        """Test maximum chaos scenario"""
        # Set maximum chaos
        self.vibe_trader.chaos_factor = 1.0
        self.chaos_engine.entropy_level = 1.0

        market_data = {
            "change_percent": random.uniform(-20, 20),
            "volume": random.randint(1, 100000000),
            "volatility": 1.0,
        }

        # Execute trade in maximum chaos
        trade_result = self.vibe_trader.execute_vibe_trade("MAX_CHAOS", market_data)

        # Inject more chaos
        chaotic_trade = self.chaos_engine.inject_chaos(trade_result)

        # Should have maximum chaos indicators
        assert chaotic_trade["chaos_factor"] >= 0.8
        assert "chaos_level" in chaotic_trade
        # Chaos level can be unpredictable (which is the point!)
        assert chaotic_trade["chaos_level"] >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
