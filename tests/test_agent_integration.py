import unittest
from unittest.mock import MagicMock, patch
import pandas as pd
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from src.core.agent_loop import AutonomousAgent
from src.core.schemas import ActionType

class TestAgentIntegration(unittest.TestCase):
    def setUp(self):
        # Initialize Agent
        self.agent = AutonomousAgent(check_interval=0.1)
        
        # Mock dependencies to avoid real API calls
        self.agent.approval_service = MagicMock()
        self.agent.circuit_breaker = MagicMock()
        self.agent.circuit_breaker.check_health.return_value = True
        self.agent.shock_defense = MagicMock()
        self.agent.shock_defense.analyze_current_market.return_value = None
        
        # Mock Websocket manager (it's a global import in agent_loop)
        # We can't easily mock the global import without patching 'src.core.agent_loop.ws_manager'
        
    @patch("src.core.agent_loop.fetch_stock_data")
    @patch("src.core.agent_loop.ws_manager")
    def test_agent_buy_scenario(self, mock_ws, mock_fetch):
        """
        Simulate a BULL market scenario where Agent should Decide to BUY.
        """
        print("\n--- Testing Agent BUY Scenario ---")
        
        # 1. Mock Data (Uptrend)
        prices = [100 + i for i in range(50)] # Steady climb
        df = pd.DataFrame({
            "Open": prices, "High": prices, "Low": prices, "Close": prices, "Volume": [1000]*50
        }, index=pd.date_range("2024-01-01", periods=50))
        
        mock_fetch.return_value = {"7203.T": df}
        
        # 2. Run Perception
        # agent._perceive is sync in logic, but called via to_thread. 
        # For unit test, we call directly or mock _perceive.
        # Let's mock _perceive to return our df directly to test _think/_act logic.
        self.agent._perceive = MagicMock(return_value=df)
        
        # 3. Run Thinking (Consensus)
        # We need to ensure ConsensusEngine returns BUY.
        # It uses StrategyRouter -> LightGBM etc.
        # Instead of mocking internal deep logic, let's mock ConsensusEngine.deliberate
        self.agent.consensus = MagicMock()
        self.agent.consensus.deliberate.return_value = {
            "signal": 1,
            "confidence": 0.8,
            "reason": "Strong Uptrend detected by Tech and News.",
            "consensus_score": 0.8
        }
        
        # 4. Execute Act
        market_data = self.agent._perceive()
        consensus_result = self.agent._think(market_data)
        
        # Mock thought schema
        thought = MagicMock()
        thought.content = "Bullish"
        thought.sentiment_score = 0.9
        
        action = self.agent._act(thought, consensus_result)
        
        print(f"Action Generated: {action}")
        
        # 5. Assertions
        self.assertIsNotNone(action)
        self.assertEqual(action.type, ActionType.BUY)
        self.assertEqual(action.ticker, "7203.T")
        self.assertGreater(action.quantity, 0)
        print("✅ Agent correctly generated BUY action.")

    @patch("src.core.agent_loop.fetch_stock_data")
    @patch("src.core.agent_loop.ws_manager")
    def test_agent_wait_scenario(self, mock_ws, mock_fetch):
        """
        Simulate a NEUTRAL/UNCERTAIN market. Agent should HOLD.
        """
        print("\n--- Testing Agent WAIT Scenario ---")
        
        # Consensus returns signal 0
        self.agent.consensus = MagicMock()
        self.agent.consensus.deliberate.return_value = {
            "signal": 0,
            "confidence": 0.0,
            "reason": "Market is choppy. No clear signal.",
            "consensus_score": 0.0
        }
        
        market_data = pd.DataFrame() # Dummy
        consensus_result = self.agent._think(market_data)
        
        thought = MagicMock()
        thought.sentiment_score = 0.5
        
        action = self.agent._act(thought, consensus_result)
        
        # Assertions
        self.assertIsNone(action)
        print("✅ Agent correctly decided to WAIT (No Action).")

if __name__ == "__main__":
    unittest.main()
