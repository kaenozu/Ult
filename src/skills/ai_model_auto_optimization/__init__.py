"""
AI Model Auto-Optimization Agent Package

A sophisticated AI-powered agent for automated machine learning model optimization
integrated with the trading platform's ML/Ops infrastructure.

Core Components:
- OptimizationAgent: Main orchestration class
- ModelAnalyzer: Performance analysis and drift detection
- HyperparameterOptimizer: Advanced hyperparameter tuning
- AutoRetrainer: Automated retraining pipelines
- EnsembleCreator: Dynamic ensemble creation and optimization

Usage:
    from src.skills.ai_model_auto_optimization import create_optimization_agent

    agent = await create_optimization_agent()
    result = await agent.optimize_model('trading_model_v1')
"""

# Try to import full implementation, fallback to simple version
try:
    from .agent import (
        OptimizationAgent,
        ModelAnalyzer,
        HyperparameterOptimizer,
        AutoRetrainer,
        EnsembleCreator,
        OptimizationConfig,
        ModelMetrics,
        OptimizationResult,
        create_optimization_agent,
        health_check,
    )

    from .config import (
        OptimizationSettings,
        ModelTypeConfig,
        OptimizationStrategies,
        DEFAULT_SETTINGS,
        get_config_for_environment,
        FEATURE_ENGINEERING_CONFIG,
        ENSEMBLE_CONFIG,
        MONITORING_CONFIG,
    )

    from .router import router

    FULL_IMPLEMENTATION = True

except ImportError as e:
    # Fallback to simple implementation
    from .agent_simple import (
        AIModelOptimizationAgent as OptimizationAgent,
        OptimizationConfig,
        OptimizationResult,
        ModelPerformanceReport as ModelMetrics,
        get_agent,
        quick_setup,
        create_optimization_agent,
    )

    # Mock missing classes for compatibility
    class MockAnalyzer:
        pass

    class MockConfig:
        pass

    ModelAnalyzer = MockAnalyzer
    HyperparameterOptimizer = MockAnalyzer
    AutoRetrainer = MockAnalyzer
    EnsembleCreator = MockAnalyzer
    OptimizationSettings = MockConfig
    ModelTypeConfig = MockConfig
    OptimizationStrategies = MockConfig
    DEFAULT_SETTINGS = MockConfig()
    FEATURE_ENGINEERING_CONFIG = {}
    ENSEMBLE_CONFIG = {}
    MONITORING_CONFIG = {}

    def get_config_for_environment(env):
        return MockConfig()

    def health_check():
        return {"status": "healthy", "implementation": "simplified"}

    # Create minimal router
    from fastapi import APIRouter

    router = APIRouter()

    FULL_IMPLEMENTATION = False
    import logging

    logging.getLogger(__name__).warning(
        f"Using simplified implementation due to missing dependencies: {e}"
    )

__version__ = "1.0.0"
__author__ = "Trading Platform AI Team"
__description__ = "Advanced AI agent for automated model optimization"

__all__ = [
    # Main classes
    "OptimizationAgent",
    "ModelAnalyzer",
    "HyperparameterOptimizer",
    "AutoRetrainer",
    "EnsembleCreator",
    # Data structures
    "OptimizationConfig",
    "ModelMetrics",
    "OptimizationResult",
    # Factory functions
    "create_optimization_agent",
    "health_check",
    # Configuration
    "OptimizationSettings",
    "ModelTypeConfig",
    "OptimizationStrategies",
    "DEFAULT_SETTINGS",
    "get_config_for_environment",
    # API router
    "router",
    # Configuration exports
    "FEATURE_ENGINEERING_CONFIG",
    "ENSEMBLE_CONFIG",
    "MONITORING_CONFIG",
]

# Package metadata
__title__ = "AI Model Auto-Optimization Agent"
__url__ = "https://github.com/trading-platform/ml-optimization"
__license__ = "Proprietary"

# Supported model types
SUPPORTED_MODEL_TYPES = ["lightgbm", "xgboost", "sklearn", "tensorflow", "pytorch"]

# Optimization methods
OPTIMIZATION_METHODS = ["optuna", "bayesian", "grid_search", "random_search"]

# Ensemble methods
ENSEMBLE_METHODS = ["weighted", "stacking", "averaging", "dynamic_selection"]


def get_supported_features():
    """Get list of supported optimization features"""
    return {
        "model_analysis": [
            "performance_degradation_detection",
            "data_drift_analysis",
            "concept_drift_identification",
            "feature_importance_tracking",
            "prediction_confidence_analysis",
        ],
        "hyperparameter_optimization": [
            "optuna_tpe_sampling",
            "bayesian_optimization",
            "grid_search",
            "multi_objective_optimization",
            "early_stopping_pruning",
        ],
        "automated_retraining": [
            "trigger_based_retraining",
            "quality_gate_validation",
            "ab_testing_framework",
            "shadow_deployment",
            "rollback_capabilities",
        ],
        "ensemble_creation": [
            "weighted_averaging",
            "stacking_ensembles",
            "dynamic_selection",
            "diversity_maximization",
            "correlation_analysis",
        ],
        "feature_engineering": [
            "automatic_feature_generation",
            "importance_based_selection",
            "correlation_analysis",
            "polynomial_features",
            "interaction_detection",
        ],
    }


def get_api_endpoints():
    """Get list of available API endpoints"""
    return [
        {
            "path": "/api/v1/optimization/analyze",
            "method": "POST",
            "description": "Analyze current model performance and detect issues",
        },
        {
            "path": "/api/v1/optimization/hyperparameter",
            "method": "POST",
            "description": "Start hyperparameter optimization",
        },
        {
            "path": "/api/v1/optimization/retrain",
            "method": "POST",
            "description": "Trigger automated retraining pipeline",
        },
        {
            "path": "/api/v1/optimization/ensemble",
            "method": "POST",
            "description": "Create and optimize ensemble models",
        },
        {
            "path": "/api/v1/optimization/status/{process_id}",
            "method": "GET",
            "description": "Get status of optimization processes",
        },
        {
            "path": "/api/v1/optimization/optimize/{model_id}",
            "method": "POST",
            "description": "Full model optimization pipeline",
        },
        {
            "path": "/api/v1/optimization/health",
            "method": "GET",
            "description": "Health check for optimization service",
        },
        {
            "path": "/api/v1/optimization/models",
            "method": "GET",
            "description": "List models available for optimization",
        },
        {
            "path": "/api/v1/optimization/metrics/{model_id}",
            "method": "GET",
            "description": "Get detailed metrics for a specific model",
        },
    ]


# Quick setup helper
async def quick_setup(model_id: str, strategy: str = "balanced"):
    """
    Quick setup for model optimization

    Args:
        model_id: ID of the model to optimize
        strategy: Optimization strategy ('conservative', 'balanced', 'aggressive')

    Returns:
        Optimization result
    """
    agent = await create_optimization_agent()

    # Configure strategy
    if strategy == "conservative":
        agent.config.max_trials = 50
        agent.config.timeout_seconds = 1800
    elif strategy == "aggressive":
        agent.config.max_trials = 200
        agent.config.timeout_seconds = 7200

    # Run optimization
    return await agent.optimize_model(model_id, "full")


# Logging configuration
import logging

logger = logging.getLogger(__name__)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
