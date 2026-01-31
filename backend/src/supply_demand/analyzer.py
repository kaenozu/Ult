"""
Supply/Demand Analyzer

Analyzes supply and demand zones from volume-by-price data.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Union
from collections import defaultdict
from .models import Zone, ZoneType, BreakoutEvent
from backend.src.cache.cache_manager import cached

# Constants for zone identification
ZONE_STRENGTH_DEFAULT = 0.5
ZONE_VOLUME_THRESHOLD_MULTIPLIER = 0.5  # 50% of average volume

# Constants for breakout detection
BREAKOUT_VOLUME_SURGE_MULTIPLIER = 1.5  # 50% volume surge for confirmation


class SupplyDemandAnalyzer:
    """Analyzes supply and demand zones"""

    def calculate_volume_by_price(
        self,
        data: List[Tuple[float, Union[int, float]]]
    ) -> Dict[float, Union[int, float]]:
        """Calculate volume distribution by price levels using numpy vectorization

        Args:
            data: List of (price, volume) tuples

        Returns:
            Dictionary mapping price to total volume
        """
        if not data:
            return {}
        
        # Convert to numpy arrays for vectorized operations
        data_array = np.array(data, dtype=object)
        prices = np.array([float(d[0]) for d in data])
        volumes = np.array([float(d[1]) for d in data])
        
        # Get unique prices and sum volumes for each price
        unique_prices, indices = np.unique(prices, return_inverse=True)
        summed_volumes = np.bincount(indices, weights=volumes)
        
        # Convert back to dictionary
        return dict(zip(unique_prices.tolist(), summed_volumes.tolist()))

    @cached(ttl=30, max_size=500)
    def identify_levels(
        self,
        volume_by_price: Dict[float, Union[int, float]],
        current_price: float
    ) -> List[Zone]:
        """Identify support and resistance levels using numpy vectorization

        Args:
            volume_by_price: Dictionary of price to volume
            current_price: Current market price

        Returns:
            List of Zone objects
        """
        if not volume_by_price:
            return []

        # Convert to numpy arrays for vectorized operations
        prices = np.array(list(volume_by_price.keys()), dtype=np.float64)
        volumes = np.array(list(volume_by_price.values()), dtype=np.float64)

        # Calculate volume statistics using numpy
        max_volume = np.max(volumes)
        min_volume = np.min(volumes)
        avg_volume = np.mean(volumes)

        # Determine zone types using vectorized operations
        zone_types = np.where(prices < current_price, ZoneType.SUPPORT, ZoneType.RESISTANCE)

        # Calculate strengths using vectorized operations
        if max_volume > min_volume:
            strengths = (volumes - min_volume) / (max_volume - min_volume)
        else:
            strengths = np.full_like(volumes, ZONE_STRENGTH_DEFAULT)

        # Filter significant zones (volume above average)
        significant_mask = volumes >= avg_volume * ZONE_VOLUME_THRESHOLD_MULTIPLIER
        
        # Create zone objects for significant levels
        zones = []
        for i in range(len(prices)):
            if significant_mask[i]:
                zones.append(Zone(
                    price=float(prices[i]),
                    volume=int(volumes[i]),
                    zone_type=zone_types[i],
                    strength=float(strengths[i])
                ))

        # Sort by strength (strongest first) using numpy argsort
        zones.sort(key=lambda z: z.strength, reverse=True)

        return zones

    def detect_breakout(
        self,
        zones: List[Zone],
        current_price: float,
        current_volume: Union[int, float],
        average_volume: Union[int, float]
    ) -> List[BreakoutEvent]:
        """Detect all breakouts from support or resistance zones

        Args:
            zones: List of support/resistance zones
            current_price: Current market price
            current_volume: Current trading volume
            average_volume: Average trading volume

        Returns:
            List of BreakoutEvent objects for all detected breakouts
        """
        breakouts: List[BreakoutEvent] = []

        if not zones:
            return breakouts

        # Convert zones to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Check for bullish breakout (price above resistance)
        resistance_mask = zone_types == ZoneType.RESISTANCE
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) > 0:
            bullish_breakout_mask = current_price > resistance_prices
            is_confirmed = current_volume >= average_volume * BREAKOUT_VOLUME_SURGE_MULTIPLIER
            
            for i, zone in enumerate(resistance_zones):
                if bullish_breakout_mask[i]:
                    breakouts.append(BreakoutEvent(
                        direction="bullish",
                        price=current_price,
                        zone=zone,
                        volume=int(current_volume),
                        is_confirmed=is_confirmed
                    ))

        # Check for bearish breakout (price below support)
        support_mask = zone_types == ZoneType.SUPPORT
        support_prices = zone_prices[support_mask]
        support_zones = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) > 0:
            bearish_breakout_mask = current_price < support_prices
            is_confirmed = current_volume >= average_volume * BREAKOUT_VOLUME_SURGE_MULTIPLIER
            
            for i, zone in enumerate(support_zones):
                if bearish_breakout_mask[i]:
                    breakouts.append(BreakoutEvent(
                        direction="bearish",
                        price=current_price,
                        zone=zone,
                        volume=int(current_volume),
                        is_confirmed=is_confirmed
                    ))

        return breakouts

    @cached(ttl=30, max_size=500)
    def get_nearest_support(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest support zone below current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest support zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]

        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]


        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]

        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]



        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]

        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]


        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]

        
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]
        # Filter support zones below current price
        support_mask = (zone_types == ZoneType.SUPPORT) & (zone_prices < current_price)
        support_prices = zone_prices[support_mask]
        support_zones_list = [zones[i] for i in range(len(zones)) if support_mask[i]]
        
        if len(support_prices) == 0:
            return None

        # Find closest support below current price using numpy argmax
        nearest_idx = np.argmax(support_prices)
        return support_zones_list[nearest_idx]

    def get_nearest_resistance(self, zones: List[Zone], current_price: float) -> Optional[Zone]:
        """Find nearest resistance zone above current price using numpy vectorization

        Args:
            zones: List of zones
            current_price: Current market price

        Returns:
            Nearest resistance zone or None
        """
        if not zones:
            return None
        
        # Convert to numpy arrays for vectorized operations
        zone_prices = np.array([z.price for z in zones])
        zone_types = np.array([z.zone_type for z in zones])
        
        # Filter resistance zones above current price
        resistance_mask = (zone_types == ZoneType.RESISTANCE) & (zone_prices > current_price)
        resistance_prices = zone_prices[resistance_mask]
        resistance_zones_list = [zones[i] for i in range(len(zones)) if resistance_mask[i]]
        
        if len(resistance_prices) == 0:
            return None

        # Find closest resistance above current price using numpy argmin
        nearest_idx = np.argmin(resistance_prices)
        return resistance_zones_list[nearest_idx]




