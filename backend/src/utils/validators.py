"""
Common validation utilities for the AI-powered trading platform.
Provides reusable validation functions to eliminate code duplication and magic numbers.
"""

from typing import List, Dict, Any, Union, Optional
from decimal import Decimal
import pandas as pd
import numpy as np


class ValidationError(Exception):
    """Custom validation error with descriptive messages."""

    pass


# Common validation thresholds
MIN_DATA_POINTS = 10
MAX_TICKER_LENGTH = 10
MIN_PRICE = 0.01
MAX_PRICE = 100000
MIN_QUANTITY = 1
MAX_QUANTITY = 1000000
MIN_CONFIDENCE = 0.0
MAX_CONFIDENCE = 1.0
MAX_REASON_LENGTH = 500
MIN_REASON_LENGTH = 5
MAX_RISK_SCORE = 1.0
MIN_RISK_SCORE = 0.0


def validate_ticker(ticker: str) -> str:
    """
    Validate stock ticker symbol.

    Args:
        ticker: Stock ticker symbol

    Returns:
        Validated ticker in uppercase

    Raises:
        ValidationError: If ticker is invalid
    """
    if not ticker:
        raise ValidationError("Ticker cannot be empty")

    if not isinstance(ticker, str):
        raise ValidationError("Ticker must be a string")

    ticker = ticker.upper().strip()

    if len(ticker) > MAX_TICKER_LENGTH:
        raise ValidationError(f"Ticker too long: max {MAX_TICKER_LENGTH} characters")

    if not ticker.isalnum():
        raise ValidationError("Ticker must contain only alphanumeric characters")

    return ticker


def validate_price(price: Union[float, Decimal, int]) -> float:
    """
    Validate price value.

    Args:
        price: Price value

    Returns:
        Validated price as float

    Raises:
        ValidationError: If price is invalid
    """
    try:
        price_float = float(price)
    except (ValueError, TypeError):
        raise ValidationError("Price must be a numeric value")

    if price_float < MIN_PRICE:
        raise ValidationError(f"Price too low: minimum {MIN_PRICE}")

    if price_float > MAX_PRICE:
        raise ValidationError(f"Price too high: maximum {MAX_PRICE}")

    return price_float


def validate_quantity(quantity: int) -> int:
    """
    Validate trade quantity.

    Args:
        quantity: Trade quantity

    Returns:
        Validated quantity

    Raises:
        ValidationError: If quantity is invalid
    """
    if not isinstance(quantity, (int, np.integer)):
        raise ValidationError("Quantity must be an integer")

    if quantity < MIN_QUANTITY:
        raise ValidationError(f"Quantity too low: minimum {MIN_QUANTITY}")

    if quantity > MAX_QUANTITY:
        raise ValidationError(f"Quantity too high: maximum {MAX_QUANTITY}")

    return int(quantity)


def validate_confidence(confidence: float) -> float:
    """
    Validate confidence score.

    Args:
        confidence: Confidence score between 0 and 1

    Returns:
        Validated confidence

    Raises:
        ValidationError: If confidence is invalid
    """
    try:
        conf_float = float(confidence)
    except (ValueError, TypeError):
        raise ValidationError("Confidence must be a numeric value")

    if not (MIN_CONFIDENCE <= conf_float <= MAX_CONFIDENCE):
        raise ValidationError(
            f"Confidence must be between {MIN_CONFIDENCE} and {MAX_CONFIDENCE}"
        )

    return conf_float


def validate_reason(reason: str) -> str:
    """
    Validate trade reason description.

    Args:
        reason: Trade reason description

    Returns:
        Validated reason

    Raises:
        ValidationError: If reason is invalid
    """
    if not isinstance(reason, str):
        raise ValidationError("Reason must be a string")

    reason = reason.strip()

    if len(reason) < MIN_REASON_LENGTH:
        raise ValidationError(
            f"Reason too short: minimum {MIN_REASON_LENGTH} characters"
        )

    if len(reason) > MAX_REASON_LENGTH:
        raise ValidationError(
            f"Reason too long: maximum {MAX_REASON_LENGTH} characters"
        )

    return reason


def validate_risk_score(risk_score: float) -> float:
    """
    Validate risk score.

    Args:
        risk_score: Risk score between 0 and 1

    Returns:
        Validated risk score

    Raises:
        ValidationError: If risk score is invalid
    """
    try:
        score_float = float(risk_score)
    except (ValueError, TypeError):
        raise ValidationError("Risk score must be a numeric value")

    if not (MIN_RISK_SCORE <= score_float <= MAX_RISK_SCORE):
        raise ValidationError(
            f"Risk score must be between {MIN_RISK_SCORE} and {MAX_RISK_SCORE}"
        )

    return score_float


def validate_dataframe(
    df: pd.DataFrame, min_rows: int = MIN_DATA_POINTS
) -> pd.DataFrame:
    """
    Validate DataFrame structure and content.

    Args:
        df: DataFrame to validate
        min_rows: Minimum number of rows required

    Returns:
        Validated DataFrame

    Raises:
        ValidationError: If DataFrame is invalid
    """
    if not isinstance(df, pd.DataFrame):
        raise ValidationError("Input must be a pandas DataFrame")

    if df.empty:
        raise ValidationError("DataFrame cannot be empty")

    if len(df) < min_rows:
        raise ValidationError(f"DataFrame must have at least {min_rows} rows")

    if df.isna().all().all():
        raise ValidationError("DataFrame cannot contain only NaN values")

    return df


def validate_list_length(
    data_list: List[Any], min_length: int = 1, max_length: Optional[int] = None
) -> List[Any]:
    """
    Validate list length.

    Args:
        data_list: List to validate
        min_length: Minimum length required
        max_length: Maximum length allowed (optional)

    Returns:
        Validated list

    Raises:
        ValidationError: If list is invalid
    """
    if not isinstance(data_list, list):
        raise ValidationError("Input must be a list")

    if len(data_list) < min_length:
        raise ValidationError(f"List must have at least {min_length} items")

    if max_length is not None and len(data_list) > max_length:
        raise ValidationError(f"List must have at most {max_length} items")

    return data_list


def validate_trade_signal(signal: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate complete trade signal dictionary.

    Args:
        signal: Trade signal dictionary

    Returns:
        Validated signal dictionary

    Raises:
        ValidationError: If signal is invalid
    """
    required_fields = ["ticker", "action", "quantity", "price", "confidence"]

    for field in required_fields:
        if field not in signal:
            raise ValidationError(f"Missing required field: {field}")

    # Validate each field
    signal["ticker"] = validate_ticker(signal["ticker"])
    signal["quantity"] = validate_quantity(signal["quantity"])
    signal["price"] = validate_price(signal["price"])
    signal["confidence"] = validate_confidence(signal["confidence"])

    if "reason" in signal:
        signal["reason"] = validate_reason(signal["reason"])

    if "risk_score" in signal:
        signal["risk_score"] = validate_risk_score(signal["risk_score"])

    return signal


def validate_action_type(action: str) -> str:
    """
    Validate trading action type.

    Args:
        action: Trading action (BUY, SELL, HOLD)

    Returns:
        Validated action

    Raises:
        ValidationError: If action is invalid
    """
    valid_actions = ["BUY", "SELL", "HOLD", "SLEEP"]

    if not isinstance(action, str):
        raise ValidationError("Action must be a string")

    action = action.upper().strip()

    if action not in valid_actions:
        raise ValidationError(
            f"Invalid action: {action}. Valid actions: {valid_actions}"
        )

    return action


# Data size validators for ML models
def validate_training_data(data: pd.DataFrame, min_samples: int = 50) -> pd.DataFrame:
    """
    Validate training data for ML models.

    Args:
        data: Training data DataFrame
        min_samples: Minimum number of samples required

    Returns:
        Validated DataFrame

    Raises:
        ValidationError: If data is insufficient for training
    """
    validate_dataframe(data, min_rows=min_samples)

    # Check for sufficient feature columns
    feature_cols = [
        col for col in data.columns if col not in ["target", "ticker", "date"]
    ]
    if len(feature_cols) < 3:
        raise ValidationError("Insufficient feature columns for ML training")

    return data


def validate_portfolio_positions(
    positions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Validate portfolio position data.

    Args:
        positions: List of portfolio positions

    Returns:
        Validated positions list

    Raises:
        ValidationError: If positions are invalid
    """
    validate_list_length(positions, min_length=0, max_length=1000)

    required_position_fields = ["ticker", "quantity", "entry_price"]

    for i, position in enumerate(positions):
        if not isinstance(position, dict):
            raise ValidationError(f"Position {i} must be a dictionary")

        for field in required_position_fields:
            if field not in position:
                raise ValidationError(f"Position {i} missing field: {field}")

        position["ticker"] = validate_ticker(position["ticker"])
        position["quantity"] = validate_quantity(position["quantity"])
        position["entry_price"] = validate_price(position["entry_price"])

    return positions


# Email and user validation for authentication
def validate_email(email: str) -> str:
    """
    Validate email address.

    Args:
        email: Email address

    Returns:
        Validated email

    Raises:
        ValidationError: If email is invalid
    """
    import re

    if not isinstance(email, str):
        raise ValidationError("Email must be a string")

    email = email.strip().lower()

    # Basic email validation regex
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(email_pattern, email):
        raise ValidationError("Invalid email format")

    return email


def validate_password(password: str, min_length: int = 8) -> str:
    """
    Validate password strength.

    Args:
        password: Password string
        min_length: Minimum password length

    Returns:
        Validated password

    Raises:
        ValidationError: If password is too weak
    """
    if not isinstance(password, str):
        raise ValidationError("Password must be a string")

    if len(password) < min_length:
        raise ValidationError(f"Password must be at least {min_length} characters long")

    # Check for at least one number, one uppercase letter, and one lowercase letter
    has_number = any(c.isdigit() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)

    if not (has_number and has_upper and has_lower):
        raise ValidationError(
            "Password must contain at least one number, one uppercase, and one lowercase letter"
        )

    return password


# Helper function for batch validation
def validate_batch(
    data: List[Dict[str, Any]], validator_func: callable
) -> List[Dict[str, Any]]:
    """
    Validate a list of data using a provided validator function.

    Args:
        data: List of data dictionaries
        validator_func: Validation function to apply to each item

    Returns:
        List of validated data

    Raises:
        ValidationError: If any item is invalid
    """
    validate_list_length(data)

    validated_data = []
    for i, item in enumerate(data):
        try:
            validated_item = validator_func(item)
            validated_data.append(validated_item)
        except ValidationError as e:
            raise ValidationError(f"Item {i} failed validation: {str(e)}")

    return validated_data
