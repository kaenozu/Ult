from typing import Optional
import logging
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.auth import AuthManager, User

logger = logging.getLogger(__name__)

# Global instances
_paper_trader = None
_auto_trader = None
_auth_manager = None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_auth_manager():
    """AuthManagerの依存性注入 (Singleton)"""
    global _auth_manager
    if _auth_manager is None:
        secret_key = os.environ.get("SECRET_KEY", "your-super-secret-key")
        _auth_manager = AuthManager(secret_key=secret_key, db_path="users.db")
    return _auth_manager


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_manager: AuthManager = Depends(get_auth_manager),
):
    """現在の認証済みユーザーを取得"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = auth_manager.verify_token(token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("user_id")
    if user_id is None:
        raise credentials_exception
    user = auth_manager.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


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
    from src.data_temp.data_loader import DataLoader
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
