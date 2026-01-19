"""
Living Nexus & Strategy Shifter - Backend Package

A comprehensive AI-powered trading system with real-time market analysis,
regime detection, and automated trading capabilities.
"""

__version__ = "1.0.0"
__author__ = "Living Nexus Team"
__description__ = "AI-powered trading system with real-time market analysis"

# Direct imports for commonly used components
from .core.config import settings
from .di import container, get_regime_detector
from .regime_detector import RegimeDetector
from .api.responses import BaseAPIResponse, success_response, ErrorResponse

__all__ = [
    # Core components
    "settings",
    "container",
    "get_regime_detector",
    "RegimeDetector",
    # API utilities
    "BaseAPIResponse",
    "success_response",
    "ErrorResponse",
    # Metadata
    "__version__",
    "__author__",
    "__description__",
]
