import argparse
import sys
import logging
from typing import Type
import pandas as pd

# Add backend root to path
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[3]))

from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy
from src.optimization.genetic_optimizer import GeneticOptimizer
from src.core.data_provider import DataProvider
from src.database_manager import db_manager

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("OptimizerCLI")

def get_strategy_class(name: str) -> Type:
    if name.lower() == "range":
        return RangeStrategy
    elif name.lower() == "volatility":
        return VolatilityStrategy
    else:
        raise ValueError(f"Unknown strategy: {name}")

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
        
        # Save results to DB (using generic optimization_results table if exists, or just log)
        # Ideally we update the strategy config in DB.
        # For now, just logging is fine for Phase 13.5 verification.
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")

if __name__ == "__main__":
    main()
