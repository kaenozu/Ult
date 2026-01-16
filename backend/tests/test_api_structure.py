
import sys
import os
from pathlib import Path

# Add backend root to sys.path (c:\gemini-thinkpad\Ult\backend)
backend_root = Path(__file__).resolve().parents[1]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from src.api_server import get_app

client = TestClient(get_app())

def test_health_check():
    """Verify Health Check works"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("Health Check Passed")

def test_routes_registration():
    """Verify all major routes are registered"""
    # FastAPI stores routes in app.routes
    routes = [route.path for route in client.app.routes]
    
    expected_routes = [
        "/api/v1/portfolio",
        "/api/v1/positions",
        "/api/v1/trade",
        "/api/v1/market/{ticker}",
        "/api/v1/macro",
        "/api/v1/config",
        "/api/v1/alerts",
        "/api/v1/advice",
        "/api/v1/rebalance"
    ]
    
    for route in expected_routes:
        assert route in routes, f"Route {route} not found!"
    
    print("All Routes Registered Successfully")

if __name__ == "__main__":
    try:
        test_health_check()
        test_routes_registration()
        print("API STRUCTURE VERIFICATION PASSED")
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        sys.exit(1)
