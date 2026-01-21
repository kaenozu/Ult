import argparse
import sys
import logging
from typing import Type
import pandas as pd

# Add backend root to path
from pathlib import Path
# Current file: .../backend/src/cli/optimize_strategy.py
# parents[0] = cli
# parents[1] = src
# parents[2] = backend
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy
from src.strategies.ensemble_strategy import EnsembleStrategy
from src.optimization.genetic_optimizer import GeneticOptimizer
# from src.core.data_provider import DataProvider
# Fallback to data_loader directly as DataProvider seems missing
from src.data_temp.data_loader import fetch_stock_data

class DataProviderAdapter:
    @staticmethod
    def get_historical_data(ticker, period="1y"):
        # Wrap fetch_stock_data to return DataFrame directly
        res = fetch_stock_data([ticker], period=period)
        return res.get(ticker)

DataProvider = DataProviderAdapter
from src.database_manager import db_manager

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("OptimizerCLI")

def get_strategy_class(name: str) -> Type:
    logger.info(f"Looking for strategy class: {name}")
    try:
        if name.lower() == "range":
            return RangeStrategy
        elif name.lower() == "volatility":
            return VolatilityStrategy
        elif name.lower() == "ensemble":
            # Use importlib to bypass strange NameError/Scope issues
            import importlib
            module = importlib.import_module("src.strategies.ensemble_strategy")
            return getattr(module, "EnsembleStrategy")
        else:
            raise ValueError(f"Unknown strategy: {name}")
    except Exception as e:
        logger.error(f"Error in get_strategy_class: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description="AGStock Genetic Optimizer CLI")
    parser.add_argument("ticker", type=str, help="Stock ticker (e.g. 7203.T)")
    parser.add_argument("strategy", type=str, help="Strategy type (range, volatility)")
    parser.add_argument("--gens", type=int, default=10, help="Number of generations")
    parser.add_argument("--pop", type=int, default=20, help="Population size")
    
    args = parser.parse_args()
    
    logger.info(f"🚀 Starting Optimization for {args.ticker} using {args.strategy.upper()} strategy...")
    
    try:
        # Load Data
        df = DataProvider.get_historical_data(args.ticker, period="1y")
        if df is None or df.empty:
            logger.error("No data found.")
            return

        strategy_class = get_strategy_class(args.strategy)
        
        # Initialize Optimizer
        optimizer = GeneticOptimizer(
            strategy_class=strategy_class,
            data=df,
            population_size=args.pop,
            generations=args.gens
        )
        
        # Run Evolution
        best_genome, history = optimizer.optimize()
        
        logger.info("\n" + "="*50)
        logger.info(f"🏆 Best Genome Found for {args.ticker}")
        logger.info("="*50)
        logger.info(f"Params: {best_genome.params}")
        logger.info(f"Train Fitness: {best_genome.fitness:.2f}")
        logger.info(f"Test Fitness:  {best_genome.test_fitness:.2f}")
        logger.info("="*50)
        
        # Save results to DB
        config_key = f"strategy_params:{args.strategy}:{args.ticker}"
        config_value = {
            "params": best_genome.params,
            "fitness": best_genome.fitness,
            "test_fitness": best_genome.test_fitness,
            "updated_at": pd.Timestamp.now().isoformat()
        }
        
        try:
            db_manager.save_config(key=config_key, value=config_value, category="strategy_params")
            logger.info(f"💾 Successfully saved optimal parameters to DB: {config_key}")
        except Exception as db_err:
            logger.error(f"Failed to save to DB: {db_err}")
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")

if __name__ == "__main__":
    main()
