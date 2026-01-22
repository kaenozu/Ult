# Mocking missing modules to isolate NewsShockDefense test
import sys
from unittest.mock import MagicMock

# Mock src.news_aggregator if needed by import, but NewsShockDefense import doesn't require it at top level?
# Actually it imports inside method.

# Add backend to path
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.execution.news_shock_defense import NewsShockDefense

def test_shock_detection():
    print("Testing News Shock Defense...")
    
    defense = NewsShockDefense()
    
    # Mock Aggregator
    mock_aggregator = MagicMock()
    
    # CASE 1: Normal News
    print("\n--- CASE 1: Normal News ---")
    mock_aggregator.fetch_rss_news.return_value = [
        {"title": "Markets are calm", "summary": "Nothing happening", "published": "Now"}
    ]
    
    # Monkey patch the import inside the method (difficult, so we test logic directly)
    # We will test detect_shock_events directly
    res = defense.detect_shock_events(mock_aggregator.fetch_rss_news())
    print(f"Result: {res}")
    assert res is None, "Should be None"
    
    # CASE 2: Shock News
    print("\n--- CASE 2: Shock News (WAR) ---")
    shock_news = [
        {"title": "緊急速報: 某国で開戦の可能性", "summary": "国境付近で衝突", "published": "Now"}
    ]
    res = defense.detect_shock_events(shock_news)
    print(f"Result: {res}")
    assert res is not None, "Should detect SHOCK"
    assert res['category'] == "WAR"
    
    # CASE 3: Economic Shock
    print("\n--- CASE 3: Economic Shock (CRASH) ---")
    crash_news = [
        {"title": "NYダウが大暴落、サーキットブレーカー発動", "summary": "CRASH detected", "published": "Now"}
    ]
    res = defense.detect_shock_events(crash_news)
    print(f"Result: {res}")
    assert res['category'] == "ECONOMIC_SHOCK"
    
    print("\n✅ Verification Passed: Defense logic is sound.")

if __name__ == "__main__":
    test_shock_detection()
