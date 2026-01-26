"""
Supply/Demand Analyzer

Analyzes supply and demand zones from volume-by-price data.
"""

from typing import List, Dict, Tuple, Optional
from .models import Zone, ZoneType, BreakoutEvent


class SupplyDemandAnalyzer:
    """Analyzes supply and demand zones"""

    def calculate_volume_by_price(self, data: List[Tuple[float, int]]) -> Dict[float, int]:
        """Calculate volume distribution by price levels

        Args:
            data: List of (price, volume) tuples

        Returns:
            Dictionary mapping price to total volume
        """
        volume_by_price = {}

        for price, volume in data:
            if price in volume_by_price:
                volume_by_price[price] += volume
            else:
                volume_by_price[price] = volume

        return volume_by_price

    def identify_levels(
        self,
        volume_by_price: Dict[float, int],
        current_price: float
    ) -> List[Zone]:
        """Identify support and resistance levels from volume profile

        Args:
            volume_by_price: Dictionary of price to volume
            current_price: Current market price

        Returns:
            List of Zone objects
        """
        if not volume_by_price:
            return []

        # Calculate volume statistics
        volumes = list(volume_by_price.values())
        max_volume = max(volumes)
        min_volume = min(volumes)
        avg_volume = sum(volumes) / len(volumes)

        zones = []

        for price, volume in volume_by_price.items():
            # Determine zone type based on current price
            if price < current_price:
                zone_type = ZoneType.SUPPORT
            else:
                zone_type = ZoneType.RESISTANCE

            # Calculate strength based on volume relative to max
            # Higher volume = stronger zone
            if max_volume > min_volume:
                strength = (volume - min_volume) / (max_volume - min_volume)
            else:
                strength = 0.5

            # Only include significant zones (volume above average)
            if volume >= avg_volume * 0.5:  # 50% of average or more
                zones.append(Zone(
                    price=price,
                    volume=volume,
                    zone_type=zone_type,
                    strength=strength
                ))

        # Sort by strength (strongest first)
        zones.sort(key=lambda z: z.strength, reverse=True)

        return zones

    def detect_breakout(
        self,
        zones: List[Zone],
        current_price: float,
        current_volume: int,
        average_volume: int
    ) -> Optional[BreakoutEvent]:
        """Detect breakout from support or resistance zone

        Args:
            zones: List of support/resistance zones
            current_price: Current market price
            current_volume: Current trading volume
            average_volume: Average trading volume

        Returns:
            BreakoutEvent if breakout detected, None otherwise
        """
        if not zones:
            return None

        # Check for bullish breakout (price above resistance)
        resistance_zones = [z for z in zones if z.zone_type == ZoneType.RESISTANCE]
        for zone in resistance_zones:
            if current_price > zone.price:
                # Price broke through resistance
                is_confirmed = current_volume >= average_volume * 1.5  # 50% volume surge

                return BreakoutEvent(
                    direction="bullish",
                    price=current_price,
                    zone=zone,
                    volume=current_volume,
                    is_confirmed=is_confirmed
                )

        # Check for bearish breakout (price below support)
        support_zones = [z for z in zones if z.zone_type == ZoneType.SUPPORT]
        for zone in support_zones:
            if current_price < zone.price:
                # Price broke through support
                is_confirmed = current_volume >= average_volume * 1.5  # 50% volume surge

                return BreakoutEvent(
                    direction="bearish",
                    price=current_price,
                    zone=zone,
                    volume=current_volume,
                    is_confirmed=is_confirmed
                )

        return None

    def get_nearest_support(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest support zone below current price

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest support zone or None
        """
        support_zones = [z for z in zones if z.zone_type == ZoneType.SUPPORT and z.price < current_price]

        if not support_zones:
            return None

        # Find closest support below current price
        support_zones.sort(key=lambda z: z.price, reverse=True)  # Highest first
        return support_zones[0]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        resistance_zones = [z for z in zones if z.zone_type == ZoneType.RESISTANCE and z.price > current_price]

        if not resistance_zones:
            return None

        # Find closest resistance above current price
        resistance_zones.sort(key=lambda z: z.price)  # Lowest first
        return resistance_zones[0]
