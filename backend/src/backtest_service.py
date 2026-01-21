from src.backtesting.engine import BacktestEngine
from src.strategies import LightGBMStrategy, RSIStrategy
from src.data.data_loader import fetch_stock_data
from typing import Dict, Any, Optional

def execute_backtest(ticker: str, strategy_name: str, period: str, initial_capital: float) -> Optional[Dict[str, Any]]:
    # Strategy selection
    strategy_map = {
        "LightGBM": LightGBMStrategy,
        "RSI": RSIStrategy,
    }
    strategy_cls = strategy_map.get(strategy_name, LightGBMStrategy)
    
    # Data fetching
    data_map = fetch_stock_data([ticker], period=period)
    df = data_map.get(ticker)
    
    if df is None or df.empty:
        return None
        
    # Execution
    engine = BacktestEngine(initial_capital=initial_capital)
    result = engine.run(df, strategy_cls())
    
    return result
