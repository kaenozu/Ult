"""
FastAPI Router for AI Model Auto-Optimization Agent
Provides RESTful API endpoints for model optimization services
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from .agent import create_optimization_agent, health_check
from src.auth.dependencies import get_current_user
from src.models.user import User


# Pydantic models for API requests/responses
class ModelAnalysisRequest(BaseModel):
    model_id: str = Field(..., description="ID of the model to analyze")
    analysis_type: str = Field(
        default="performance", description="Type of analysis to perform"
    )
    time_range: str = Field(default="24h", description="Time range for analysis")


class HyperparameterOptimizationRequest(BaseModel):
    model_id: str = Field(..., description="ID of the model to optimize")
    optimization_method: str = Field(
        default="optuna", description="Optimization method (optuna/bayesian)"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default=None, description="Custom optimization parameters"
    )
    max_trials: int = Field(default=100, description="Maximum number of trials")
    timeout_seconds: int = Field(default=3600, description="Timeout in seconds")


class RetrainingRequest(BaseModel):
    model_id: str = Field(..., description="ID of the model to retrain")
    retrain_type: str = Field(
        default="full", description="Type of retraining (full/incremental)"
    )
    quality_gates: bool = Field(
        default=True, description="Enable quality gate validation"
    )
    force_retrain: bool = Field(
        default=False, description="Force retrain even if not needed"
    )


class EnsembleRequest(BaseModel):
    base_models: List[str] = Field(
        ..., description="List of base model IDs for ensemble"
    )
    ensemble_method: str = Field(
        default="weighted", description="Ensemble method (weighted/stacking/averaging)"
    )
    optimization_target: str = Field(
        default="accuracy", description="Optimization target metric"
    )


class OptimizationStatusResponse(BaseModel):
    process_id: str
    process_type: str
    status: str
    result: Optional[Dict[str, Any]]
    timestamp: datetime


class OptimizationResponse(BaseModel):
    model_id: str
    optimization_type: str
    status: str
    improvement_percentage: float
    execution_time_seconds: float
    old_metrics: Dict[str, float]
    new_metrics: Dict[str, float]
    parameters: Optional[Dict[str, Any]]
    error_message: Optional[str]


# Create router
router = APIRouter(
    prefix="/api/v1/optimization",
    tags=["model-optimization"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)


# Dependency to get optimization agent
async def get_optimization_agent():
    return await create_optimization_agent()


@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_model(
    request: ModelAnalysisRequest,
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze current model performance and detect issues
    """
    try:
        # Parse time range
        time_range_hours = 24
        if request.time_range.endswith("h"):
            time_range_hours = int(request.time_range[:-1])
        elif request.time_range.endswith("d"):
            time_range_hours = int(request.time_range[:-1]) * 24

        analysis = await agent.analyzer.analyze_performance(
            model_id=request.model_id, time_range_hours=time_range_hours
        )

        return {
            "success": True,
            "data": analysis,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Model analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hyperparameter", response_model=Dict[str, Any])
async def start_hyperparameter_optimization(
    request: HyperparameterOptimizationRequest,
    background_tasks: BackgroundTasks,
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Start hyperparameter optimization process
    """
    try:
        # Update agent config if custom parameters provided
        if request.parameters:
            agent.config.max_trials = request.parameters.get(
                "max_trials", request.max_trials
            )
            agent.config.timeout_seconds = request.parameters.get(
                "timeout_seconds", request.timeout_seconds
            )

        # Start optimization in background
        process_id = f"hyperopt_{request.model_id}_{datetime.utcnow().timestamp()}"

        async def run_optimization():
            try:
                result = await agent.tune_hyperparameters(
                    model_id=request.model_id,
                    method=request.optimization_method,
                    trials=request.max_trials,
                )
                await agent._track_process(
                    process_id, "hyperparameter_optimization", result
                )
            except Exception as e:
                error_result = {"error": str(e)}
                await agent._track_process(
                    process_id, "hyperparameter_optimization", error_result
                )

        background_tasks.add_task(run_optimization)

        return {
            "success": True,
            "process_id": process_id,
            "message": "Hyperparameter optimization started",
            "model_id": request.model_id,
            "optimization_method": request.optimization_method,
            "max_trials": request.max_trials,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Hyperparameter optimization failed to start: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain", response_model=Dict[str, Any])
async def trigger_retraining(
    request: RetrainingRequest,
    background_tasks: BackgroundTasks,
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger automated retraining pipeline
    """
    try:
        # Check if retraining is needed (unless forced)
        if not request.force_retrain:
            analysis = await agent.analyzer.analyze_performance(request.model_id)
            if not analysis.get("needs_optimization", False):
                return {
                    "success": True,
                    "status": "skipped",
                    "message": "Retraining not needed at this time",
                    "model_id": request.model_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        # Start retraining in background
        process_id = f"retrain_{request.model_id}_{datetime.utcnow().timestamp()}"

        async def run_retraining():
            try:
                result = await agent.retrainer.trigger_retraining(
                    model_id=request.model_id,
                    retrain_type=request.retrain_type,
                    quality_gates=request.quality_gates,
                )
                await agent._track_process(process_id, "retraining", result)
            except Exception as e:
                error_result = {"error": str(e)}
                await agent._track_process(process_id, "retraining", error_result)

        background_tasks.add_task(run_retraining)

        return {
            "success": True,
            "process_id": process_id,
            "message": "Retraining pipeline started",
            "model_id": request.model_id,
            "retrain_type": request.retrain_type,
            "quality_gates": request.quality_gates,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Retraining failed to start: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ensemble", response_model=Dict[str, Any])
async def create_ensemble(
    request: EnsembleRequest,
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Create and optimize ensemble models
    """
    try:
        if len(request.base_models) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 base models are required for ensemble creation",
            )

        result = await agent.create_ensemble(
            base_models=request.base_models, ensemble_method=request.ensemble_method
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result,
            "message": f"Ensemble created using {request.ensemble_method} method",
            "base_models_count": len(request.base_models),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ensemble creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{process_id}", response_model=OptimizationStatusResponse)
async def get_optimization_status(
    process_id: str,
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Get status of optimization processes
    """
    try:
        status = await agent.get_optimization_status(process_id)

        if "error" in status:
            raise HTTPException(status_code=404, detail=status["error"])

        return OptimizationStatusResponse(
            process_id=status["process_id"],
            process_type=status["process_type"],
            status=status["status"],
            result=status.get("result"),
            timestamp=datetime.fromisoformat(status["timestamp"]),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get optimization status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize/{model_id}", response_model=OptimizationResponse)
async def optimize_model(
    model_id: str,
    optimization_type: str = "full",
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Full model optimization (analysis + hyperparameter tuning + retraining)
    """
    try:
        result = await agent.optimize_model(model_id, optimization_type)

        return OptimizationResponse(
            model_id=result.model_id,
            optimization_type=result.optimization_type,
            status=result.status,
            improvement_percentage=result.improvement_percentage,
            execution_time_seconds=result.execution_time_seconds,
            old_metrics=result.old_metrics.__dict__ if result.old_metrics else {},
            new_metrics=result.new_metrics.__dict__ if result.new_metrics else {},
            parameters=result.parameters,
            error_message=result.error_message,
        )

    except Exception as e:
        logger.error(f"Model optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check_endpoint():
    """
    Health check for optimization service
    """
    try:
        health_status = await health_check()
        return {
            "service": "ai-model-auto-optimization",
            "status": health_status["status"],
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "service": "ai-model-auto-optimization",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.get("/models")
async def list_optimizable_models(
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    List models available for optimization
    """
    try:
        models = await agent.model_registry.list_models()

        # Filter for models that can be optimized (ML models)
        ml_models = [
            model
            for model in models
            if model.get("type", "").lower() in ["lgbm", "xgboost", "sklearn", "ml"]
        ]

        return {
            "success": True,
            "data": ml_models,
            "count": len(ml_models),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/{model_id}")
async def get_model_metrics(
    model_id: str,
    time_range: str = "24h",
    agent=Depends(get_optimization_agent),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed metrics for a specific model
    """
    try:
        # Parse time range
        time_range_hours = 24
        if time_range.endswith("h"):
            time_range_hours = int(time_range[:-1])
        elif time_range.endswith("d"):
            time_range_hours = int(time_range[:-1]) * 24

        metrics = await agent.monitoring.get_metrics(model_id, time_range_hours)
        analysis = await agent.analyzer.analyze_performance(model_id, time_range_hours)

        return {
            "success": True,
            "model_id": model_id,
            "time_range_hours": time_range_hours,
            "metrics": metrics,
            "analysis": analysis,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to get model metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Error handlers
@router.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "success": False,
        "error": "Internal server error",
        "detail": str(exc) if len(str(exc)) < 100 else "Error details too long",
        "timestamp": datetime.utcnow().isoformat(),
    }
