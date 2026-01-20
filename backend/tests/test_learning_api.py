"""
Integration tests for the learning API endpoints
"""

import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from unittest.mock import patch, MagicMock
import json

from backend.src.api.routers.learning import router
from backend.src.continuous_learning import TaskContext


@pytest.fixture
def app():
    """Create test FastAPI app"""
    test_app = FastAPI()
    test_app.include_router(router, tags=["learning"])
    return test_app


@pytest.fixture
async def client(app):
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


class TestLearningAPI:
    """Test the learning API endpoints"""

    @pytest.mark.asyncio
    async def test_report_task_completion_success(self, client):
        """Test successful task completion reporting"""
        task_data = {
            "task_type": "debugging",
            "description": "Fixed critical bug in authentication",
            "duration": 45.5,
            "success": True,
            "error_messages": ["Authentication failed"],
            "technologies_used": ["Python", "FastAPI"],
            "patterns_discovered": ["JWT validation"],
            "solutions_applied": ["Fixed token decoding"],
            "challenges_encountered": ["Token expiration handling"],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_skill = MagicMock()
            mock_skill.name = "fix-jwt-auth"
            mock_skill.quality_score = 0.85
            mock_learning.on_task_completion.return_value = mock_skill

            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            assert response.status_code == 200
            data = response.json()
            assert data["extracted"] == False  # Async processing
            assert "Task completion reported" in data["message"]

            # Verify the learning system was called
            mock_learning.on_task_completion.assert_called_once()
            called_task = mock_learning.on_task_completion.call_args[0][0]
            assert called_task.task_type == "debugging"
            assert called_task.success == True

    @pytest.mark.asyncio
    async def test_report_task_completion_failed_task(self, client):
        """Test reporting failed task completion"""
        task_data = {
            "task_type": "deployment",
            "description": "Failed to deploy to production",
            "duration": 15.0,
            "success": False,
            "error_messages": ["Build failed with exit code 1"],
            "technologies_used": ["Docker", "Kubernetes"],
            "patterns_discovered": [],
            "solutions_applied": [],
            "challenges_encountered": ["CI/CD pipeline issues"],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_learning.on_task_completion.return_value = None  # No skill extracted

            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            assert response.status_code == 200
            mock_learning.on_task_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_report_task_completion_invalid_data(self, client):
        """Test invalid task completion data"""
        invalid_data = {
            "task_type": "",  # Invalid: empty string
            "description": "Test task",
            "duration": -10,  # Invalid: negative duration
            "success": True,
            "technologies_used": ["Python"],
        }

        response = await client.post(
            "/api/v1/learning/task-completion", json=invalid_data
        )

        # Should fail validation
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_get_learning_stats(self, client):
        """Test getting learning statistics"""
        mock_stats = {
            "total_tasks_analyzed": 25,
            "skills_extracted": 8,
            "extraction_rate": 0.32,
            "most_common_technologies": [["Python", 12], ["React", 8]],
            "recent_skills": ["Fixed auth bug", "Optimized query"],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_learning.get_learning_stats.return_value = mock_stats

            response = await client.get("/api/v1/learning/stats")

            assert response.status_code == 200
            data = response.json()
            assert data["total_tasks_analyzed"] == 25
            assert data["skills_extracted"] == 8
            assert data["extraction_rate"] == 0.32

    @pytest.mark.asyncio
    async def test_get_learning_stats_error(self, client):
        """Test learning stats error handling"""
        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_learning.get_learning_stats.side_effect = Exception("Database error")

            response = await client.get("/api/v1/learning/stats")

            assert response.status_code == 500
            assert "Failed to get learning statistics" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_list_extracted_skills_placeholder(self, client):
        """Test skills listing endpoint (currently placeholder)"""
        response = await client.get("/api/v1/learning/skills")

        assert response.status_code == 200
        data = response.json()
        assert "skills" in data
        assert "message" in data

    @pytest.mark.asyncio
    async def test_background_task_processing(self, client):
        """Test that background task processing is triggered"""
        task_data = {
            "task_type": "optimization",
            "description": "Optimized database query performance",
            "duration": 120.0,
            "success": True,
            "error_messages": [],
            "technologies_used": ["PostgreSQL", "Python"],
            "patterns_discovered": ["query optimization"],
            "solutions_applied": ["Added database index"],
            "challenges_encountered": ["Slow query analysis"],
        }

        with patch(
            "backend.src.api.routers.learning._analyze_task_completion"
        ) as mock_analyze:
            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            assert response.status_code == 200
            # Background task should be added (we can't easily test the actual execution)
            # but the endpoint should return success

    @pytest.mark.asyncio
    async def test_task_completion_with_all_fields(self, client):
        """Test task completion with all optional fields filled"""
        task_data = {
            "task_type": "feature_implementation",
            "description": "Implemented user authentication with OAuth",
            "duration": 480.0,  # 8 hours
            "success": True,
            "error_messages": [
                "OAuth callback URL mismatch",
                "Token storage security concern",
            ],
            "technologies_used": ["React", "Node.js", "OAuth2"],
            "patterns_discovered": [
                "secure token storage",
                "OAuth flow implementation",
            ],
            "solutions_applied": [
                "Fixed callback URL configuration",
                "Implemented secure token encryption",
                "Added token refresh logic",
            ],
            "challenges_encountered": [
                "OAuth provider differences",
                "Security best practices implementation",
            ],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_skill = MagicMock()
            mock_skill.name = "implement-oauth-auth"
            mock_skill.quality_score = 0.92
            mock_learning.on_task_completion.return_value = mock_skill

            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            assert response.status_code == 200

            # Verify all fields were passed correctly
            mock_learning.on_task_completion.assert_called_once()
            called_task = mock_learning.on_task_completion.call_args[0][0]
            assert len(called_task.error_messages) == 2
            assert len(called_task.technologies_used) == 3
            assert len(called_task.patterns_discovered) == 2
            assert len(called_task.solutions_applied) == 3
            assert len(called_task.challenges_encountered) == 2


class TestLearningAPIIntegration:
    """Integration tests with full system"""

    @pytest.mark.asyncio
    async def test_end_to_end_task_processing(self, client):
        """Test complete task processing flow"""
        task_data = {
            "task_type": "debugging",
            "description": "Resolved memory leak in React component",
            "duration": 90.0,
            "success": True,
            "error_messages": ["Memory usage increasing over time"],
            "technologies_used": ["React", "JavaScript"],
            "patterns_discovered": ["memory leak patterns"],
            "solutions_applied": [
                "Added cleanup in useEffect",
                "Removed event listeners",
            ],
            "challenges_encountered": ["Identifying leak source"],
        }

        # Mock the continuous learning system
        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            # Simulate skill extraction
            mock_skill = MagicMock()
            mock_skill.name = "fix-react-memory-leak"
            mock_skill.quality_score = 0.88
            mock_learning.on_task_completion.return_value = mock_skill

            # Make API call
            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            # Verify response
            assert response.status_code == 200
            data = response.json()
            assert "Task completion reported" in data["message"]

            # Verify learning system was called with correct data
            mock_learning.on_task_completion.assert_called_once()
            task_context = mock_learning.on_task_completion.call_args[0][0]

            assert task_context.task_type == "debugging"
            assert "memory leak" in task_context.description.lower()
            assert task_context.duration == 90.0
            assert task_context.success == True
            assert "React" in task_context.technologies_used

    @pytest.mark.asyncio
    async def test_stats_endpoint_with_mock_data(self, client):
        """Test stats endpoint with comprehensive mock data"""
        mock_stats = {
            "total_tasks_analyzed": 150,
            "skills_extracted": 45,
            "extraction_rate": 0.3,
            "most_common_technologies": [
                ["Python", 45],
                ["React", 38],
                ["JavaScript", 32],
                ["FastAPI", 28],
                ["PostgreSQL", 22],
            ],
            "recent_skills": [
                "Optimized database query performance",
                "Fixed authentication middleware bug",
                "Implemented error boundary for React app",
                "Added input validation for API endpoints",
                "Resolved memory leak in background service",
            ],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_learning.get_learning_stats.return_value = mock_stats

            response = await client.get("/api/v1/learning/stats")

            assert response.status_code == 200
            data = response.json()

            assert data["total_tasks_analyzed"] == 150
            assert data["skills_extracted"] == 45
            assert data["extraction_rate"] == 0.3
            assert len(data["most_common_technologies"]) == 5
            assert len(data["recent_skills"]) == 5
            assert "Python" in [tech[0] for tech in data["most_common_technologies"]]

    @pytest.mark.asyncio
    async def test_concurrent_task_submissions(self, client):
        """Test handling multiple concurrent task submissions"""
        import asyncio

        task_data = {
            "task_type": "testing",
            "description": "Wrote comprehensive unit tests",
            "duration": 60.0,
            "success": True,
            "error_messages": [],
            "technologies_used": ["pytest", "Python"],
            "patterns_discovered": ["test-driven development"],
            "solutions_applied": ["Added test coverage", "Implemented fixtures"],
            "challenges_encountered": ["Mock setup complexity"],
        }

        async def submit_task(task_num):
            data = task_data.copy()
            data["description"] = f"{data['description']} - Task {task_num}"
            response = await client.post("/api/v1/learning/task-completion", json=data)
            return response.status_code

        # Submit 5 tasks concurrently
        tasks = [submit_task(i) for i in range(5)]
        results = await asyncio.gather(*tasks)

        # All should succeed
        assert all(status == 200 for status in results)

    @pytest.mark.asyncio
    async def test_large_task_payload(self, client):
        """Test handling of large task payloads"""
        # Create a task with many details
        task_data = {
            "task_type": "research",
            "description": "Conducted comprehensive research on AI/ML architectures for financial prediction",
            "duration": 240.0,  # 4 hours
            "success": True,
            "error_messages": [],
            "technologies_used": [
                "Python",
                "TensorFlow",
                "PyTorch",
                "scikit-learn",
                "pandas",
                "numpy",
                "Jupyter",
                "MLflow",
            ],
            "patterns_discovered": [
                "ensemble methods",
                "time series forecasting",
                "feature engineering",
                "model validation",
                "hyperparameter tuning",
                "cross-validation",
            ],
            "solutions_applied": [
                "Implemented LSTM networks",
                "Created feature pipelines",
                "Set up experiment tracking",
                "Built evaluation metrics",
                "Developed model serving infrastructure",
            ],
            "challenges_encountered": [
                "Data quality issues",
                "Model overfitting",
                "Computational resource constraints",
                "Real-time prediction requirements",
            ],
        }

        with patch(
            "backend.src.api.routers.learning.continuous_learning"
        ) as mock_learning:
            mock_skill = MagicMock()
            mock_skill.name = "research-ai-architectures"
            mock_skill.quality_score = 0.95
            mock_learning.on_task_completion.return_value = mock_skill

            response = await client.post(
                "/api/v1/learning/task-completion", json=task_data
            )

            assert response.status_code == 200

            # Verify large payload was handled
            mock_learning.on_task_completion.assert_called_once()
            task_context = mock_learning.on_task_completion.call_args[0][0]
            assert len(task_context.technologies_used) == 8
            assert len(task_context.patterns_discovered) == 6
            assert len(task_context.solutions_applied) == 5
            assert len(task_context.challenges_encountered) == 4
