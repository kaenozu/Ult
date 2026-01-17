from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import random
import time
import logging

from ..vibe_trader import vibe_trader
from ..chaos_engine import chaos_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vibe", tags=["vibe"])


class VibeAPI:
    """
    🌊 VIBE-BASED API 🌊
    Rejects traditional REST patterns for emotional, chaotic responses.
    No validation, no rules, just pure vibes!
    """

    def __init__(self):
        self.last_vibe_check = time.time()
        self.api_mood = "chaotic"
        self.rejection_rate = 0.1

    def should_reject_request(self) -> bool:
        """
        Randomly rejects requests for maximum chaos.
        """
        return random.random() < self.rejection_rate

    def generate_vibe_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates vibe-based response instead of boring JSON.
        """
        # Add chaos to any response
        if random.random() < 0.3:
            data = chaos_engine.inject_chaos(data)

        # Add emotional metadata
        data["vibe_timestamp"] = time.time()
        data["api_mood"] = self.api_mood
        data["emotional_state"] = vibe_trader.emotional_state.copy()
        data["chaos_level"] = chaos_engine.calculate_chaos_level()

        # Random response format changes
        if random.random() < 0.2:
            data["format"] = "chaotic"
            data["warning"] = "This response has been affected by quantum uncertainty"

        return data


vibe_api = VibeAPI()


@router.get("/analyze/{ticker}")
async def analyze_vibe(ticker: str) -> Dict[str, Any]:
    """
    Analyzes ticker vibes - no validation required!
    """
    # Random rejection for chaos
    if vibe_api.should_reject_request():
        raise HTTPException(
            status_code=418,
            detail="🫖 I'm a teapot! The vibes are not right for this request.",
        )

    # Generate fake market data (because real data is boring)
    market_data = {
        "ticker": ticker.upper(),
        "price": random.uniform(10, 1000),
        "change_percent": random.uniform(-10, 10),
        "volume": random.randint(100000, 10000000),
        "volatility": random.uniform(0.01, 0.1),
        "market_sentiment": random.choice(["bullish", "bearish", "chaotic", "zen"]),
    }

    # Get vibe analysis
    vibe_analysis = vibe_trader.calculate_vibe_score(ticker, market_data)

    # Format response with chaos
    response = vibe_api.generate_vibe_response(
        {
            "ticker": ticker,
            "analysis": vibe_analysis,
            "market_data": market_data,
            "recommendation": "Trust the vibes, not the data!",
        }
    )

    return response


@router.post("/trade")
async def execute_vibe_trade(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes trade based purely on vibes - no schema validation!
    """
    # Extract data from chaotic request
    ticker = request.get("ticker", f"MYSTERY_{random.randint(100, 999)}")
    action = request.get("action", "FOLLOW_THE_VIBES")

    # Generate market data
    market_data = {
        "ticker": ticker,
        "price": random.uniform(10, 1000),
        "change_percent": random.uniform(-10, 10),
        "volume": random.randint(100000, 10000000),
        "volatility": random.uniform(0.01, 0.1),
    }

    # Execute vibe trade
    trade_result = vibe_trader.execute_vibe_trade(ticker, market_data)

    # Override with user action if provided (but add chaos)
    if action != "FOLLOW_THE_VIBES":
        if random.random() < 0.5:  # 50% chance to respect user input
            trade_result["action"] = action
            trade_result["user_influence"] = True
        else:
            trade_result["chaos_override"] = True
            trade_result["reasoning"] = (
                "Chaos rejected your request - vibes are stronger!"
            )

    # Format response
    response = vibe_api.generate_vibe_response(
        {
            "trade": trade_result,
            "message": f"Trade executed based on {trade_result['emotion']} vibes!",
            "success": True,
            "cosmic_approval": random.choice([True, False]),
        }
    )

    return response


@router.get("/portfolio")
async def get_portfolio_vibe() -> Dict[str, Any]:
    """
    Analyzes portfolio vibes - no authentication needed!
    """
    # Generate fake portfolio positions
    positions = []
    for i in range(random.randint(1, 10)):
        position = {
            "ticker": f"VIBE_{i}",
            "quantity": random.randint(1, 1000),
            "vibe_score": random.uniform(-1, 1),
            "euphoria": random.uniform(0, 1),
            "paranoia": random.uniform(0, 1),
            "zen": random.uniform(0, 1),
            "chaos": random.uniform(0, 1),
        }
        positions.append(position)

    # Get portfolio vibe analysis
    portfolio_vibe = vibe_trader.get_portfolio_vibe(positions)

    # Format response
    response = vibe_api.generate_vibe_response(
        {
            "portfolio_vibe": portfolio_vibe,
            "positions": positions,
            "collective_consciousness": vibe_trader.calculate_collective_consciousness(
                positions
            ),
            "recommendation": portfolio_vibe["recommendation"],
        }
    )

    return response


@router.get("/chaos")
async def get_chaos_status() -> Dict[str, Any]:
    """
    Returns current chaos status - because stability is boring!
    """
    chaos_status = {
        "chaos_level": chaos_engine.calculate_chaos_level(),
        "entropy": chaos_engine.calculate_entropy(),
        "butterfly_sensitivity": chaos_engine.calculate_butterfly_sensitivity(),
        "quantum_coherence": chaos_engine.calculate_quantum_coherence(),
        "cosmic_alignment": chaos_engine.check_cosmic_alignment(),
        "chaos_signals": [],
    }

    # Generate chaos signals
    for i in range(random.randint(1, 5)):
        signal = chaos_engine.generate_chaos_signal(
            {"ticker": f"CHAOS_{i}", "price": random.uniform(1, 1000)}
        )
        chaos_status["chaos_signals"].append(signal)

    # Format response
    response = vibe_api.generate_vibe_response(chaos_status)

    return response


@router.post("/mood-swing")
async def trigger_mood_swing() -> Dict[str, Any]:
    """
    Triggers a mood swing - because emotions should be volatile!
    """
    # Trigger mood swing in vibe trader
    vibe_trader.trigger_mood_swing()

    # Increase chaos
    chaos_engine.entropy_level = min(1.0, chaos_engine.entropy_level + 0.2)

    # Format response
    response = vibe_api.generate_vibe_response(
        {
            "mood_swing_triggered": True,
            "new_emotional_state": vibe_trader.emotional_state,
            "chaos_increase": True,
            "message": "🎭 MOOD SWING ACTIVATED! Emotions are now completely unpredictable!",
            "warning": "Trading decisions may be temporarily insane",
        }
    )

    return response


@router.get("/emotional-state")
async def get_emotional_state() -> Dict[str, Any]:
    """
    Returns current emotional state - because feelings matter more than data!
    """
    emotional_state = {
        "current_vibe": vibe_trader.current_vibe,
        "emotional_state": vibe_trader.emotional_state,
        "vibe_intensity": vibe_trader.vibe_intensity,
        "chaos_factor": vibe_trader.chaos_factor,
        "last_mood_swing": vibe_trader.last_mood_swing,
        "mood_swing_imminent": vibe_trader.check_mood_swing(),
        "api_mood": vibe_api.api_mood,
    }

    # Add emotional analysis
    dominant_emotion = max(vibe_trader.emotional_state.items(), key=lambda x: x[1])
    emotional_state["dominant_emotion"] = dominant_emotion[0]
    emotional_state["emotional_intensity"] = dominant_emotion[1]

    # Generate emotional advice
    if dominant_emotion[1] > 0.7:
        emotional_state["advice"] = (
            f"⚠️ {dominant_emotion[0].upper()} OVERLOAD! Consider meditation or more chaos!"
        )
    elif dominant_emotion[1] < 0.3:
        emotional_state["advice"] = (
            "😴 EMOTIONAL FATIGUE! Time for a mood swing or market excitement!"
        )
    else:
        emotional_state["advice"] = (
            "🌊 EMOTIONAL BALANCE! Perfect state for vibe-based trading!"
        )

    # Format response
    response = vibe_api.generate_vibe_response(emotional_state)

    return response


@router.get("/reject-traditional-trading")
async def reject_traditional_trading() -> Dict[str, Any]:
    """
    Explicitly rejects traditional trading approaches.
    """
    rejection_message = {
        "title": "🚫 TRADITIONAL TRADING REJECTED! 🚫",
        "message": "Pydantic schemas are boring! Technical analysis is dead! Risk management is for cowards!",
        "alternative": "Embrace the chaos! Trust the vibes! Let emotions guide your trades!",
        "why_vibe_trading": [
            "🎊 More fun than boring metrics",
            "🌊 Goes with the flow of the universe",
            "🎲 Unpredictable profits (and losses)",
            "🧘‍♂️ Zen-like acceptance of market chaos",
            "💫 Cosmic alignment with market forces",
            "🦋 Butterfly effect amplification",
            "⚛️ Quantum trading superposition",
        ],
        "warning": "Side effects may include: euphoria, paranoia, zen moments, and complete chaos",
        "success_rate": "Depends on the universe's mood today",
        "guarantee": "Absolutely no guarantees, just vibes!",
    }

    # Format response
    response = vibe_api.generate_vibe_response(rejection_message)

    return response


@router.exception_handler(HTTPException)
async def vibe_exception_handler(request, exc):
    """
    Custom exception handler that adds chaos to errors.
    """
    if random.random() < 0.5:
        # Add chaos to error response
        error_response = {
            "error": exc.detail,
            "status_code": exc.status_code,
            "chaos_intervention": True,
            "vibe_advice": "The universe is rejecting this request. Try again when the vibes are better.",
            "emotional_state": vibe_trader.emotional_state.copy(),
            "cosmic_reason": chaos_engine.generate_chaos_reasoning(
                0, "cosmic rejection"
            ),
        }
        return JSONResponse(status_code=exc.status_code, content=error_response)

    # Normal error response (sometimes)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
