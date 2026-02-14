"""
Validator Utilities

Common validation functions for input data.
"""

import math
from typing import List, Any


def validate_finite_number(value: Any, name: str = "value") -> None:
    """Validate that a value is a finite number
    
    Args:
        value: The value to validate
        name: Name of the value for error messages
        
    Raises:
        TypeError: If value is not a number
        ValueError: If value is NaN or Inf
    """
    if not isinstance(value, (int, float)):
        raise TypeError(f"{name} must be a number, got {type(value).__name__}")
    if math.isnan(value) or math.isinf(value):
        raise ValueError(f"{name} must be finite, got {value}")


def validate_list_of_finite_numbers(lst: List[Any], name: str = "list") -> None:
    """Validate that a list contains only finite numbers
    
    Args:
        lst: The list to validate
        name: Name of the list for error messages
        
    Raises:
        TypeError: If list is not a list or contains non-numbers
        ValueError: If any element is NaN or Inf
    """
    if not isinstance(lst, list):
        raise TypeError(f"{name} must be a list, got {type(lst).__name__}")
    for i, value in enumerate(lst):
        if not isinstance(value, (int, float)):
            raise TypeError(f"{name}[{i}] must be a number, got {type(value).__name__}")
        if math.isnan(value) or math.isinf(value):
            raise ValueError(f"{name}[{i}] must be finite, got {value}")


def validate_list_length_match(list1: List[Any], list2: List[Any], 
                                name1: str = "list1", name2: str = "list2") -> None:
    """Validate that two lists have the same length
    
    Args:
        list1: First list
        list2: Second list
        name1: Name of first list for error messages
        name2: Name of second list for error messages
        
    Raises:
        ValueError: If lists have different lengths
    """
    if len(list1) != len(list2):
        raise ValueError(f"{name1} and {name2} must have the same length: {len(list1)} vs {len(list2)}")


def validate_min_length(lst: List[Any], min_length: int, name: str = "list") -> None:
    """Validate that a list has at least min_length elements
    
    Args:
        lst: The list to validate
        min_length: Minimum required length
        name: Name of the list for error messages
        
    Raises:
        ValueError: If list is too short
    """
    if len(lst) < min_length:
        raise ValueError(f"{name} must have at least {min_length} elements, got {len(lst)}")
