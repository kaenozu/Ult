import pytest
from pydantic import ValidationError
from src.core.schemas import ActionSchema, ActionType, ThoughtSchema, AgentState

def test_action_schema_valid():
    action = ActionSchema(
        type=ActionType.BUY,
        ticker="AAPL",
        quantity=100,
        reason="Moving average crossover",
        risk_score=0.5,
        confidence=0.8
    )
    assert action.ticker == "AAPL"
    assert action.type == ActionType.BUY

def test_action_schema_validation_error():
    # Test negative quantity
    with pytest.raises(ValidationError):
        ActionSchema(
            type=ActionType.SELL,
            ticker="TSLA",
            quantity=-10,
            reason="Panic sell",
            risk_score=0.9,
            confidence=0.1
        )

def test_action_schema_risk_bounds():
    # Test risk score > 1.0
    with pytest.raises(ValidationError):
        ActionSchema(
            type=ActionType.HOLD,
            ticker="GOOG",
            quantity=1,
            reason="Holding",
            risk_score=1.5, # Invalid
            confidence=0.5
        )

def test_thought_schema():
    thought = ThoughtSchema(
        market_regime="Bullish",
        content="Market is trending up, buying opportunity.",
        emotion="EXCITED"
    )
    assert thought.emotion == "EXCITED"
