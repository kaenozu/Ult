"""
Turbo-Evolution Engine
Implements a PARALLELIZED genetic evolution loop for trading strategies.
Can be run as a cron job or scheduled task.
"""

import logging
import random
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, as_completed
import pandas as pd
from typing import List, Dict, Any

from src.config import settings
from src.data_loader import fetch_stock_data

logger = logging.getLogger("EvolutionEngine")

# --- Standalone Definitions for Multiprocessing Pickling ---


class Gene:
    """Represents a tunable parameter in a strategy."""

    def __init__(self, name: str, value: Any, min_val: float, max_val: float, is_int: bool = False):
        self.name = name
        self.value = value
        self.min_val = min_val
        self.max_val = max_val
        self.is_int = is_int

    def mutate(self, mutation_rate: float = 0.1, mutation_scale: float = 0.2):
        """Mutate the gene value."""
        if random.random() < mutation_rate:
            change = (self.max_val - self.min_val) * mutation_scale * random.uniform(-1, 1)
            self.value += change
            # Clip
            self.value = max(self.min_val, min(self.max_val, self.value))
            if self.is_int:
                self.value = int(round(self.value))

    # Enable deepcopy for pickling if needed explicit
    def __repr__(self):
        return f"Gene({self.name}={self.value})"


class Genome:
    """A collection of genes representing a strategy configuration."""

    def __init__(self, strategy_name: str, genes: List[Gene]):
        self.strategy_name = strategy_name
        self.genes = genes
        self.fitness = 0.0

    def to_config(self) -> Dict[str, Any]:
        return {g.name: g.value for g in self.genes}


def evaluate_fitness_static(genome_config: Dict[str, Any], data_list: List[pd.DataFrame]) -> float:
    """
    Static/Standalone function to evaluate fitness.
    Must be standalone to be pickled for ProcessPoolExecutor.

    Args:
        genome_config: Dict of parameters.
        data_list: List of DataFrames (passed as list for easier pickling than large dicts sometimes, or just iterating)
    """
    total_pnl = 0.0

    # Simulation Logic (Same as before, simplified for speed/demo)
    # Using Generic "RSI + MA" logic
    for df in data_list:
        if df.empty:
            continue

        try:
            # Need minimal columns
            close = df["Close"]

            # Recalculate indicators based on gene params
            # Note: This is computationally expensive, hence why parallelization helps.
            rsi_period = int(genome_config.get("rsi_period", 14))
            ma_short_p = int(genome_config.get("ma_short", 20))
            ma_long_p = int(genome_config.get("ma_long", 50))

            # RSI
            delta = close.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))

            # MAs
            ma_s = close.rolling(window=ma_short_p).mean()
            ma_l = close.rolling(window=ma_long_p).mean()

            # Vectorized Backtest (Approximate)
            # Signal: 1 if RSI < Oversold & MAs > MAl, -1 if RSI > Overbought
            oversold = genome_config.get("rsi_oversold", 30)
            overbought = genome_config.get("rsi_overbought", 70)

            signals = pd.Series(0, index=df.index)
            signals[(rsi < oversold) & (ma_s > ma_l)] = 1
            signals[rsi > overbought] = -1

            # Shift signals to represent trade execution "next day"
            positions = signals.shift(1).fillna(0)

            # Simple returns
            pct_change = close.pct_change().fillna(0)
            strategy_returns = positions * pct_change

            total_pnl += strategy_returns.sum()

        except Exception:
            # logger won't work well in process
            pass

    return total_pnl


# --- Main Engine ---


class EvolutionEngine:
    def __init__(self, population_size: int = 20):
        self.population_size = population_size
        self.generation = 0
        self.population: List[Genome] = []
        # Determine optimal workers (Leave 1 core free)
        self.max_workers = max(1, multiprocessing.cpu_count() - 1)

    def initialize_population(self):
        """Create initial random population."""
        for _ in range(self.population_size):
            genes = [
                Gene("rsi_period", random.randint(5, 30), 5, 30, True),
                Gene("rsi_oversold", random.uniform(20, 40), 10, 50, False),
                Gene("rsi_overbought", random.uniform(60, 80), 50, 90, False),
                Gene("ma_short", random.randint(5, 50), 5, 100, True),
                Gene("ma_long", random.randint(20, 200), 20, 300, True),
                Gene("stop_loss_pct", random.uniform(0.01, 0.10), 0.01, 0.20, False),
            ]
            self.population.append(Genome("AdaptiveHybrid", genes))

    def evolve(self, data_map: Dict[str, pd.DataFrame]):
        """Run one generation of evolution using PARALLEL PROCESSING."""

        # Prepare data for pickling (convert dict to list of DFs to avoid key overhead if not needed)
        data_list = list(data_map.values())

        # 1. Evaluate Fitness in Parallel
        logger.info(f"🧬 Evolving Gen {self.generation} with {self.max_workers} cores...")

        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit tasks
            future_to_genome = {
                executor.submit(evaluate_fitness_static, genome.to_config(), data_list): genome
                for genome in self.population
            }

            # Collect results
            for future in as_completed(future_to_genome):
                genome = future_to_genome[future]
                try:
                    fitness = future.result()
                    genome.fitness = fitness
                except Exception as e:
                    logger.error(f"Genome eval failed: {e}")
                    genome.fitness = -999.0

        # 2. Sort by fitness
        self.population.sort(key=lambda x: x.fitness, reverse=True)

        best = self.population[0]
        logger.info(f"🏆 Gen {self.generation} Best Fitness: {best.fitness:.4f}")
        logger.debug(f"Params: {best.to_config()}")

        # 3. Selection (Elitism)
        retain_count = max(2, int(self.population_size * settings.system.elite_retention_pct))
        new_pop = self.population[:retain_count]

        # 4. Crossover & Mutation
        while len(new_pop) < self.population_size:
            # Tournament selection
            parent_a = random.choice(self.population[:retain_count])
            parent_b = random.choice(self.population[:retain_count])

            child_genes = []
            for ga, gb in zip(parent_a.genes, parent_b.genes):
                # Crossover
                val = ga.value if random.random() > 0.5 else gb.value
                gene = Gene(ga.name, val, ga.min_val, ga.max_val, ga.is_int)
                # Mutation
                gene.mutate()
                child_genes.append(gene)

            new_pop.append(Genome(parent_a.strategy_name, child_genes))

        self.population = new_pop
        self.generation += 1

    def run_evolution_cycle(self, tickers: List[str], generations: int = 5):
        """Main entry point."""
        logger.info("🚀 Starting Turbo-Evolution Cycle...")

        # Fetch data
        data_map = fetch_stock_data(tickers, period="6mo")

        if not self.population:
            self.initialize_population()

        for i in range(generations):
            self.evolve(data_map)

        best = self.population[0]
        self.save_best_genome(best)
        logger.info("✅ Turbo-Evolution Cycle Complete.")

    def save_best_genome(self, genome: Genome):
        import json

        out_path = settings.system.data_dir / "best_strategy_params.json"
        with open(out_path, "w") as f:
            json.dump(genome.to_config(), f, indent=4)
        logger.info(f"💾 Saved best params to {out_path}")


if __name__ == "__main__":
    # Ensure this block is guarded for multiprocessing on Windows
    logging.basicConfig(level=logging.INFO)

    # Test run
    engine = EvolutionEngine(population_size=20)
    engine.run_evolution_cycle(settings.tickers_jp, generations=5)
