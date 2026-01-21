import unittest
import pandas as pd
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from src.agents.risk_agent import RiskAgent

class TestRiskVeto(unittest.TestCase):
    def setUp(self):
        self.risk_agent = RiskAgent()

    def test_vix_explosion(self):
        """
        Scenario: VIX jumps to 40 (Crisis Level). RiskAgent MUST Veto.
        """
        print("\n--- Testing Risk Agent VETO (VIX Explosion) ---")
        
        # Mock Stock Data
        df = pd.DataFrame({"Close": [100, 101, 102]})
        
        # Mock External Data (High VIX)
        vix_df = pd.DataFrame({"Close": [35, 38, 42]}, index=pd.date_range("2024-01-01", periods=3))
        external_data = {"VIX": vix_df}
        
        # Analyze
        result = self.risk_agent.analyze(df, external_data)
        
        print(f"Risk Score: {result['risk_score']}")
        print(f"Is Veto: {result['is_veto']}")
        print(f"Reasons: {result['reasons']}")
        
        # Assertions
        self.assertTrue(result["is_veto"], "RiskAgent failed to veto high VIX!")
        self.assertGreaterEqual(result["risk_score"], 0.8, "Risk score should be critical.")
        print("✅ PASSED: Risk Agent correctly blocked trading during panic.")

    def test_normal_market(self):
        """
        Scenario: VIX at 15 (Normal). No Veto.
        """
        print("\n--- Testing Risk Agent NORMAL (Low VIX) ---")
        
        df = pd.DataFrame({"Close": [100, 101, 102]})
        vix_df = pd.DataFrame({"Close": [14, 15, 16]}, index=pd.date_range("2024-01-01", periods=3))
        external_data = {"VIX": vix_df}
        
        result = self.risk_agent.analyze(df, external_data)
        
        self.assertFalse(result["is_veto"], "RiskAgent vetoed a safe market!")
        self.assertLess(result["risk_score"], 0.5)
        print("✅ PASSED: Risk Agent allowed trading in normal conditions.")

if __name__ == "__main__":
    unittest.main()
