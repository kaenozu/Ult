from typing import Dict


class FundamentalFilter:
    def __init__(self):
        pass

    def filter_undervalued(self, fundamentals: Dict, max_pe: float = 25.0, max_pbr: float = 3.0) -> bool:
        """
        Checks if the stock is undervalued based on PER and PBR.
        """
        if not fundamentals:
            return False

        pe = fundamentals.get("trailingPE")
        pbr = fundamentals.get("priceToBook")

        # If data is missing, we can either be strict (False) or lenient (True).
        # Let's be strict for now to ensure quality.
        if pe is None or pbr is None:
            return False

        return pe < max_pe and pbr < max_pbr

    def filter_quality(self, fundamentals: Dict, min_roe: float = 0.08) -> bool:
        """
        Checks if the stock is high quality based on ROE.
        """
        if not fundamentals:
            return False

        roe = fundamentals.get("returnOnEquity")

        if roe is None:
            return False

        return roe > min_roe

    def filter_large_cap(self, fundamentals: Dict, min_cap: float = 100_000_000_000) -> bool:
        """
        Checks if the stock is a large cap (default > 100B JPY).
        """
        if not fundamentals:
            return False

        cap = fundamentals.get("marketCap")

        if cap is None:
            return False

        return cap > min_cap
