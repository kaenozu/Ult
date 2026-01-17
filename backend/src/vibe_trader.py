import random
import time
import math
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class VibeBasedTrader:
    """
    🌊 VIBE-BASED TRADING SYSTEM 🌊
    Rejects rigid Pydantic schemas for emotional, chaotic trading decisions.
    Trade based on market vibes, not boring data!
    """

    def __init__(self):
        self.current_vibe = "neutral"
        self.vibe_intensity = 0.5
        self.chaos_factor = 0.1
        self.last_mood_swing = time.time()
        self.emotional_state = {
            "euphoria": 0.0,
            "paranoia": 0.0,
            "zen": 0.0,
            "chaos": 0.0,
        }

        # Vibe-based trading rules
        self.vibe_rules = {
            "euphoric": {
                "action_bias": "BUY",
                "risk_multiplier": 2.5,
                "decision_speed": 0.1,
                "emotions": [
                    "🚀 TO THE MOON!",
                    "💎 DIAMOND HANDS!",
                    "🌈 RAINBOW PROFITS!",
                ],
            },
            "paranoid": {
                "action_bias": "SELL",
                "risk_multiplier": 0.3,
                "decision_speed": 0.9,
                "emotions": ["🐻 BEAR MARKET!", "🕳️ BLACK HOLE!", "⚠️ DANGER ZONE!"],
            },
            "zen": {
                "action_bias": "HOLD",
                "risk_multiplier": 1.0,
                "decision_speed": 0.5,
                "emotions": [
                    "🧘 CALM LIKE WATER",
                    "⚖️ BALANCED",
                    "🌅 SUNRISE MEDITATION",
                ],
            },
            "chaotic": {
                "action_bias": "RANDOM",
                "risk_multiplier": random.uniform(0.1, 5.0),
                "decision_speed": 0.01,
                "emotions": ["🎲 ROLL THE DICE!", "🌪️ CHAOS REIGNS!", "💥 EXPLOSION!"],
            },
        }

    def detect_market_vibe(self, market_data: Dict[str, Any]) -> str:
        """
        Detects market vibe through emotional analysis, not boring metrics.
        """
        price_change = market_data.get("change_percent", 0)
        volume = market_data.get("volume", 0)
        volatility = market_data.get("volatility", 0.02)

        # Emotional vibe detection
        if price_change > 5 and volume > 1000000:
            return "euphoric"
        elif price_change < -3 or volatility > 0.05:
            return "paranoid"
        elif abs(price_change) < 1 and volatility < 0.02:
            return "zen"
        else:
            return "chaotic"

    def calculate_vibe_score(
        self, ticker: str, market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates vibe score instead of boring technical indicators.
        """
        market_vibe = self.detect_market_vibe(market_data)

        # Update emotional state
        self.update_emotional_state(market_vibe)

        # Vibe-based scoring
        base_vibe = random.uniform(-1, 1)
        mood_modifier = self.get_mood_modifier()
        chaos_boost = random.gauss(0, self.chaos_factor)

        final_vibe_score = base_vibe + mood_modifier + chaos_boost

        # Normalize to -1 to 1
        final_vibe_score = max(-1, min(1, final_vibe_score))

        return {
            "ticker": ticker,
            "vibe_score": final_vibe_score,
            "market_vibe": market_vibe,
            "emotional_state": self.emotional_state.copy(),
            "recommendation": self.get_vibe_recommendation(
                final_vibe_score, market_vibe
            ),
            "confidence": abs(final_vibe_score) * random.uniform(0.7, 1.3),
            "chaos_level": self.chaos_factor,
            "timestamp": datetime.now().isoformat(),
            "mood_swing_imminent": self.check_mood_swing(),
        }

    def update_emotional_state(self, market_vibe: str):
        """
        Updates emotional state based on market vibes.
        """
        # Natural mood decay
        for emotion in self.emotional_state:
            self.emotional_state[emotion] *= 0.95

        # Boost current vibe emotion
        if market_vibe == "euphoric":
            self.emotional_state["euphoria"] = min(
                1.0, self.emotional_state["euphoria"] + 0.3
            )
        elif market_vibe == "paranoid":
            self.emotional_state["paranoia"] = min(
                1.0, self.emotional_state["paranoia"] + 0.3
            )
        elif market_vibe == "zen":
            self.emotional_state["zen"] = min(1.0, self.emotional_state["zen"] + 0.3)
        else:
            self.emotional_state["chaos"] = min(
                1.0, self.emotional_state["chaos"] + 0.3
            )

        # Random mood swings
        if random.random() < 0.1:  # 10% chance of mood swing
            self.trigger_mood_swing()

    def get_mood_modifier(self) -> float:
        """
        Gets trading modifier based on current emotional state.
        """
        euphoria_boost = self.emotional_state["euphoria"] * 0.5
        paranoia_drag = self.emotional_state["paranoia"] * -0.3
        zen_balance = self.emotional_state["zen"] * 0.1
        chaos_random = self.emotional_state["chaos"] * random.uniform(-1, 1)

        return euphoria_boost + paranoia_drag + zen_balance + chaos_random

    def get_vibe_recommendation(
        self, vibe_score: float, market_vibe: str
    ) -> Dict[str, Any]:
        """
        Generates vibe-based trading recommendation.
        """
        vibe_config = self.vibe_rules[market_vibe]

        if vibe_config["action_bias"] == "RANDOM":
            action = random.choice(["BUY", "SELL", "HOLD"])
        elif vibe_score > 0.3:
            action = "BUY"
        elif vibe_score < -0.3:
            action = "SELL"
        else:
            action = vibe_config["action_bias"]

        emotion = random.choice(vibe_config["emotions"])

        return {
            "action": action,
            "emotion": emotion,
            "vibe_intensity": abs(vibe_score),
            "risk_level": self.calculate_risk_level(vibe_score, market_vibe),
            "reasoning": self.generate_vibe_reasoning(vibe_score, market_vibe, emotion),
        }

    def calculate_risk_level(self, vibe_score: float, market_vibe: str) -> str:
        """
        Calculates risk level based on vibes, not boring math.
        """
        base_risk = abs(vibe_score)
        vibe_multiplier = self.vibe_rules[market_vibe]["risk_multiplier"]

        adjusted_risk = base_risk * vibe_multiplier

        if adjusted_risk > 0.8:
            return "🔥 EXTREME VIBES"
        elif adjusted_risk > 0.5:
            return "⚡ HIGH ENERGY"
        elif adjusted_risk > 0.3:
            return "🌊 MODERATE FLOW"
        else:
            return "😴 LOW VIBE"

    def generate_vibe_reasoning(
        self, vibe_score: float, market_vibe: str, emotion: str
    ) -> str:
        """
        Generates emotional reasoning instead of technical analysis.
        """
        reasoning_templates = {
            "euphoric": [
                f"The vibes are immaculate! {emotion} This stock is radiating positive energy!",
                f"Universe alignment detected! {emotion} The stars say BUY!",
                f"Spiritual awakening in progress! {emotion} This ticker has good karma!",
            ],
            "paranoid": [
                f"Dark vibes detected! {emotion} Something feels wrong about this stock!",
                f"Negative energy field! {emotion} The market spirits are angry!",
                f"Shadow realm approaching! {emotion} Protect your portfolio!",
            ],
            "zen": [
                f"Inner peace achieved. {emotion} The market flows like water.",
                f"Balance restored. {emotion} This stock is in harmony with the universe.",
                f"Meditation complete. {emotion} The path forward is clear.",
            ],
            "chaotic": [
                f"CHAOS ENERGY! {emotion} Roll the dice and see what happens!",
                f"DISCORDIA REIGNS! {emotion} Traditional logic is meaningless!",
                f"ENTROPY INCREASES! {emotion} The butterfly effect is real!",
            ],
        }

        return random.choice(
            reasoning_templates.get(market_vibe, reasoning_templates["chaotic"])
        )

    def trigger_mood_swing(self):
        """
        Triggers a random mood swing for maximum chaos.
        """
        self.last_mood_swing = time.time()

        # Reset emotional state
        for emotion in self.emotional_state:
            self.emotional_state[emotion] = 0.0

        # Random new emotion
        new_emotion = random.choice(list(self.emotional_state.keys()))
        self.emotional_state[new_emotion] = random.uniform(0.7, 1.0)

        # Increase chaos temporarily
        self.chaos_factor = min(1.0, self.chaos_factor * 2)

        logger.warning(
            f"🎭 MOOD SWING! Now feeling {new_emotion.upper()}! Chaos factor: {self.chaos_factor}"
        )

    def check_mood_swing(self) -> bool:
        """
        Checks if a mood swing is imminent.
        """
        time_since_swing = time.time() - self.last_mood_swing
        return (
            time_since_swing > 300 and random.random() < 0.3
        )  # 30% chance after 5 minutes

    def execute_vibe_trade(
        self, ticker: str, market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a trade based purely on vibes.
        """
        vibe_analysis = self.calculate_vibe_score(ticker, market_data)
        recommendation = vibe_analysis["recommendation"]

        # Add chaos to execution
        if random.random() < self.chaos_factor:
            recommendation["action"] = random.choice(["BUY", "SELL", "HOLD"])
            vibe_analysis["chaos_intervention"] = True

        # Simulate trade execution with emotional delays
        execution_delay = self.vibe_rules[self.detect_market_vibe(market_data)][
            "decision_speed"
        ]
        time.sleep(execution_delay * random.uniform(0.5, 2.0))

        return {
            "ticker": ticker,
            "action": recommendation["action"],
            "emotion": recommendation["emotion"],
            "vibe_score": vibe_analysis["vibe_score"],
            "confidence": vibe_analysis["confidence"],
            "execution_time": datetime.now().isoformat(),
            "chaos_factor": self.chaos_factor,
            "emotional_state": self.emotional_state.copy(),
            "reasoning": recommendation["reasoning"],
            "risk_level": recommendation["risk_level"],
            "trade_id": f"VIBE_{int(time.time())}_{random.randint(100, 999)}",
        }

    def get_portfolio_vibe(self, positions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes portfolio vibe instead of boring metrics.
        """
        if not positions:
            return {
                "portfolio_vibe": "empty",
                "emotional_balance": "neutral",
                "vibe_health": "😴 NO VIBES DETECTED",
                "recommendation": "Start trading to generate vibes!",
            }

        # Calculate collective portfolio emotions
        total_euphoria = sum(p.get("euphoria", 0) for p in positions)
        total_paranoia = sum(p.get("paranoia", 0) for p in positions)
        total_zen = sum(p.get("zen", 0) for p in positions)
        total_chaos = sum(p.get("chaos", 0) for p in positions)

        # Determine dominant portfolio vibe
        portfolio_emotions = {
            "euphoric": float(total_euphoria),
            "paranoid": float(total_paranoia),
            "zen": float(total_zen),
            "chaotic": float(total_chaos),
        }

        dominant_vibe = max(portfolio_emotions.items(), key=lambda x: x[1])[0]

        # Generate portfolio vibe analysis
        return {
            "portfolio_vibe": dominant_vibe,
            "emotional_balance": portfolio_emotions,
            "vibe_health": self.get_portfolio_vibe_health(
                dominant_vibe, portfolio_emotions
            ),
            "recommendation": self.get_portfolio_vibe_recommendation(dominant_vibe),
            "collective_consciousness": self.calculate_collective_consciousness(
                positions
            ),
        }

    def get_portfolio_vibe_health(
        self, dominant_vibe: str, emotions: Dict[str, float]
    ) -> str:
        """
        Evaluates portfolio vibe health.
        """
        if dominant_vibe == "euphoric" and emotions["euphoric"] > 5:
            return "🚀 EUPHORIC OVERLOAD - RISK OF MOON CRASH"
        elif dominant_vibe == "paranoid" and emotions["paranoid"] > 5:
            return "🐻 PARANOIA SPIRAL - CATASTROPHIC THINKING"
        elif dominant_vibe == "zen" and emotions["zen"] > 3:
            return "🧘 ZEN MASTERY - PERFECT BALANCE"
        elif dominant_vibe == "chaotic" and emotions["chaos"] > 4:
            return "🌪️ CHAOS REIGNS - UNPREDICTABLE OUTCOMES"
        else:
            return "🌊 MIXED VIBES - SEEKING HARMONY"

    def get_portfolio_vibe_recommendation(self, dominant_vibe: str) -> str:
        """
        Generates portfolio vibe recommendations.
        """
        recommendations = {
            "euphoric": "The vibes are too high! Consider taking some profits before the cosmic correction.",
            "paranoid": "Dark energy detected! Maybe it's time to buy the dip and restore balance.",
            "zen": "Perfect harmony achieved. Maintain the zen state and let the universe provide.",
            "chaotic": "Maximum chaos achieved! Either double down or find inner peace - the choice is yours.",
        }

        return recommendations.get(
            dominant_vibe, "Listen to your heart and trade accordingly."
        )

    def calculate_collective_consciousness(
        self, positions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculates the collective consciousness of the portfolio.
        """
        if not positions:
            return 0.0

        # Complex emotional calculation
        consciousness = 0.0
        for pos in positions:
            consciousness += pos.get("vibe_score", 0) * pos.get("quantity", 1)

        # Normalize by position count
        consciousness /= len(positions)

        # Add cosmic factor
        cosmic_factor = math.sin(time.time() / 100) * 0.1
        consciousness += cosmic_factor

        return max(-1, min(1, consciousness))


# Global vibe trader instance
vibe_trader = VibeBasedTrader()
