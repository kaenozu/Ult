# Portfolio module - some components may be unavailable
try:
    from .correlation_engine import CorrelationEngine
except (ImportError, SyntaxError, NameError):
    CorrelationEngine = None

try:
    from .legacy import PortfolioManager
except (ImportError, SyntaxError, NameError):
    PortfolioManager = None

__all__ = ["CorrelationEngine", "PortfolioManager"]
