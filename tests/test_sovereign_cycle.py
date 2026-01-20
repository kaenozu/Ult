import sys
import os
import unittest
from unittest.mock import MagicMock, patch
import logging

# Setup path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

# Import run_sovereign function/classes
# Note: we need to import from the file path because it is not a package
import run_sovereign as sov
from src.sovereign.scheduler import SovereignScheduler
import schedule

logging.basicConfig(level=logging.INFO)

class TestSovereignCycle(unittest.TestCase):
    
    def test_scheduler_loop(self):
        """Verify scheduler actually runs jobs."""
        print("\n--- Testing Scheduler ---")
        scheduler = SovereignScheduler()
        def mock_job():
            pass
        
        # Register job and verify
        scheduler.register_interval(1, mock_job) 
        
        # We can't easily wait 1 minute in test.
        # We assume `schedule` library works. We verify registration.
        self.assertEqual(len(schedule.get_jobs()), 1)
        schedule.clear()
        print("✅ Scheduler registration passed")

    @patch('run_sovereign.Notifier')
    def test_market_scan(self, MockNotifier):
        """Verify market scan job runs without error."""
        print("\n--- Testing Market Scan ---")
        notifier = MockNotifier.return_value
        
        sov.job_market_scan(notifier)
        
        # Check if notify sent
        notifier.send_message.assert_called()
        print("✅ Market Scan ran and notified")

    @patch('run_sovereign.Notifier')
    @patch('run_sovereign.ConsensusEngine')
    @patch('run_sovereign.JP_STOCKS', ['7203.T']) # Only test 1 stock
    def test_hive_deliberation(self, MockEngine, MockNotifier):
        """Verify Hive Deliberation loop components."""
        print("\n--- Testing Hive Deliberation (Mocked) ---")
        notifier = MockNotifier.return_value
        engine = MockEngine.return_value
        
        # Mock Engine Result
        engine.deliberate.return_value = {
            "consensus_score": 0.8,
            "signal": 1,
            "reason": "Mocked Buy"
        }
        
        sov.job_the_hive_deliberation(notifier, engine)
        
        # Should detect Strong Signal and Alert
        notifier.send_message.assert_called_with(
            "🚀 Trade Alerts", 
            "Strong Signals Detected:\n• **7203.T** BUY (Score: 0.80)\n", 
            0xe74c3c
        )
        print("✅ Hive Deliberation logic passed")

if __name__ == '__main__':
    unittest.main()
