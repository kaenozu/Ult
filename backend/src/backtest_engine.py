import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from src.data_loader import fetch_stock_data
from src.backtesting.engine import BacktestEngine as CoreEngine

class HistoricalBacktester:
    def __init__(self, initial_capital=1000000):
        self.initial_capital = initial_capital

    def compare_strategies(self, ticker, strategies_with_params, years=3):
        """
        Compare multiple strategies on a single ticker.
        strategies_with_params: List of (StrategyClass, params_dict)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365)
        
        # Fetch data
        data_map = fetch_stock_data([ticker], start=start_date.strftime("%Y-%m-%d"), end=end_date.strftime("%Y-%m-%d"))
        df = data_map.get(ticker)
        
        if df is None or df.empty:
            return pd.DataFrame(), pd.DataFrame()

        metrics_results = []
        equity_curves = {}

        for strat_class, params in strategies_with_params:
            try:
                # Instantiate strategy
                strategy = strat_class(**params)
                strat_name = strat_class.__name__
                
                # Run backtest using CoreEngine
                engine = CoreEngine(initial_capital=self.initial_capital)
                result = engine.run(df, strategy)
                
                if result:
                    metrics_results.append({
                        "Strategy": strat_name,
                        "Total Return": result["total_return"],
                        "CAGR": (1 + result["total_return"])**(1/years) - 1 if years > 0 else 0,
                        "Max Drawdown": result["max_drawdown"],
                        "Sharpe Ratio": result["sharpe_ratio"],
                        "Win Rate": result["win_rate"],
                        "Trades": result["total_trades"]
                    })
                    equity_curves[strat_name] = result["equity_curve"]
            except Exception as e:
                print(f"Error backtesting {strat_class.__name__}: {e}")

        metrics_df = pd.DataFrame(metrics_results)
        equity_df = pd.DataFrame(equity_curves)
        
        return metrics_df, equity_df
