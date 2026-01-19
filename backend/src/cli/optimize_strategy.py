import argparse
import sys
import os
import logging
import json

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from src.data_loader import fetch_stock_data
from src.optimization.genetic_optimizer import GeneticOptimizer
from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy

# Quick mapping using nickname
STRATEGY_MAP = {
    "Guerilla": RangeStrategy,
    "StormChaser": VolatilityStrategy
}

def main():
    parser = argparse.ArgumentParser(description="AGStock Genetic Optimizer (The Blacksmith)")
    parser.add_argument("--ticker", type=str, required=True, help="Ticker symbol (e.g. 7203.T)")
    parser.add_argument("--strategy", type=str, required=True, choices=["Guerilla", "StormChaser"], help="Strategy nickname")
    parser.add_argument("--generations", type=int, default=10, help="Number of generations")
    parser.add_argument("--pop_size", type=int, default=20, help="Population size")
    
    args = parser.parse_args()
    
    # 1. Fetch Data
    print(f"Fetching data for {args.ticker}...")
    data_map = fetch_stock_data([args.ticker], period="2y") # Use 2 years for training
    df = data_map.get(args.ticker)
    
    if df is None or df.empty:
        print("Error: No data found.")
        sys.exit(1)
        
    # 2. Initialize Optimizer
    strategy_cls = STRATEGY_MAP[args.strategy]
    optimizer = GeneticOptimizer(
        strategy_class=strategy_cls,
        data=df,
        population_size=args.pop_size,
        generations=args.generations
    )
    
    # 3. Run Optimization
    print(f"Starting Evolution based on 2-year backtest...")
    best_genome = optimizer.optimize()
    
    # 4. Output Result
    print("\n" + "="*50)
    print(f"🏆 Optimization Complete for {args.strategy}")
    print("="*50)
    print(f"Best Fitness: {best_genome.fitness:.4f}")
    print("Optimal Parameters:")
    print(json.dumps(best_genome.params, indent=2))
    print("="*50)
    
    # Save to file (in a real system)
    # save_params(args.ticker, args.strategy, best_genome.params)

if __name__ == "__main__":
    main()
