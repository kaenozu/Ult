import random
import logging
from typing import Dict, Any, List, Type, Tuple
import pandas as pd
import numpy as np
from dataclasses import dataclass
from copy import deepcopy

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
    test_fitness: float = -999.0 # Result on validation set

class GeneticOptimizer:
    """
    The Blacksmith: Evolves Strategy Parameters using Genetic Algorithm.
    Supports Walk-Forward Validation to prevent overfitting.
    """
    def __init__(self, strategy_class: Type[Strategy], data: pd.DataFrame, 
                 population_size: int = 20, generations: int = 10,
                 mutation_rate: float = 0.1,
                 validation_split: float = 0.3):
        self.strategy_class = strategy_class
        self.data = data
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.validation_split = validation_split
        
        # Split Data for WFO (Walk-Forward Optimization)
        split_idx = int(len(data) * (1 - validation_split))
        self.train_data = data.iloc[:split_idx].copy()
        self.test_data = data.iloc[split_idx:].copy()
        
        # Define parameter ranges based on strategy type
        self.param_grid = self._get_param_grid(strategy_class)

    def _get_param_grid(self, strategy_class) -> Dict[str, Any]:
        """Define search space for each strategy."""
        if strategy_class == RangeStrategy:
            return {
                "bb_window": [10, 15, 20, 25, 30, 40, 50],
                "bb_std": [1.5, 1.8, 2.0, 2.2, 2.5, 3.0],
                "rsi_window": [7, 9, 14, 21, 28]
            }
        elif strategy_class == VolatilityStrategy:
            return {
                "atr_window": [7, 10, 14, 20],
                "k": [1.0, 1.5, 1.8, 2.0, 2.2, 2.5, 3.0],
                "stop_loss_atr": [1.0, 1.5, 2.0, 3.0] # Trailing stop multiplier
            }
        else:
            # Fallback or generic params
            return {
                "trend_period": [20, 50, 100, 200]
            }

    def _create_random_genome(self) -> Genome:
        params = {}
        for key, values in self.param_grid.items():
            params[key] = random.choice(values)
        return Genome(params=params)

    def _run_backtest(self, strategy: Strategy, data: pd.DataFrame) -> float:
        """Calculate fitness Metric (Sortino Ratio * Returns)"""
        try:
            signals = strategy.generate_signals(data)
            
            # Simple Vectorized Backtest
            positions = signals.shift(1).fillna(0)
            close_prices = data["Close"]
            daily_pct_change = close_prices.pct_change().fillna(0)
            strategy_returns = positions * daily_pct_change
            
            total_return = strategy_returns.sum()
            
            # Sortino Ratio (Downside Risk only)
            negative_returns = strategy_returns[strategy_returns < 0]
            downside_std = negative_returns.std()
            
            sortino = 0.0
            if downside_std > 0:
                sortino = strategy_returns.mean() / downside_std * np.sqrt(252)
            elif strategy_returns.mean() > 0:
                sortino = 10.0 # Excellent (no downside)
                
            # Composite Fitness
            # Primary: Risk Adjusted Return (Sortino)
            # Secondary: Raw Profit (Total Return) to encourage actual growth
            fitness = (sortino * 2) + (total_return * 10)
            
            # Penalty for huge drawdowns or inactivity
            if total_return < -0.1: # -10% loss
                fitness -= 100
            
            if (positions != 0).sum() < 5: # Inactive penalty
                fitness -= 50
                
            return float(fitness)
            
        except Exception as e:
            # logger.error(f"Backtest failed: {e}") 
            return -999.0

    def _evaluate_genome(self, genome: Genome, data: pd.DataFrame) -> float:
        strategy = self.strategy_class(name="Gen", params=genome.params)
        return self._run_backtest(strategy, data)

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

    def _tournament_selection(self, population: List[Genome], k: int = 3) -> Genome:
        """Select best from k random individuals."""
        tournament = random.sample(population, k)
        return max(tournament, key=lambda g: g.fitness)

    def optimize(self) -> Tuple[Genome, pd.DataFrame]:
        """
        Main optimization loop.
        Returns (Best Genome, Evolution History DataFrame)
        """
        logger.info(f"🧬 Starting Evolution for {self.strategy_class.__name__}...")
        logger.info(f"   Train Size: {len(self.train_data)} | Test Size: {len(self.test_data)}")
        
        # 1. Initialize Population
        population = [self._create_random_genome() for _ in range(self.population_size)]
        
        history = []

        for generation in range(self.generations):
            # 2. Evaluate Fitness (Training Data)
            for genome in population:
                if genome.fitness == -999.0:
                    genome.fitness = self._evaluate_genome(genome, self.train_data)
            
            # Sort by fitness
            population.sort(key=lambda x: x.fitness, reverse=True)
            
            best_genome = population[0]
            avg_fitness = sum(g.fitness for g in population) / len(population)
            
            logger.info(f"Gen {generation+1}: Best Fitness {best_genome.fitness:.2f} | Avg {avg_fitness:.2f}")
            logger.info(f"   Best Params: {best_genome.params}")
            
            history.append({
                "generation": generation + 1,
                "best_fitness": best_genome.fitness,
                "avg_fitness": avg_fitness,
                "best_params": str(best_genome.params)
            })

            # Elitism
            elite_count = max(1, int(self.population_size * 0.1)) # Top 10%
            next_population = deepcopy(population[:elite_count])
            
            # 3. Breeding
            while len(next_population) < self.population_size:
                parent1 = self._tournament_selection(population)
                parent2 = self._tournament_selection(population)
                
                child = self._crossover(parent1, parent2)
                child = self._mutate(child)
                next_population.append(child)
                
            population = next_population
            
        # 4. Final Validation (Walk-Forward)
        # Verify the best genome on UNSEEN test data
        final_best = population[0] # Note: this is best from last gen (sorted before breeding loop end? No, loop updates pop at end)
        # Actually in last loop we mutated them, so we need to re-eval?
        # Standard GA: Evaluate -> Select -> Breed -> New Pop
        # So 'population' at end of loop is un-evaluated children.
        # We should evaluate them one last time to find true best?
        # Or just track global best?
        
        # Let's clean up: Evaluate final population
        for genome in population:
             genome.fitness = self._evaluate_genome(genome, self.train_data)
        population.sort(key=lambda x: x.fitness, reverse=True)
        final_best = population[0]
        
        logger.info("⚔️  Running Walk-Forward Validation (Test Data)...")
        test_fitness = self._evaluate_genome(final_best, self.test_data)
        final_best.test_fitness = test_fitness
        
        logger.info(f"✅ Optimization Complete.")
        logger.info(f"   Train Fitness: {final_best.fitness:.2f}")
        logger.info(f"   Test Fitness:  {test_fitness:.2f}")
        
        if test_fitness < 0:
            logger.warning("⚠️  Warning: Strategy failed on Test Data (Overfitting detected).")
        
        return final_best, pd.DataFrame(history)
