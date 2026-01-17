"""
API Integration Tests
FastAPIエンドポイントの統合テスト
"""

import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
import json
from unittest.mock import patch, MagicMock

from src.api.server import create_app
from src.api.schemas import TradeRequest, TradeResponse


class TestAPIIntegration:
    """API統合テストクラス"""

    def setup_method(self):
        """テスト前準備"""
        self.app = create_app()
        self.client = TestClient(self.app)

    def test_health_endpoint(self):
        """ヘルスチェックエンドポイントテスト"""
        response = self.client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data

    def test_root_endpoint(self):
        """ルートエンドポイントテスト"""
        response = self.client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "docs" in data

    @patch("src.services.trading_service.TradingService.get_stock_price")
    @patch("src.api.dependencies.get_paper_trader")
    @patch("src.api.dependencies.get_portfolio_manager")
    def test_trade_endpoint_success(self, mock_pm, mock_pt, mock_get_price):
        """取引エンドポイント成功ケーステスト"""
        # モック設定
        mock_get_price.return_value = 150.0
        mock_pt.return_value.execute_trade.return_value = True
        mock_pm.return_value.lock = MagicMock()
        mock_pm.return_value.lock.__aenter__ = MagicMock()
        mock_pm.return_value.lock.__aexit__ = MagicMock()

        trade_request = {
            "ticker": "AAPL",
            "action": "buy",
            "quantity": 10,
            "price": None,
            "strategy": "test",
        }

        response = self.client.post("/api/v1/trade", json=trade_request)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "Trade executed" in data["message"]

    def test_trade_endpoint_validation_error(self):
        """取引エンドポイントバリデーションエラーテスト"""
        trade_request = {
            "ticker": "",  # 無効なティッカー
            "action": "buy",
            "quantity": -10,  # 無効な数量
            "price": -100,  # 無効な価格
        }

        response = self.client.post("/api/v1/trade", json=trade_request)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_cors_headers(self):
        """CORSヘッダーテスト"""
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers

    def test_invalid_cors_origin(self):
        """無効なCORSオリジンテスト"""
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://malicious-site.com",
                "Access-Control-Request-Method": "GET",
            },
        )

        # 許可されていないオリジンからのリクエストは拒否されるはず
        assert (
            response.status_code != 200
            or response.headers.get("access-control-allow-origin")
            != "http://malicious-site.com"
        )


class TestErrorHandling:
    """エラーハンドリングテスト"""

    def setup_method(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    @patch("src.services.trading_service.TradingService.execute_trade_with_validation")
    def test_internal_error_handling(self, mock_trade):
        """内部エラーの適切なハンドリングテスト"""
        # サービス層で例外が発生
        mock_trade.side_effect = Exception("Database connection failed")

        trade_request = {"ticker": "AAPL", "action": "buy", "quantity": 10}

        response = self.client.post("/api/v1/trade", json=trade_request)

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        # 詳細なエラーメッセージが漏洩していないことを確認
        assert "Database connection failed" not in data["error"]
        assert "Internal server error" in data["error"]


class TestPortfolioEndpoints:
    """ポートフォリオ関連エンドポイントテスト"""

    def setup_method(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    @patch("src.api.routers.portfolio.get_portfolio_manager")
    def test_portfolio_endpoint(self, mock_pfm):
        """ポートフォリオエンドポイントテスト"""
        mock_pfm.return_value.get_portfolio_summary.return_value = {
            "total_value": 10000.0,
            "cash": 5000.0,
            "positions": [],
        }

        response = self.client.get("/api/v1/portfolio")

        assert response.status_code == 200
        data = response.json()
        assert "total_value" in data
        assert "cash" in data


if __name__ == "__main__":
    pytest.main([__file__])
