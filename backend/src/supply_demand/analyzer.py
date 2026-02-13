"""
Supply/Demand Analyzer

Analyzes supply and demand zones from volume-by-price data.
Optimized with NumPy for high-performance calculations.
"""

from typing import List, Dict, Tuple, Optional
from .models import Zone, ZoneType, BreakoutEvent

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Constants for zone identification
ZONE_STRENGTH_DEFAULT = 0.5
ZONE_VOLUME_THRESHOLD_MULTIPLIER = 0.5  # 50% of average volume

# Constants for breakout detection
BREAKOUT_VOLUME_SURGE_MULTIPLIER = 1.5  # 50% volume surge for confirmation


class SupplyDemandAnalyzer:
    """Analyzes supply and demand zones"""

    def calculate_volume_by_price(self, data: List[Tuple[float, int]]) -> Dict[float, float]:
        """Calculate volume distribution by price levels

        Args:
            data: List of (price, volume) tuples

        Returns:
            Dictionary mapping price to total volume
        """
        if not data:
            return {}

        if HAS_NUMPY:
            prices = np.array([d[0] for d in data])
            volumes = np.array([d[1] for d in data])
            
            # Group by price and sum volumes efficiently
            unique_prices, indices = np.unique(prices, return_inverse=True)
            total_volumes = np.bincount(indices, weights=volumes)
            
            return dict(zip(unique_prices.tolist(), total_volumes.tolist()))

        # Fallback to pure Python
        volume_by_price: Dict[float, float] = {}
        for price, volume in data:
            volume_by_price[price] = volume_by_price.get(price, 0) + volume
        return volume_by_price

    def identify_levels(
        self,
        volume_by_price: Dict[float, float],
        current_price: float
    ) -> List[Zone]:
        """Identify support and resistance levels from volume profile

        Args:
            volume_by_price: Dictionary of price to volume
            current_price: Current market price

        Returns:
            List of identified zones
        """
        if not volume_by_price:
            return []

        prices_list = list(volume_by_price.keys())
        volumes_list = list(volume_by_price.values())

        if HAS_NUMPY:
            prices = np.array(prices_list)
            volumes = np.array(volumes_list)
            
            avg_volume = np.mean(volumes)
            max_vol = np.max(volumes)
            min_vol = np.min(volumes)
            
            # Vectorized filtering and strength calculation
            mask = volumes >= avg_volume * ZONE_VOLUME_THRESHOLD_MULTIPLIER
            filtered_prices = prices[mask]
            filtered_volumes = volumes[mask]
            
            if max_vol > min_vol:
                strengths = (filtered_volumes - min_vol) / (max_vol - min_vol)
            else:
                strengths = np.full(len(filtered_prices), ZONE_STRENGTH_DEFAULT)
                
            zones = []
            for p, v, s in zip(filtered_prices, filtered_volumes, strengths):
                zone_type = ZoneType.SUPPORT if p < current_price else ZoneType.RESISTANCE
                zones.append(Zone(
                    price=float(p),
                    volume=int(v),
                    zone_type=zone_type,
                    strength=float(s)
                ))
        else:
            # Fallback to pure Python
            max_volume = max(volumes_list)
            min_volume = min(volumes_list)
            avg_volume = sum(volumes_list) / len(volumes_list)
            
            zones = []
            threshold = avg_volume * ZONE_VOLUME_THRESHOLD_MULTIPLIER
            
            for price, volume in volume_by_price.items():
                if volume < threshold:
                    continue
                    
                zone_type = ZoneType.SUPPORT if price < current_price else ZoneType.RESISTANCE
                strength = (volume - min_volume) / (max_volume - min_volume) if max_volume > min_volume else ZONE_STRENGTH_DEFAULT
                
                zones.append(Zone(
                    price=price,
                    volume=int(volume),
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
        """Detect breakout from support or resistance zone"""
        if not zones:
            return None

        threshold = average_volume * BREAKOUT_VOLUME_SURGE_MULTIPLIER

        for zone in zones:
            # Resistance breakout (Bullish)
            if zone.zone_type == ZoneType.RESISTANCE and current_price > zone.price:
                return BreakoutEvent(
                    direction="bullish",
                    price=current_price,
                    zone=zone,
                    volume=current_volume,
                    is_confirmed=current_volume >= threshold
                )
            
            # Support breakout (Bearish)
            if zone.zone_type == ZoneType.SUPPORT and current_price < zone.price:
                return BreakoutEvent(
                    direction="bearish",
                    price=current_price,
                    zone=zone,
                    volume=current_volume,
                    is_confirmed=current_volume >= threshold
                )

        return None

    def get_nearest_support(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest support zone below current price"""
        supports = [z for z in zones if z.zone_type == ZoneType.SUPPORT and z.price < current_price]
        return max(supports, key=lambda z: z.price) if supports else None

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price"""
        resistances = [z for z in zones if z.zone_type == ZoneType.RESISTANCE and z.price > current_price]
        return min(resistances, key=lambda z: z.price) if resistances else None