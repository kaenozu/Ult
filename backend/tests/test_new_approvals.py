
import unittest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

# It's better to use absolute imports for clarity and robustness
from src.api.routers import approvals
from src.auth import User

# Mock user data
mock_user = User(id=1, username="testuser", email="test@example.com", is_active=True)

class TestApprovalsAPI(unittest.TestCase):
    """Approvals API endpoint tests."""

    @patch("src.api.routers.approvals.get_approval_system")
    def test_make_approval_decision_approve(self, mock_get_system):
        """Test approving a request."""
        # Mock the approval system
        mock_workflow = MagicMock()
        mock_workflow.approve.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        # Mock the request object that the endpoint expects
        class MockApprovalDecisionRequest:
            pass

        request = MockApprovalDecisionRequest()
        request.request_id = "test_req_123"
        request.decision = "approve"
        request.reason = None

        import asyncio
        result = asyncio.run(approvals.make_approval_decision(request, mock_user))

        self.assertEqual(result["success"], True)
        mock_workflow.approve.assert_called_once_with(
            request_id="test_req_123",
            approved_by=mock_user.username,
            platform="web",
        )

    @patch("src.api.routers.approvals.get_approval_system")
    def test_make_approval_decision_reject(self, mock_get_system):
        """Test rejecting a request."""
        mock_workflow = MagicMock()
        mock_workflow.reject.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        class MockApprovalDecisionRequest:
            pass

        request = MockApprovalDecisionRequest()
        request.request_id = "test_req_456"
        request.decision = "reject"
        request.reason = "Not good"

        import asyncio
        result = asyncio.run(approvals.make_approval_decision(request, mock_user))

        self.assertEqual(result["success"], True)
        mock_workflow.reject.assert_called_once_with(
            request_id="test_req_456",
            rejected_by=mock_user.username,
            reason="Not good",
            platform="web",
        )

    @patch("src.api.routers.approvals.get_approval_system")
    def test_cancel_approval(self, mock_get_system):
        """Test cancelling an approval."""
        mock_workflow = MagicMock()
        mock_workflow.cancel.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        import asyncio
        result = asyncio.run(approvals.cancel_approval("test_req_789", mock_user))

        self.assertEqual(result["success"], True)
        mock_workflow.cancel.assert_called_once_with(
            "test_req_789", mock_user.username
        )

if __name__ == "__main__":
    unittest.main()
