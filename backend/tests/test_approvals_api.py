
import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from src.api.server import create_app
from src.auth import User

# Mock user data
mock_user = User(id=1, username="testuser", email="test@example.com", is_active=True)

# Override dependency to return the mock user
async def override_get_current_user():
    return mock_user

class TestApprovalsAPI:
    """Approvals API endpoint tests."""

    @pytest.fixture
    def client(self):
        """Create test client with overridden dependency."""
        from src.api.dependencies import get_current_user
        app = create_app()
        app.dependency_overrides[get_current_user] = override_get_current_user
        return TestClient(app)

    @patch("src.api.routers.approvals.get_approval_system")
    def test_make_approval_decision_approve(self, mock_get_system, client):
        """Test approving a request."""
        # Mock the approval system
        mock_workflow = MagicMock()
        mock_workflow.approve.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        response = client.post(
            "/approvals/decision",
            json={"request_id": "test_req_123", "decision": "approve"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        mock_workflow.approve.assert_called_once_with(
            request_id="test_req_123",
            approved_by=mock_user.username,
            platform="web",
        )

    @patch("src.api.routers.approvals.get_approval_system")
    def test_make_approval_decision_reject(self, mock_get_system, client):
        """Test rejecting a request."""
        mock_workflow = MagicMock()
        mock_workflow.reject.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        response = client.post(
            "/approvals/decision",
            json={
                "request_id": "test_req_456",
                "decision": "reject",
                "reason": "Not good",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        mock_workflow.reject.assert_called_once_with(
            request_id="test_req_456",
            rejected_by=mock_user.username,
            reason="Not good",
            platform="web",
        )

    @patch("src.api.routers.approvals.get_approval_system")
    def test_cancel_approval(self, mock_get_system, client):
        """Test cancelling an approval."""
        mock_workflow = MagicMock()
        mock_workflow.cancel.return_value = True
        mock_system = MagicMock()
        mock_system.workflow = mock_workflow
        mock_get_system.return_value = mock_system

        response = client.delete("/approvals/test_req_789")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        mock_workflow.cancel.assert_called_once_with(
            "test_req_789", mock_user.username
        )
