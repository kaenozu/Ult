"""
Stock Universe Manager

Manages a collection of stock symbols for monitoring and analysis.
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Any

# Default major US stocks
DEFAULT_US_STOCKS = [
    "AAPL",  # Apple
    "MSFT",  # Microsoft
    "GOOGL",  # Alphabet/Google
    "AMZN",  # Amazon
    "TSLA",  # Tesla
    "META",  # Meta (Facebook)
    "NVDA",  # NVIDIA
    "JPM",  # JPMorgan Chase
    "V",  # Visa
    "WMT",  # Walmart
]

# Default major Japanese stocks
DEFAULT_JP_STOCKS = [
    "7203",  # Toyota Motor
    "6758",  # Sony Group
    "9984",  # SoftBank Group
    "8035",  # Tokyo Electron
    "4519",  # Shin-Etsu Chemical
    "6702",  # Konica Minolta
    "8604",  # Nomura Holdings
    "6954",  # Fanuc
    "6367",  # Nidec
    "6501",  # Hitachi
]


class StockUniverse:
    """Manages a universe of stock symbols"""

    def __init__(self):
        """Initialize an empty universe"""
        self._symbols: Set[str] = set()

    def count(self) -> int:
        """Return the number of symbols in the universe"""
        return len(self._symbols)

    def is_empty(self) -> bool:
        """Check if the universe is empty"""
        return len(self._symbols) == 0

    def add(self, symbol: str) -> None:
        """Add a symbol to the universe

        Args:
            symbol: Stock symbol to add (e.g., "AAPL", "7203")

        Raises:
            ValueError: If symbol already exists
        """
        symbol = symbol.upper().strip()
        if symbol in self._symbols:
            raise ValueError(f"Symbol '{symbol}' already exists")
        self._symbols.add(symbol)

    def remove(self, symbol: str) -> None:
        """Remove a symbol from the universe

        Args:
            symbol: Stock symbol to remove

        Raises:
            ValueError: If symbol not found
        """
        symbol = symbol.upper().strip()
        if symbol not in self._symbols:
            raise ValueError(f"Symbol '{symbol}' not found")
        self._symbols.remove(symbol)

    def contains(self, symbol: str) -> bool:
        """Check if a symbol is in the universe

        Args:
            symbol: Stock symbol to check

        Returns:
            True if symbol exists, False otherwise
        """
        return symbol.upper().strip() in self._symbols

    def list_symbols(self) -> List[str]:
        """Return a list of all symbols in the universe

        Returns:
            List of symbols (sorted alphabetically)
        """
        return sorted(self._symbols)

    def clear(self) -> None:
        """Remove all symbols from the universe"""
        self._symbols.clear()

    def is_valid_symbol(self, symbol: str) -> bool:
        """Validate symbol format

        Args:
            symbol: Stock symbol to validate

        Returns:
            True if valid format, False otherwise

        Rules:
        - Must be 2-6 characters (US stocks) or 4 digits (Japanese stocks)
        - Must be alphanumeric
        - Cannot be empty or single character
        """
        symbol = symbol.strip()
        if not symbol:
            return False
        if len(symbol) < 2 or len(symbol) > 6:
            return False
        if not symbol.isalnum():
            return False
        return True

    def add_if_valid(self, symbol: str) -> bool:
        """Add a symbol if it passes validation

        Args:
            symbol: Stock symbol to add

        Returns:
            True if symbol was added, False if validation failed
        """
        if not self.is_valid_symbol(symbol):
            return False

        normalized = symbol.upper().strip()
        if normalized in self._symbols:
            return False

        self._symbols.add(normalized)
        return True

    def save(self, file_path: str) -> None:
        """Save universe to JSON file

        Args:
            file_path: Path to save the universe data
        """
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "symbols": sorted(self._symbols),
            "version": "1.0",
        }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @classmethod
    def load(cls, file_path: str) -> "StockUniverse":
        """Load universe from JSON file

        Args:
            file_path: Path to load the universe data from

        Returns:
            New StockUniverse instance with loaded data

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file format is invalid
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Universe file not found: {file_path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "symbols" not in data:
            raise ValueError("Invalid universe file: missing 'symbols' key")

        universe = cls()
        for symbol in data["symbols"]:
            universe._symbols.add(symbol)

        return universe

    def add_default_universe(self) -> None:
        """Add default major US and Japanese stocks to the universe

        This adds 20 major stocks (10 US + 10 Japanese) to monitor.
        """
        for symbol in DEFAULT_US_STOCKS + DEFAULT_JP_STOCKS:
            self.add_if_valid(symbol)

    def add_on_demand(self, symbol: str) -> Dict[str, Any]:
        """Add a symbol on-demand with validation and feedback

        This method is used when a user enters a symbol that needs to be
        validated and added to the universe for monitoring.

        Args:
            symbol: Stock symbol to add

        Returns:
            Dictionary with result:
            - success (bool): Whether the operation succeeded
            - symbol (str): Normalized symbol
            - added (bool): Whether the symbol was newly added
            - message (str): Human-readable message
            - error (str): Error message if failed
        """
        normalized = symbol.upper().strip()

        # Validate format
        if not self.is_valid_symbol(normalized):
            return {
                "success": False,
                "symbol": normalized,
                "error": f"Invalid symbol format: '{symbol}'"
            }

        # Check if already exists
        if self.contains(normalized):
            return {
                "success": True,
                "symbol": normalized,
                "added": False,
                "message": f"Symbol '{normalized}' already exists in universe"
            }

        # Add to universe
        self._symbols.add(normalized)
        return {
            "success": True,
            "symbol": normalized,
            "added": True,
            "message": f"Symbol '{normalized}' added to universe"
        }
