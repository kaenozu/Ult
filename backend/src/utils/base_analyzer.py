"""
Base Analyzer Module

Common base class and utilities for all analyzers.
"""

import math
from typing import List, Any

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


# =============================================================================
# Constants - Market Correlation
# =============================================================================

# Constants for trend detection
MIN_DATA_POINTS = 5
TREND_DETECTION_THRESHOLD = 0.0005  # 0.05% change per step

# Constants for correlation thresholds
CORR_LOW = 0.4
CORR_HIGH = 0.6


# =============================================================================
# Constants - Supply/Demand
# =============================================================================

# Constants for zone identification
ZONE_STRENGTH_DEFAULT = 0.5
ZONE_VOLUME_THRESHOLD_MULTIPLIER = 0.5  # 50% of average volume

# Constants for breakout detection
BREAKOUT_VOLUME_SURGE_MULTIPLIER = 1.5  # 50% volume surge for confirmation


# =============================================================================
# Base Analyzer Class
# =============================================================================

class BaseAnalyzer:
    """Base class for all analyzers with common functionality"""
    
    def __init__(self):
        self.has_numpy = HAS_NUMPY
    
    def _validate_finite_number(self, value: Any, name: str = "value") -> None:
        """Validate that a value is a finite number"""
        if not isinstance(value, (int, float)):
            raise ValueError(f"{name} must be a number, got {type(value).__name__}")
        if math.isnan(value) or math.isinf(value):
            raise ValueError(f"{name} must be finite, got {value}")
    
    def _validate_list_of_finite_numbers(self, lst: List[Any], name: str = "list") -> None:
        """Validate that a list contains only finite numbers"""
        if not isinstance(lst, list):
            raise ValueError(f"{name} must be a list")
        for i, value in enumerate(lst):
            if not isinstance(value, (int, float)):
                raise ValueError(f"{name}[{i}] must be a number, got {type(value).__name__}")
            if math.isnan(value) or math.isinf(value):
                raise ValueError(f"{name}[{i}] must be finite, got {value}")
    
    def _validate_list_length_match(self, list1: List[Any], list2: List[Any], 
                                    name1: str = "list1", name2: str = "list2") -> None:
        """Validate that two lists have the same length"""
        if len(list1) != len(list2):
            raise ValueError(f"{name1} and {name2} must have the same length: {len(list1)} vs {len(list2)}")
