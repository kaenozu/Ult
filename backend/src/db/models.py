from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func
from src.db.database import Base


class MarketScan(Base):
    """Records daily scan results for a ticker."""

    __tablename__ = "market_scans"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ticker = Column(String, index=True)
    signal = Column(Integer)  # 1 (Buy), -1 (Sell), 0 (Hold)
    confidence = Column(Float)
    rsi = Column(Float, nullable=True)
    sma_20 = Column(Float, nullable=True)
    sma_50 = Column(Float, nullable=True)
    reasoning = Column(Text, nullable=True)


class TradeLog(Base):
    """Records executed trades."""

    __tablename__ = "trade_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ticker = Column(String, index=True)
    action = Column(String)  # BUY, SELL, HOLD
    price = Column(Float)
    quantity = Column(Float)
    strategy_name = Column(String, nullable=True)
    pnl = Column(Float, nullable=True)
    entry_price = Column(Float, nullable=True)


class CouncilVote(Base):
    """Records individual votes from the Council of Avatars."""

    __tablename__ = "council_votes"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ticker = Column(String, index=True)
    avatar_id = Column(String)
    avatar_name = Column(String)
    trait = Column(String)
    score = Column(Float)  # 0-100
    stance = Column(String)  # BULL, BEAR, NEUTRAL
    quote = Column(Text)


class SystemEvent(Base):
    """Generic system events (e.g., deployments, errors, mode switches)."""

    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    event_type = Column(String, index=True)  # ERROR, DEPLOY, INFO
    message = Column(Text)
    details = Column(Text, nullable=True)  # JSON or stacktrace
