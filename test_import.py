
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path.cwd() / "backend"))

try:
    print("Attempting to import Strategy...")
    from src.strategies.base import Strategy
    print("✅ Strategy imported.")

    print("Attempting to import RangeStrategy...")
    from src.strategies.range_strategy import RangeStrategy
    print("✅ RangeStrategy imported.")

    print("Attempting to import EnsembleStrategy...")
    from src.strategies.ensemble_strategy import EnsembleStrategy
    print("✅ EnsembleStrategy imported.")
    
    print("Attempting to import GeneticOptimizer...")
    from src.optimization.genetic_optimizer import GeneticOptimizer
    print("✅ GeneticOptimizer imported.")

    print("Checking instantiation...")
    s = EnsembleStrategy()
    print(f"✅ Instantiated {s.name}")

except ImportError as e:
    print(f"❌ ImportError: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
