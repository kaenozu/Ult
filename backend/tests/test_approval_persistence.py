
import unittest
import os
import shutil
import json
from datetime import datetime
from src.database_manager import db_manager, DatabaseManager
from src.approval_system import ApprovalWorkflowManager, ApprovalRequest, ApprovalType, ApprovalContext, ApprovalStatus

class TestApprovalPersistence(unittest.TestCase):
    def setUp(self):
        # Use a temporary DB for testing
        self.test_db_path = "data/test_agstock.db"
        # Monkey patch db_manager's path (not ideal but quick for test)
        # Better: DatabaseManager takes path in init, but it's singleton.
        # We will assume normal DB is fine or use a test instance if possible.
        # Actually DatabaseManager uses global DB_PATH. Let's rely on standard logic but keep ID unique.
        pass

    def test_persistence_flow(self):
        print("\nTesting Approval Persistence Flow...")
        
        # 1. Initialize Managers
        workflow = ApprovalWorkflowManager()
        
        # 2. Create Request
        context = ApprovalContext(
            ticker="TEST_PERSIST",
            action="BUY",
            quantity=100.0,
            price=150.0,
            reason="Persistence Check"
        )
        
        req = workflow.create_approval_request(
            approval_type=ApprovalType.TRADE_EXECUTION,
            title="Persistence Test Trade",
            description="Testing if this survives restart",
            context=context
        )
        req_id = req.request_id
        print(f"Created Request: {req_id}")
        
        # 3. Verify in DB immediately
        db_req = db_manager.get_approval_request(req_id)
        self.assertIsNotNone(db_req)
        self.assertEqual(db_req["status"], "pending")
        print("Verified in DB: OK")
        
        # 4. Simulate Restart (Create new workflow manager instance)
        print("Simulating Restart...")
        new_workflow = ApprovalWorkflowManager()
        
        # 5. Verify Request is loaded into memory
        loaded_req = new_workflow.get_request(req_id)
        self.assertIsNotNone(loaded_req)
        self.assertEqual(loaded_req.title, "Persistence Test Trade")
        self.assertEqual(loaded_req.context.ticker, "TEST_PERSIST")
        print("Verified Loaded after Restart: OK")
        
        # 6. Approve
        print("Approving Request...")
        new_workflow.approve(req_id, approved_by="TestUser", platform="web")
        
        # 7. Verify DB status updated
        db_req_updated = db_manager.get_approval_request(req_id)
        self.assertEqual(db_req_updated["status"], "approved")
        self.assertEqual(db_req_updated["approved_by"], "TestUser")
        print("Verified DB Status Update: OK")
        
        # Cleanup (optional, maybe keep for manual inspection)
        # db_manager.cleanup_old_data(days=0) # Careful with this

if __name__ == '__main__':
    unittest.main()
