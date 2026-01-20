import sys
import os
import logging
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from src.agents.news_agent import NewsAgent

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_vader():
    print("\n--- Testing NewsAgent (VADER) ---")
    agent = NewsAgent()
    
    # Test Data
    positive_headlines = [
        "Toyota profit soars 20% on strong hybrid sales.",
        "Analyst upgrades Toyota to Buy target raised."
    ]
    
    negative_headlines = [
        "Toyota recalls 1 million vehicles due to airbag defect.",
        "Supply chain crisis halts production, shares slump."
    ]
    
    mixed_headlines = [
        "Revenue keeps growing but guidance is weak.",
        "Toyota announces new CEO amid market uncertainty."
    ]
    
    # Run Analysis
    score_pos = agent.analyze_headlines("TEST", positive_headlines)
    score_neg = agent.analyze_headlines("TEST", negative_headlines)
    score_mix = agent.analyze_headlines("TEST", mixed_headlines)
    
    print(f"Positive Headlines Score: {score_pos:.3f} (Expect > 0.3)")
    print(f"Negative Headlines Score: {score_neg:.3f} (Expect < -0.3)")
    print(f"Mixed Headlines Score:    {score_mix:.3f} (Expect ~0.0)")
    
    # Assertions
    if score_pos > 0.2:
        print("✅ Positive Test Passed")
    else:
        print("❌ Positive Test Failed")
        
    if score_neg < -0.2:
        print("✅ Negative Test Passed")
    else:
        print("❌ Negative Test Failed")

if __name__ == "__main__":
    test_vader()
