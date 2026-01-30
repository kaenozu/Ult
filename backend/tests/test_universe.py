"""
Stock Universe Manager Tests

This module tests the Stock Universe Manager which handles:
- Adding/removing stocks from the universe
- Validating stock symbols
- Persisting the universe data
"""

import pytest
from ult_universe import StockUniverse


class TestStockUniverse:
    """Test cases for StockUniverse class"""

    def test_create_empty_universe(self):
        """Test creating an empty universe"""
        universe = StockUniverse()
        assert universe.count() == 0
        assert universe.is_empty()

    def test_add_stock_symbol(self):
        """Test adding a stock symbol to the universe"""
        universe = StockUniverse()
        universe.add("AAPL")
        assert universe.contains("AAPL")
        assert universe.count() == 1

    def test_add_duplicate_symbol_raises_error(self):
        """Test that adding duplicate symbols raises an error"""
        universe = StockUniverse()
        universe.add("AAPL")
        with pytest.raises(ValueError, match="already exists"):
            universe.add("AAPL")

    def test_remove_stock_symbol(self):
        """Test removing a stock symbol from the universe"""
        universe = StockUniverse()
        universe.add("AAPL")
        universe.remove("AAPL")
        assert not universe.contains("AAPL")
        assert universe.count() == 0

    def test_remove_nonexistent_symbol_raises_error(self):
        """Test that removing non-existent symbols raises an error"""
        universe = StockUniverse()
        with pytest.raises(ValueError, match="not found"):
            universe.remove("AAPL")

    def test_list_all_symbols(self):
        """Test listing all symbols in the universe"""
        universe = StockUniverse()
        universe.add("AAPL")
        universe.add("GOOGL")
        universe.add("TSLA")
        symbols = universe.list_symbols()
        assert set(symbols) == {"AAPL", "GOOGL", "TSLA"}

    def test_clear_universe(self):
        """Test clearing all symbols from the universe"""
        universe = StockUniverse()
        universe.add("AAPL")
        universe.add("GOOGL")
        universe.clear()
        assert universe.is_empty()

    def test_validate_symbol_format_valid(self):
        """Test validating correct symbol formats"""
        universe = StockUniverse()
        assert universe.is_valid_symbol("AAPL") is True
        assert universe.is_valid_symbol("GOOGL") is True
        assert universe.is_valid_symbol("7203") is True  # Japanese

    def test_validate_symbol_format_invalid(self):
        """Test rejecting invalid symbol formats"""
        universe = StockUniverse()
        assert universe.is_valid_symbol("") is False
        assert universe.is_valid_symbol("A") is False  # Too short
        assert universe.is_valid_symbol("ABCDEFGHI") is False  # Too long

    def test_save_and_load_universe(self, tmp_path):
        """Test saving and loading universe from file"""
        universe = StockUniverse()
        universe.add("AAPL")
        universe.add("GOOGL")

        # Save to file
        file_path = tmp_path / "universe.json"
        universe.save(str(file_path))

        # Load into new universe
        new_universe = StockUniverse.load(str(file_path))
        assert new_universe.count() == 2
        assert new_universe.contains("AAPL")
        assert new_universe.contains("GOOGL")

    def test_add_symbol_with_validation(self):
        """Test adding symbol with automatic validation"""
        universe = StockUniverse()
        # Valid symbol should be added
        assert universe.add_if_valid("AAPL") is True
        assert universe.contains("AAPL")

        # Invalid symbol should not be added
        assert universe.add_if_valid("") is False
        assert universe.add_if_valid("A") is False
        assert universe.count() == 1  # Only AAPL was added

    def test_add_default_universe(self):
        """Test adding default major US and Japanese stocks"""
        universe = StockUniverse()
        universe.add_default_universe()

        # Should contain major US stocks
        assert universe.contains("AAPL")  # Apple
        assert universe.contains("MSFT")  # Microsoft
        assert universe.contains("GOOGL")  # Google

        # Should contain major Japanese stocks
        assert universe.contains("7203")  # Toyota
        assert universe.contains("6758")  # Sony

        # Should have at least 10 symbols
        assert universe.count() >= 10

    def test_add_on_demand_validates_and_adds(self):
        """Test on-demand addition validates and adds symbols"""
        universe = StockUniverse()

        # Valid new symbol should be added
        result = universe.add_on_demand("NFLX")
        assert result["success"] is True
        assert result["symbol"] == "NFLX"
        assert universe.contains("NFLX")

        # Invalid symbol should fail
        result = universe.add_on_demand("INVALID_TOO_LONG_SYMBOL")
        assert result["success"] is False
        assert "error" in result

    def test_add_on_duplicate_returns_warning(self):
        """Test on-demand addition of duplicate symbol"""
        universe = StockUniverse()
        universe.add("AAPL")

        # Adding existing symbol should return warning
        result = universe.add_on_demand("AAPL")
        assert result["success"] is True
        assert result["added"] is False  # Already existed
        assert "message" in result

    def test_validate_symbol_non_alphanumeric(self):
        """Test rejecting non-alphanumeric symbols (line 126)"""
        universe = StockUniverse()
        assert universe.is_valid_symbol("AAPL@") is False
        assert universe.is_valid_symbol("GOO-GL") is False
        assert universe.is_valid_symbol("TSLA!") is False

    def test_add_if_valid_duplicate_returns_false(self):
        """Test that add_if_valid returns False for duplicate symbols (line 143)"""
        universe = StockUniverse()
        universe.add("AAPL")

        # Adding duplicate should return False
        result = universe.add_if_valid("AAPL")
        assert result is False
        assert universe.count() == 1  # Only one AAPL

    def test_load_nonexistent_file_raises_error(self):
        """Test loading from nonexistent file raises FileNotFoundError (line 181)"""
        with pytest.raises(FileNotFoundError, match="not found"):
            StockUniverse.load("/nonexistent/path/universe.json")

    def test_load_invalid_file_format_raises_error(self):
        """Test loading file with invalid format raises ValueError (line 187)"""
        import tempfile
        import json

        # Create a file without 'symbols' key
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({"invalid": "data"}, f)
            file_path = f.name

        try:
            with pytest.raises(ValueError, match="missing 'symbols' key"):
                StockUniverse.load(file_path)
        finally:
            import os
            os.unlink(file_path)
