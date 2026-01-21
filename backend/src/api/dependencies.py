from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Global instances
_paper_trader = None
_auto_trader = None

def get_paper_trader():
    """PaperTraderの依存性注入 (Singleton)"""
    global _paper_trader
    if _paper_trader is None:
        from src.paper_trader import PaperTrader
        _paper_trader = PaperTrader()
    return _paper_trader

def get_auto_trader():
    """AutoTraderの依存性注入"""
    global _auto_trader
    if _auto_trader is None:
        from src.auto_trader import AutoTrader
        # Use the singleton paper trader to share DB connection
        pt = get_paper_trader()
        _auto_trader = AutoTrader(pt)
    return _auto_trader

def get_data_loader():
    """DataLoaderの依存性注入"""
    from src.data.data_loader import DataLoader
    return DataLoader()

# Function to reset/clear globals (useful for reset functionality)
def reset_globals():
    global _paper_trader, _auto_trader
    if _auto_trader:
        try:
            _auto_trader.stop()
        except Exception as e:
            logger.error(f"Error stopping auto trader: {e}")
        _auto_trader = None
    
    if _paper_trader:
        try:
            _paper_trader.close()
        except Exception as e:
            logger.error(f"Error closing paper trader: {e}")
        _paper_trader = None

def set_paper_trader(pt):
    global _paper_trader
    _paper_trader = pt

def get_portfolio_manager():
    """PortfolioManagerの依存性注入"""
    from src.portfolio_manager import portfolio_manager
    return portfolio_manager
