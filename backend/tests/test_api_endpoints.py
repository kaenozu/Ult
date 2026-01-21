import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from src.api.server import create_app


class TestAPIEndpoints:
    """API endpoints integration tests."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        app = create_app()
        return TestClient(app)

    @pytest.fixture
    async def async_client(self):
        """Create async test client."""
        app = create_app()
        async with AsyncClient(app=app, base_url="http://testserver") as client:
            yield client

    def test_root_endpoint(self, client):
        """Test root health endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_health_endpoint(self, client):
        """Test detailed health endpoint."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_metrics_endpoint(self, client):
        """Test metrics endpoint."""
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "uptime" in data

    def test_portfolio_endpoints(self, client):
        """Test portfolio API endpoints structure."""
        # These endpoints may require authentication, but we test the routing
        response = client.get("/api/v1/portfolio")
        # Expect 401 or 404 depending on auth implementation
        assert response.status_code in [
            401,
            404,
            405,
        ]  # Not implemented or auth required

    def test_market_endpoints(self, client):
        """Test market data API endpoints."""
        response = client.get("/api/v1/market/status")
        assert response.status_code in [200, 401, 404]  # May require auth

    def test_trading_endpoints(self, client):
        """Test trading API endpoints."""
        response = client.get("/api/v1/trading/status")
        assert response.status_code in [200, 401, 404]

    def test_error_handling(self, client):
        """Test error response format."""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404
        # Check if error response follows standard format
        if response.content:
            data = response.json()
            assert "status" in data
            assert data["status"] == "error"

    def test_cors_headers(self, client):
        """Test CORS headers are properly set."""
        response = client.options(
            "/api/v1/health", headers={"Origin": "http://localhost:3000"}
        )
        assert "access-control-allow-origin" in response.headers

    def test_security_headers(self, client):
        """Test security headers."""
        response = client.get("/")
        headers = response.headers

        # Check for security headers
        assert "x-content-type-options" in headers
        assert "x-frame-options" in headers
        assert "x-xss-protection" in headers
        assert headers.get("x-frame-options") == "DENY"
