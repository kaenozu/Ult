"""
Supply/Demand Analysis Tests

This module tests the Supply/Demand Analysis which handles:
- Volume-by-price analysis
- Support/resistance level detection
- Breakout detection with volume confirmation
- Zone strength identification
"""

import pytest
from supply_demand import SupplyDemandAnalyzer, Zone, ZoneType, BreakoutEvent


class TestSupplyDemandAnalyzer:
    """Test cases for SupplyDemandAnalyzer class"""

    def test_create_analyzer(self):
        """Test creating a supply/demand analyzer"""
        analyzer = SupplyDemandAnalyzer()
        assert analyzer is not None

    def test_calculate_volume_by_price(self):
        """Test calculating volume distribution by price levels"""
        analyzer = SupplyDemandAnalyzer()

        # Sample data: price and volume pairs
        data = [
            (100.0, 1000),  # Price, Volume
            (101.0, 2000),
            (102.0, 5000),  # High volume at 102
            (103.0, 3000),
            (104.0, 1000),
        ]

        volume_by_price = analyzer.calculate_volume_by_price(data)

        assert 102.0 in volume_by_price
        assert volume_by_price[102.0] == 5000
        assert len(volume_by_price) == 5

    def test_identify_support_levels(self):
        """Test identifying support levels from volume profile"""
        analyzer = SupplyDemandAnalyzer()

        # Create volume profile with high volume at lower prices
        volume_by_price = {
            98.0: 8000,   # Strong support
            99.0: 3000,
            100.0: 5000,
            101.0: 2000,
            102.0: 1000,
        }

        zones = analyzer.identify_levels(volume_by_price, current_price=102.0)

        # Should identify support at 98.0 and 100.0
        support_zones = [z for z in zones if z.zone_type == ZoneType.SUPPORT]
        assert len(support_zones) > 0
        assert any(z.price == 98.0 for z in support_zones)

    def test_identify_resistance_levels(self):
        """Test identifying resistance levels from volume profile"""
        analyzer = SupplyDemandAnalyzer()

        # Create volume profile with high volume at higher prices
        volume_by_price = {
            98.0: 1000,
            99.0: 2000,
            100.0: 5000,
            101.0: 3000,
            102.0: 8000,  # Strong resistance
        }

        zones = analyzer.identify_levels(volume_by_price, current_price=98.0)

        # Should identify resistance at 100.0 and 102.0
        resistance_zones = [z for z in zones if z.zone_type == ZoneType.RESISTANCE]
        assert len(resistance_zones) > 0
        assert any(z.price == 102.0 for z in resistance_zones)

    def test_detect_breakout_bullish_with_volume(self):
        """Test detecting bullish breakout with volume confirmation"""
        analyzer = SupplyDemandAnalyzer()

        # Previous resistance at 100
        zones = [Zone(price=100.0, volume=5000, zone_type=ZoneType.RESISTANCE, strength=0.8)]

        # Price breaks through with high volume
        current_price = 101.0
        current_volume = 10000  # 2x average volume

        breakout = analyzer.detect_breakout(
            zones=zones,
            current_price=current_price,
            current_volume=current_volume,
            average_volume=5000
        )

        assert breakout is not None
        assert breakout.direction == "bullish"
        assert breakout.is_confirmed is True

    def test_detect_breakout_no_volume_confirmation(self):
        """Test that breakout without volume is not confirmed"""
        analyzer = SupplyDemandAnalyzer()

        zones = [Zone(price=100.0, volume=5000, zone_type=ZoneType.RESISTANCE, strength=0.8)]

        # Price breaks through but with low volume
        current_price = 101.0
        current_volume = 2000  # Lower than average

        breakout = analyzer.detect_breakout(
            zones=zones,
            current_price=current_price,
            current_volume=current_volume,
            average_volume=5000
        )

        # Should detect breakout but not confirmed
        assert breakout is not None
        assert breakout.is_confirmed is False

    def test_no_breakout_when_within_range(self):
        """Test that no breakout is detected when price is within range"""
        analyzer = SupplyDemandAnalyzer()

        zones = [Zone(price=100.0, volume=5000, zone_type=ZoneType.RESISTANCE, strength=0.8)]

        # Price still below resistance
        current_price = 99.0
        current_volume = 10000

        breakout = analyzer.detect_breakout(
            zones=zones,
            current_price=current_price,
            current_volume=current_volume,
            average_volume=5000
        )

        assert breakout is None

    def test_zone_strength_classification(self):
        """Test zone strength classification (strong/medium/weak)"""
        analyzer = SupplyDemandAnalyzer()

        # Use volumes that all pass the filter
        volume_by_price = {
            100.0: 10000,  # Strong
            101.0: 5000,   # Medium
            102.0: 2000,   # Weak but above threshold
        }

        zones = analyzer.identify_levels(volume_by_price, current_price=99.0)

        # Check strength classification
        strong_zones = [z for z in zones if z.strength >= 0.7]
        medium_weak_zones = [z for z in zones if z.strength < 0.7]

        # Should have at least one strong zone
        assert len(strong_zones) > 0
        # Should have zones with varying strength
        assert len(medium_weak_zones) > 0

    def test_get_nearest_support(self):
        """Test finding nearest support level"""
        analyzer = SupplyDemandAnalyzer()

        zones = [
            Zone(price=95.0, volume=3000, zone_type=ZoneType.SUPPORT, strength=0.5),
            Zone(price=98.0, volume=5000, zone_type=ZoneType.SUPPORT, strength=0.7),
            Zone(price=100.0, volume=2000, zone_type=ZoneType.RESISTANCE, strength=0.4),
        ]

        nearest = analyzer.get_nearest_support(zones, current_price=99.0)

        assert nearest is not None
        assert nearest.price == 98.0

    def test_get_nearest_resistance(self):
        """Test finding nearest resistance level"""
        analyzer = SupplyDemandAnalyzer()

        zones = [
            Zone(price=100.0, volume=2000, zone_type=ZoneType.RESISTANCE, strength=0.4),
            Zone(price=102.0, volume=5000, zone_type=ZoneType.RESISTANCE, strength=0.7),
            Zone(price=105.0, volume=3000, zone_type=ZoneType.RESISTANCE, strength=0.5),
        ]

        nearest = analyzer.get_nearest_resistance(zones, current_price=99.0)

        assert nearest is not None
        assert nearest.price == 100.0
