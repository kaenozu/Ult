from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class ActionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"
    SLEEP = "SLEEP"

class ActionSchema(BaseModel):
    """
    Defines an atomic action taken by the Autonomous Agent.
    Strictly typed for safety and auditing.
    """
    type: ActionType
    ticker: str
    quantity: int = Field(..., gt=0, description="Quantity must be positive")
    reason: str = Field(..., min_length=5, description="Must provide a valid reason")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score 0.0 (Safe) to 1.0 (Dangerous)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI confidence level")
    
    @field_validator('ticker')
    def ticker_must_be_uppercase(cls, v):
        return v.upper()

class ThoughtSchema(BaseModel):
    """
    Represents a single step in the AI's chain of thought.
    """
    timestamp: datetime = Field(default_factory=datetime.now)
    market_regime: str
    content: str
    emotion: Optional[str] = Field(None, description="The 'Vibe' of the thought (e.g. 'EXCITED', 'PANIC')")
    sentiment_score: float = Field(0.0, ge=-1.0, le=1.0, description="Sentiment score from -1.0 to 1.0")
    sentiment_label: str = Field("NEUTRAL", description="POSITIVE, NEGATIVE, or NEUTRAL")

class AgentState(BaseModel):
    """
    Snapshot of the agent's current internal state.
    """
    last_update: datetime = Field(default_factory=datetime.now)
    is_active: bool
    current_regime: str
    daily_pnl: float
    circuit_breaker_active: bool

# Alias for backward compatibility
TradingDecision = ActionSchema
