
import sys
import os
import pandas as pd
import numpy as np
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from src.optimization.genetic_optimizer import GeneticOptimizer
from src.strategies.range_strategy import RangeStrategy

def create_mock_data():
    """Create a sine wave pattern for Range Strategy testing"""
    dates = pd.date_range(start="2023-01-01", periods=200)
    prices = 100 + 10 * np.sin(np.linspace(0, 4*np.pi, 200)) # Sine wave
    
    df = pd.DataFrame({
        "Open": prices,
        "High": prices + 1,
        "Low": prices - 1,
        "Close": prices,
        "Volume": 1000
    }, index=dates)
    return df

def test_optimization():
    print("🧪 Generatic Optimizer Mock Test...")
    
    data = create_mock_data()
    
    optimizer = GeneticOptimizer(
        strategy_class=RangeStrategy,
        data=data,
        population_size=10,
        generations=3
    )
    
    best, history = optimizer.optimize()
    
    print(f"Best Params: {best.params}")
    print(f"Train Fitness: {best.fitness}")
    print(f"Test Fitness: {best.test_fitness}")
    
    assert best.fitness > -900, "Fitness should be reasonable"
    print("✅ Test Passed!")

if __name__ == "__main__":
    test_optimization()
