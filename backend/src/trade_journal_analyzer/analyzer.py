"""
Trade Journal Analyzer

Analyzes trading journals to extract patterns and detect biases.
"""

from datetime import timedelta
from typing import List, Dict, Any
from collections import defaultdict
from .models import JournalEntry, TradePattern, BiasAlert

# Constants for bias detection
OVERTRADING_MIN_ENTRIES = 20
OVERTRADING_MAX_TIME_SPAN_DAYS = 1
OVERTRADING_THRESHOLD_TRADES_PER_DAY = 20
LOSS_SEQUENCE_TIME_WINDOW_SECONDS = 1800  # 30 minutes
LOSS_SEQUENCE_MIN_LENGTH = 2

# Constants for pattern analysis
DEFAULT_MIN_TRADES_FOR_PATTERN = 3
MIN_WIN_RATE_FOR_PATTERN = 50  # percentage
HIGH_WIN_RATE_THRESHOLD = 80
MEDIUM_WIN_RATE_THRESHOLD = 60
MIN_CONFIDENCE_FOR_RECOMMENDATION = 0.5
MAX_CONFIDENCE_TRADE_DIVISOR = 10
SECONDS_PER_DAY = 86400


class TradeJournalAnalyzer:
    """Analyzes trading journals for patterns and biases"""

    def __init__(self):
        """Initialize an empty analyzer"""
        self._entries: List[JournalEntry] = []
        self._patterns_cache: Dict[str, List[TradePattern]] = {}
        self._cache_timestamp: float = 0
        self._entries_version: int = 0

    def add_entry(self, entry: JournalEntry) -> None:
        """Add a journal entry

        Args:
            entry: Journal entry to add
        """
        self._entries.append(entry)
        self._entries_version += 1

    def calculate_win_rate(self) -> float:
        """Calculate overall win rate

        Returns:
            Win rate as percentage (0-100)
        """
        closed_trades = [e for e in self._entries if e.is_closed]

        if not closed_trades:
            return 0.0

        winners = [e for e in closed_trades if e.is_profitable]
        return (len(winners) / len(closed_trades)) * 100

    def detect_biases(self) -> List[BiasAlert]:
        """Detect psychological biases in trading behavior

        Returns:
            List of bias alerts
        """
        alerts = []

        # Detect overtrading (too many trades in short period)
        if len(self._entries) >= OVERTRADING_MIN_ENTRIES:
            # Check if entries are clustered in time
            time_span = self._get_time_span()
            if time_span and time_span < timedelta(days=OVERTRADING_MAX_TIME_SPAN_DAYS):
                trades_per_day = len(self._entries) / max(
                    time_span.total_seconds() / SECONDS_PER_DAY, 1
                )
                if trades_per_day > OVERTRADING_THRESHOLD_TRADES_PER_DAY:
                    alerts.append(
                        BiasAlert(
                            bias_type="overtrading",
                            severity="high",
                            message=f"Overtrading detected: {len(self._entries)} trades in {time_span.days + 1} days",
                            recommendations=[
                                "Reduce trading frequency",
                                "Focus on quality over quantity",
                                "Take breaks between trades",
                            ],
                        )
                    )

        # Detect chasing losses (quick re-entries after losses)
        loss_sequences = self._find_loss_sequences()
        if loss_sequences:
            alerts.append(
                BiasAlert(
                    bias_type="chasing_losses",
                    severity="medium",
                    message=f"Chasing losses detected: {len(loss_sequences)} instances",
                    recommendations=[
                        "Stop trading after a loss",
                        "Take a break to reset emotions",
                        "Review your strategy before re-entering",
                    ],
                )
            )

        return alerts

    def extract_patterns(
        self, min_trades: int = DEFAULT_MIN_TRADES_FOR_PATTERN
    ) -> List[TradePattern]:
        """Extract trading patterns from journal with caching

        Args:
            min_trades: Minimum number of trades to consider a pattern

        Returns:
            List of discovered patterns
        """
        if len(self._entries) < min_trades:
            return []

        # Check cache (valid for 60 seconds)
        import time

        cache_key = f"{min_trades}_{len(self._entries)}_{self._entries_version}"
        current_time = time.time()

        cached = self._patterns_cache.get(cache_key)
        if cached is not None and current_time - self._cache_timestamp < 60:
            return cached

        patterns = []

        # Analyze by time of day
        time_patterns = self._analyze_time_patterns(min_trades)
        patterns.extend(time_patterns)

        # Analyze by symbol
        symbol_patterns = self._analyze_symbol_patterns(min_trades)
        patterns.extend(symbol_patterns)

        # Sort by win rate
        patterns.sort(key=lambda p: p.win_rate, reverse=True)

        # Cache results
        self._patterns_cache[cache_key] = patterns
        self._cache_timestamp = current_time

        return patterns

    def get_performance_by_symbol(self) -> Dict[str, Dict[str, Any]]:
        """Calculate performance metrics by symbol

        Returns:
            Dictionary mapping symbol to performance metrics
        """
        symbol_stats: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"trades": [], "total_profit": 0.0, "wins": 0, "losses": 0}
        )

        for entry in self._entries:
            if entry.is_closed:
                stats = symbol_stats[entry.symbol]
                stats["trades"].append(entry)
                stats["total_profit"] += entry.profit
                if entry.is_profitable:
                    stats["wins"] += 1
                else:
                    stats["losses"] += 1

        # Calculate win rates
        result = {}
        for symbol, stats in symbol_stats.items():
            if stats["trades"]:
                result[symbol] = {
                    "total_trades": len(stats["trades"]),
                    "total_profit": stats["total_profit"],
                    "win_rate": (stats["wins"] / len(stats["trades"])) * 100
                    if len(stats["trades"]) > 0
                    else 0,
                    "wins": stats["wins"],
                    "losses": stats["losses"],
                }

        return result

    def generate_recommendations(
        self, patterns: List[TradePattern]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on discovered patterns

        Args:
            patterns: List of discovered patterns

        Returns:
            List of recommendations
        """
        recommendations = []

        for pattern in patterns:
            if (
                pattern.win_rate > MEDIUM_WIN_RATE_THRESHOLD
                and pattern.confidence > MIN_CONFIDENCE_FOR_RECOMMENDATION
            ):
                recommendations.append(
                    {
                        "type": "trading_strategy",
                        "priority": "high"
                        if pattern.win_rate > HIGH_WIN_RATE_THRESHOLD
                        else "medium",
                        "description": pattern.description,
                        "expected_win_rate": pattern.win_rate,
                        "action": f"Increase trades matching this pattern: {pattern.description}",
                    }
                )

        return recommendations

    def _get_time_span(self) -> timedelta:
        """Get time span of all entries"""
        if not self._entries:
            return timedelta(0)

        timestamps = [e.timestamp for e in self._entries]
        return max(timestamps) - min(timestamps)

    def _find_loss_sequences(self) -> List[List[JournalEntry]]:
        """Find sequences of losses in quick succession

        Returns:
            List of loss sequences
        """
        sequences = []

        # Sort entries by timestamp
        sorted_entries = sorted(self._entries, key=lambda e: e.timestamp)

        # Find sequences: loss within 30 minutes followed by another trade
        current_sequence: List[JournalEntry] = []

        for entry in sorted_entries:
            if entry.is_closed and not entry.is_profitable:
                if current_sequence:
                    # Check if this loss is within 30 minutes of last
                    time_diff = entry.timestamp - current_sequence[-1].timestamp
                    if time_diff.total_seconds() <= LOSS_SEQUENCE_TIME_WINDOW_SECONDS:
                        current_sequence.append(entry)
                    else:
                        # Save current sequence if it has minimum required losses
                        if len(current_sequence) >= LOSS_SEQUENCE_MIN_LENGTH:
                            sequences.append(current_sequence)
                        current_sequence = [entry]
                else:
                    current_sequence = [entry]
            else:
                # Save current sequence if it has minimum required losses
                if len(current_sequence) >= LOSS_SEQUENCE_MIN_LENGTH:
                    sequences.append(current_sequence)
                current_sequence = []

        # Add any remaining sequence
        if len(current_sequence) >= LOSS_SEQUENCE_MIN_LENGTH:
            sequences.append(current_sequence)

        return sequences

    def _analyze_time_patterns(self, min_trades: int) -> List[TradePattern]:
        """Analyze patterns by time of day"""
        # Group entries by hour
        hourly_stats: Dict[int, Dict[str, Any]] = defaultdict(
            lambda: {
                "trades": 0,
                "wins": 0,
                "total_profit": 0.0,
                "total_profit_percent": 0.0,
            }
        )

        for entry in self._entries:
            if entry.is_closed:
                hour = entry.timestamp.hour
                stats = hourly_stats[hour]
                stats["trades"] += 1
                stats["total_profit"] += entry.profit
                stats["total_profit_percent"] += entry.profit_percent
                if entry.is_profitable:
                    stats["wins"] += 1

        # Create patterns for high-performing hours
        patterns = []
        for hour, stats in hourly_stats.items():
            if stats["trades"] >= min_trades:
                win_rate = (stats["wins"] / stats["trades"]) * 100
                if win_rate > MIN_WIN_RATE_FOR_PATTERN:
                    hour_name = f"{hour:02d}:00-{(hour + 1) % 24:02d}"

                    # Determine time period
                    if 6 <= hour < 12:
                        period = "Morning"
                    elif 12 <= hour < 17:
                        period = "Afternoon"
                    else:
                        period = "Evening"

                    patterns.append(
                        TradePattern(
                            description=f"{period} trades ({hour_name})",
                            win_rate=win_rate,
                            total_trades=stats["trades"],
                            avg_profit_percent=stats["total_profit_percent"]
                            / stats["trades"],
                            confidence=min(
                                stats["trades"] / MAX_CONFIDENCE_TRADE_DIVISOR, 1.0
                            ),
                            factors={"time_period": period, "hour_range": hour_name},
                        )
                    )

        return patterns

    def _analyze_symbol_patterns(self, min_trades: int) -> List[TradePattern]:
        """Analyze patterns by symbol"""
        symbol_stats: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "trades": [],
                "wins": 0,
                "total_profit": 0.0,
                "total_profit_percent": 0.0,
            }
        )

        for entry in self._entries:
            if entry.is_closed:
                stats = symbol_stats[entry.symbol]
                stats["trades"].append(entry)
                stats["total_profit"] += entry.profit
                stats["total_profit_percent"] += entry.profit_percent
                if entry.is_profitable:
                    stats["wins"] += 1

        patterns = []
        for symbol, stats in symbol_stats.items():
            if len(stats["trades"]) >= min_trades:
                win_rate = (stats["wins"] / len(stats["trades"])) * 100
                patterns.append(
                    TradePattern(
                        description=f"{symbol} trading",
                        win_rate=win_rate,
                        total_trades=len(stats["trades"]),
                        avg_profit_percent=stats["total_profit_percent"]
                        / len(stats["trades"]),
                        confidence=min(
                            len(stats["trades"]) / MAX_CONFIDENCE_TRADE_DIVISOR, 1.0
                        ),
                        factors={"symbol": symbol},
                    )
                )

        return patterns
