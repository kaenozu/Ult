"""
Trade Journal Analyzer

A module for analyzing trading journals and extracting patterns.
Includes psychology analysis for emotional trading detection.
"""

from .analyzer import TradeJournalAnalyzer
from .models import JournalEntry, TradePattern, BiasAlert, TradeStatus
from .psychology_analyzer import (
    TradingPsychologyAnalyzer,
    EmotionType,
    EmotionScore,
    MentalState,
    MentalHealthMetrics,
    DisciplineViolation,
    TradingSession,
    PsychologyAnalysisResult,
)

__all__ = [
    "TradeJournalAnalyzer",
    "JournalEntry",
    "TradePattern",
    "BiasAlert",
    "TradeStatus",
    "TradingPsychologyAnalyzer",
    "EmotionType",
    "EmotionScore",
    "MentalState",
    "MentalHealthMetrics",
    "DisciplineViolation",
    "TradingSession",
    "PsychologyAnalysisResult",
]
__version__ = "0.1.0"
