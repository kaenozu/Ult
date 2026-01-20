"""
Learning API Router - Continuous Learning System Integration
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import jwt
import os

from src.continuous_learning import continuous_learning, TaskContext, ExtractedSkill

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required for authentication")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


router = APIRouter(
    prefix="/api/v1/learning",
    tags=["learning"],
    dependencies=[Depends(verify_token)],  # Require authentication for all endpoints
)


class TaskCompletionRequest(BaseModel):
    task_type: str
    description: str
    duration: float
    success: bool
    error_messages: List[str] = []
    technologies_used: List[str] = []
    patterns_discovered: List[str] = []
    solutions_applied: List[str] = []
    challenges_encountered: List[str] = []


class SkillExtractionResponse(BaseModel):
    extracted: bool
    skill_name: Optional[str] = None
    quality_score: Optional[float] = None
    message: str


class LearningStatsResponse(BaseModel):
    total_tasks_analyzed: int
    skills_extracted: int
    extraction_rate: float
    most_common_technologies: List[Dict[str, Any]]
    recent_skills: List[str]


@router.post("/task-completion", response_model=SkillExtractionResponse)
async def report_task_completion(
    request: TaskCompletionRequest, background_tasks: BackgroundTasks
):
    """
    Report task completion and potentially extract skill
    """
    try:
        # Create task context
        task_context = TaskContext(
            task_type=request.task_type,
            description=request.description,
            duration=request.duration,
            success=request.success,
            error_messages=request.error_messages,
            technologies_used=request.technologies_used,
            patterns_discovered=request.patterns_discovered,
            solutions_applied=request.solutions_applied,
            challenges_encountered=request.challenges_encountered,
            timestamp=datetime.now(),
        )

        # Analyze task in background to avoid blocking response
        background_tasks.add_task(_analyze_task_completion, task_context)

        return SkillExtractionResponse(
            extracted=False,  # Will be updated asynchronously
            message="Task completion reported. Skill extraction analysis in progress.",
        )

    except Exception as e:
        logger.error(f"Error processing task completion: {e}")
        raise HTTPException(status_code=500, detail="Failed to process task completion")


@router.get("/stats", response_model=LearningStatsResponse)
async def get_learning_stats():
    """
    Get continuous learning system statistics
    """
    try:
        stats = continuous_learning.get_learning_stats()
        return LearningStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting learning stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get learning statistics")


@router.get("/skills")
async def list_extracted_skills():
    """
    List all extracted skills
    """
    try:
        # This would need to be implemented in SkillExtractor
        # For now, return a placeholder
        return {"skills": [], "message": "Skill listing not yet implemented"}
    except Exception as e:
        logger.error(f"Error listing skills: {e}")
        raise HTTPException(status_code=500, detail="Failed to list skills")


async def _analyze_task_completion(task_context: TaskContext):
    """
    Background task to analyze completed task and extract skill if appropriate
    """
    try:
        logger.info(
            f"Starting skill extraction analysis for task: {task_context.description}"
        )

        # Analyze task completion
        extracted_skill = continuous_learning.on_task_completion(task_context)

        if extracted_skill:
            logger.info(
                f"Skill extracted: {extracted_skill.name} (quality: {extracted_skill.quality_score:.2f})"
            )

            # Here we could send notifications or update metrics
            # For now, just log the extraction

        else:
            logger.debug(f"No skill extracted from task: {task_context.description}")

    except Exception as e:
        logger.error(f"Error in background skill extraction: {e}")


# Integration hook for opencode's task completion
def on_opencode_task_completion(
    task_type: str,
    description: str,
    duration: float,
    success: bool,
    technologies: List[str] = None,
    errors: List[str] = None,
    solutions: List[str] = None,
) -> Optional[ExtractedSkill]:
    """
    Hook function to be called by opencode when tasks complete
    """
    if technologies is None:
        technologies = []
    if errors is None:
        errors = []
    if solutions is None:
        solutions = []

    task_context = TaskContext(
        task_type=task_type,
        description=description,
        duration=duration,
        success=success,
        error_messages=errors,
        technologies_used=technologies,
        patterns_discovered=[],  # Could be inferred from context
        solutions_applied=solutions,
        challenges_encountered=errors,  # Errors often indicate challenges
        timestamp=datetime.now(),
    )

    return continuous_learning.on_task_completion(task_context)
