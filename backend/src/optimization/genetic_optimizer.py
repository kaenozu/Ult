import random
import logging
from typing import Dict, Any, List, Type
import pandas as pd
import numpy as np
from dataclasses import dataclass

from src.strategies.base import Strategy
from src.strategies.range_strategy import RangeStrategy
from src.strategies.volatility_strategy import VolatilityStrategy

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Genome:
    params: Dict[str, Any]
    fitness: float = -999.0

class GeneticOptimizer:
    """
    The Blacksmith: Evolves Strategy Parameters using Genetic Algorithm.
    """
    def __init__(self, strategy_class: Type[Strategy], data: pd.DataFrame, 
                 population_size: int = 20, generations: int = 10,
                 mutation_rate: float = 0.1):
        self.strategy_class = strategy_class
        self.data = data
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        
        # Define parameter ranges based on strategy type
        self.param_grid = self._get_param_grid(strategy_class)

    def _get_param_grid(self, strategy_class) -> Dict[str, Any]:
        """Define search space for each strategy."""
        if strategy_class == RangeStrategy:
            return {
                "bb_window": [10, 20, 30, 40, 50],
                "bb_std": [1.5, 2.0, 2.5, 3.0],
                "rsi_window": [7, 14, 21, 28]
            }
        elif strategy_class == VolatilityStrategy:
            return {
                "atr_window": [7, 10, 14, 20],
                "k": [1.0, 1.5, 2.0, 2.5, 3.0]
            }
        else:
            return {}

    def _create_random_genome(self) -> Genome:
        params = {}
        for key, values in self.param_grid.items():
            params[key] = random.choice(values)
        return Genome(params=params)

    def _evaluate_fitness(self, genome: Genome) -> float:
        """Run backtest and return Sharpe Ratio * Return as fitness."""
        # Initialize strategy with genome params
        strategy = self.strategy_class(params=genome.params)
        
        try:
            signals = strategy.generate_signals(self.data)
            
            # Simple Vectorized Backtest
            # Shift signals to represent next day execution
            positions = signals.shift(1).fillna(0)
            
            # Calculate daily returns
            close_prices = self.data["Close"]
            daily_pct_change = close_prices.pct_change().fillna(0)
            
            strategy_returns = positions * daily_pct_change
            
            total_return = strategy_returns.sum()
            std_dev = strategy_returns.std()
            
            sharpe = 0.0
            if std_dev > 0:
                sharpe = strategy_returns.mean() / std_dev * np.sqrt(252)
                
            # Composite Fitness: Sharpe (Risk-Adjusted) + Total Return (Profit)
            # Use Sharpe primarily, but penalize negative returns heavily
            fitness = sharpe * 10
            
            if total_return < 0:
                fitness -= 100 # Heavy penalty for losing money
                
            return float(fitness)
            
        except Exception as e:
            logger.error(f"Backtest failed: {e}")
            return -999.0

    def _crossover(self, parent1: Genome, parent2: Genome) -> Genome:
        """Uniform Crossover"""
        child_params = {}
        for key in self.param_grid.keys():
            if random.random() > 0.5:
                child_params[key] = parent1.params[key]
            else:
                child_params[key] = parent2.params[key]
        return Genome(params=child_params)

    def _mutate(self, genome: Genome) -> Genome:
        """Random Mutation"""
        mutated_params = genome.params.copy()
        for key, values in self.param_grid.items():
            if random.random() < self.mutation_rate:
                mutated_params[key] = random.choice(values)
        return Genome(params=mutated_params)

    def optimize(self) -> Genome:
        """Main optimization loop."""
        logger.info(f"Starting Evolution using {self.strategy_class.__name__}...")
        
        # 1. Initialize Population
        population = [self._create_random_genome() for _ in range(self.population_size)]
        
        for generation in range(self.generations):
            # 2. Evaluate Fitness
            for genome in population:
                if genome.fitness == -999.0:
                    genome.fitness = self._evaluate_fitness(genome)
            
            # Sort by fitness (descending)
            population.sort(key=lambda x: x.fitness, reverse=True)
            
            best_genome = population[0]
            logger.info(f"Generation {generation+1}/{self.generations} - Best Fitness: {best_genome.fitness:.4f} - Params: {best_genome.params}")
            
            # Elitism: Keep top 20%, but at least 1
            elite_count = max(1, int(self.population_size * 0.2))
            next_population = population[:elite_count]
            
            # 3. Breeding
            while len(next_population) < self.population_size:
                # Select parents from top performers (tournament selection-ish)
                pool_size = min(len(population), max(2, elite_count * 2))
                pool = population[:pool_size]
                
                parent1 = random.choice(pool) 
                parent2 = random.choice(pool)
                
                child = self._crossover(parent1, parent2)
                child = self._mutate(child)
                next_population.append(child)
                
            population = next_population
            
        logger.info("Evolution Complete.")
        return population[0]
