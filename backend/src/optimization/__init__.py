from .multi_model_optimizer import MultiModelOptimizer
from .hyperparameter_tuner import HyperparameterOptimizer
from .optuna_tuner import OptunaTuner

# Import from meta_optimizers module
try:
    from .meta_optimizers import (
        optimize_multi_objective,
        optimize_strategy_wfo,
    )

    # Forward declarations for missing ones to avoid breakage if referenced elsewhere
    optimize_with_constraints = None
    sensitivity_analysis = None
    OptimizerConfig = None
except ImportError as e:
    import logging

    logging.warning(f"Could not import from .legacy_functions: {e}")
    optimize_multi_objective = None
    optimize_strategy_wfo = None
    optimize_with_constraints = None
    sensitivity_analysis = None
    OptimizerConfig = None

__all__ = [
    "MultiModelOptimizer",
    "HyperparameterOptimizer",
    "OptunaTuner",
    "optimize_multi_objective",
    "optimize_strategy_wfo",
    "optimize_with_constraints",
    "sensitivity_analysis",
    "OptimizerConfig",
]
