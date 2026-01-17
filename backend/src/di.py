"""
Dependency Injection Container for Living Nexus & Strategy Shifter

This module provides centralized dependency management for the application,
improving testability, maintainability, and decoupling of components.
"""

from dependency_injector import containers, providers
from dependency_injector.providers import Configuration

from src.core.config import settings
from src.regime_detector import RegimeDetector
from src.api.routers.websocket import broadcast_regime_update, update_regime_with_data


class Container(containers.DeclarativeContainer):
    """
    Main dependency injection container.

    This container manages all application dependencies and provides
    a single source of truth for object creation and configuration.
    """

    # Configuration provider
    config = providers.Object(settings)

    # Core business logic providers
    regime_detector = providers.Singleton(
        RegimeDetector,
        # Add any configuration if needed
    )

    # WebSocket management
    websocket_broadcaster = providers.Callable(broadcast_regime_update)

    websocket_updater = providers.Callable(update_regime_with_data)

    # Service providers (to be expanded)
    # data_service = providers.Singleton(DataService, config=config)
    # trading_service = providers.Singleton(TradingService, config=config)
    # notification_service = providers.Singleton(NotificationService, config=config)

    # Repository providers (for future database integration)
    # portfolio_repository = providers.Singleton(PortfolioRepository, config=config)
    # trade_repository = providers.Singleton(TradeRepository, config=config)

    # External service providers
    # yahoo_finance_client = providers.Singleton(YahooFinanceClient, config=config)
    # redis_client = providers.Singleton(RedisClient, config=config)


# Global container instance
container = Container()


# Utility functions for easy access
def get_regime_detector():
    """Get regime detector instance."""
    return container.regime_detector()


def get_websocket_broadcaster():
    """Get WebSocket broadcaster function."""
    return container.websocket_broadcaster()


def get_websocket_updater():
    """Get WebSocket updater function."""
    return container.websocket_updater()


def get_config():
    """Get application configuration."""
    return container.config()


# Override configuration for testing
def override_config(new_config):
    """Override configuration for testing purposes."""
    container.config.override(new_config)


def reset_overrides():
    """Reset configuration overrides."""
    container.config.reset_override()


__all__ = [
    "Container",
    "container",
    "get_regime_detector",
    "get_websocket_broadcaster",
    "get_websocket_updater",
    "get_config",
    "override_config",
    "reset_overrides",
]
