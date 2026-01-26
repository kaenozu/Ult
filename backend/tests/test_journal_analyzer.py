"""
Trade Journal Analyzer Tests

This module tests the Trade Journal Analyzer which handles:
- Journal entry analysis and pattern extraction
- Win rate calculation by various dimensions
- Psychological bias detection
- Pattern-based recommendations
"""

import pytest
from datetime import datetime, timedelta
from trade_journal_analyzer import TradeJournalAnalyzer, JournalEntry, TradePattern, BiasAlert


class TestTradeJournalAnalyzer:
    """Test cases for TradeJournalAnalyzer class"""

    def test_create_analyzer(self):
        """Test creating a journal analyzer"""
        analyzer = TradeJournalAnalyzer()
        assert analyzer is not None

    def test_calculate_overall_win_rate(self):
        """Test calculating overall win rate"""
        analyzer = TradeJournalAnalyzer()

        # Add sample entries - only CLOSED trades count
        entries = [
            self._create_entry(profit=5000, status="CLOSED", profit_percent=5.0),  # Win
            self._create_entry(profit=-2000, status="CLOSED", profit_percent=-2.0),  # Loss
            self._create_entry(profit=3000, status="CLOSED", profit_percent=3.0),  # Win
            self._create_entry(profit=-1000, status="CLOSED", profit_percent=-1.0),  # Loss
        ]

        for entry in entries:
            analyzer.add_entry(entry)

        win_rate = analyzer.calculate_win_rate()

        # 2 wins out of 4 closed trades = 50%
        assert win_rate == pytest.approx(50.0, rel=0.1)

    def test_detect_overtrading_bias(self):
        """Test detecting overtrading bias (too many trades)"""
        analyzer = TradeJournalAnalyzer()

        # Create 20+ entries in a single day (overtrading)
        base_time = datetime(2026, 1, 25, 10, 0, 0)
        for i in range(25):
            analyzer.add_entry(self._create_entry(
                timestamp=base_time + timedelta(seconds=i * 60)  # Different times
            ))

        biases = analyzer.detect_biases()

        assert len(biases) > 0
        assert any(b.bias_type == "overtrading" for b in biases)

    def test_detect_chasing_losses_bias(self):
        """Test detecting chasing losses bias"""
        analyzer = TradeJournalAnalyzer()

        # Create pattern: quick loss followed by another entry
        # Loss at 10:00, another entry at 10:05, loss at 10:10
        base_time = datetime(2026, 1, 25, 10, 0, 0)

        entry1 = self._create_entry(timestamp=base_time, profit=-1000, status="CLOSED", profit_percent=-1.0)
        analyzer.add_entry(entry1)

        entry2 = self._create_entry(timestamp=base_time + timedelta(minutes=5), profit=-500, status="CLOSED", profit_percent=-0.5)
        analyzer.add_entry(entry2)

        entry3 = self._create_entry(timestamp=base_time + timedelta(minutes=10), profit=-800, status="CLOSED", profit_percent=-0.8)
        analyzer.add_entry(entry3)

        biases = analyzer.detect_biases()

        assert any(b.bias_type == "chasing_losses" for b in biases)

    def test_extract_winning_patterns(self):
        """Test extracting winning patterns from journal"""
        analyzer = TradeJournalAnalyzer()

        # Add winning trades with common patterns
        # Pattern 1: Morning trades at 9am, tech sector - 5 trades in same hour
        for i in range(5):
            entry = self._create_entry(
                timestamp=datetime(2026, 1, 25, 9, 10 + i * 5, 0),  # Same hour (9am)
                profit=2000 * (i + 1),
                symbol="AAPL",
                status="CLOSED",
                profit_percent=2.0 * (i + 1)
            )
            analyzer.add_entry(entry)

        # Add some losing trades at 2pm
        for i in range(3):
            entry = self._create_entry(
                timestamp=datetime(2026, 1, 25, 14, 30 + i * 10, 0),
                profit=-1000 * (i + 1),
                symbol="AAPL",
                status="CLOSED",
                profit_percent=-1.0 * (i + 1)
            )
            analyzer.add_entry(entry)

        patterns = analyzer.extract_patterns()

        assert len(patterns) > 0
        morning_pattern = next((p for p in patterns if "morning" in p.description.lower()), None)
        assert morning_pattern is not None
        assert morning_pattern.win_rate > 70  # High win rate for morning pattern

    def test_calculate_performance_by_symbol(self):
        """Test calculating performance by stock symbol"""
        analyzer = TradeJournalAnalyzer()

        # Add trades for different symbols
        symbols = ["AAPL", "GOOGL", "TSLA"]
        for i, symbol in enumerate(symbols):
            for j in range(5):
                profit = 1000 * (j + 1) if i != 2 else -500 * (j + 1)  # TSLA loses
                analyzer.add_entry(self._create_entry(
                    symbol=symbol,
                    profit=profit,
                    status="CLOSED"
                ))

        performance = analyzer.get_performance_by_symbol()

        assert "AAPL" in performance
        assert "GOOGL" in performance
        assert "TSLA" in performance

        # AAPL and GOOGL should be profitable, TSLA not
        assert performance["AAPL"]["total_profit"] > 0
        assert performance["GOOGL"]["total_profit"] > 0
        assert performance["TSLA"]["total_profit"] < 0

    def test_generate_recommendations_from_patterns(self):
        """Test generating recommendations based on patterns"""
        analyzer = TradeJournalAnalyzer()

        # Add entries with clear winning pattern
        for i in range(10):
            analyzer.add_entry(self._create_entry(
                timestamp=datetime(2026, 1, 25, 10, i * 5, 0),
                profit=1000,
                symbol="AAPL",
                signal_type="BUY",
                indicator="RSI",
                status="CLOSED",
                profit_percent=1.0
            ))

        patterns = analyzer.extract_patterns()
        recommendations = analyzer.generate_recommendations(patterns)

        assert len(recommendations) > 0
        assert any("AAPL" in r.get("description", "") for r in recommendations)

    def test_no_entries_returns_empty_patterns(self):
        """Test that analyzer handles empty journal"""
        analyzer = TradeJournalAnalyzer()

        patterns = analyzer.extract_patterns()
        biases = analyzer.detect_biases()

        assert len(patterns) == 0
        assert len(biases) == 0

    def _create_entry(
        self,
        timestamp: datetime = None,
        symbol: str = "AAPL",
        profit: float = 0,
        status: str = "OPEN",
        profit_percent: float = 0.0,
        signal_type: str = "MANUAL",
        indicator: str = "PRICE"
    ) -> JournalEntry:
        """Helper to create a journal entry"""
        if timestamp is None:
            timestamp = datetime.now()

        return JournalEntry(
            id=f"entry_{timestamp.timestamp()}",
            timestamp=timestamp,
            symbol=symbol,
            entry_price=100.0,
            exit_price=100.0 + profit,
            profit=profit,
            profit_percent=profit_percent,
            signal_type=signal_type,
            indicator=indicator,
            status=status
        )
