"""
Test suite for simplified AI Model Optimization Agent
"""

import asyncio
import pytest
from datetime import datetime
from src.skills.ai_model_auto_optimization.agent_simple import (
    AIModelOptimizationAgent,
    OptimizationConfig,
    quick_setup,
    create_optimization_agent,
)


class TestAIModelOptimizationAgent:
    """Test suite for AI Model Optimization Agent"""

    @pytest.fixture
    def agent(self):
        """Create agent instance for testing"""
        return AIModelOptimizationAgent()

    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return OptimizationConfig(strategy="fast", max_trials=10, timeout_minutes=5)

    @pytest.mark.asyncio
    async def test_agent_initialization(self, agent):
        """Test agent initialization"""
        assert agent is not None
        assert agent.config.strategy == "balanced"  # default value
        assert len(agent.active_processes) == 0

    @pytest.mark.asyncio
    async def test_analyze_model_performance(self, agent):
        """Test model performance analysis"""
        result = await agent.analyze_model_performance("test_model_001")

        assert result.model_id == "test_model_001"
        assert isinstance(result.accuracy, float)
        assert 0 <= result.accuracy <= 1
        assert isinstance(result.drift_detected, bool)
        assert result.recommendation is not None

    @pytest.mark.asyncio
    async def test_optimize_hyperparameters(self, agent, config):
        """Test hyperparameter optimization"""
        result = await agent.optimize_hyperparameters("test_model_002", config)

        assert result.model_id == "test_model_002"
        assert result.status == "completed"
        assert isinstance(result.best_score, float)
        assert 0 <= result.best_score <= 1
        assert isinstance(result.best_params, dict)
        assert result.optimization_time > 0

        # Check process tracking
        assert result.process_id in agent.active_processes
        assert agent.active_processes[result.process_id]["status"] == "completed"

    @pytest.mark.asyncio
    async def test_create_ensemble(self, agent):
        """Test ensemble creation"""
        model_ids = ["model_1", "model_2", "model_3"]
        result = await agent.create_ensemble(model_ids, "weighted")

        assert "ensemble_id" in result
        assert result["model_ids"] == model_ids
        assert result["strategy"] == "weighted"
        assert result["status"] == "created"
        assert isinstance(result["expected_performance"], float)

    @pytest.mark.asyncio
    async def test_get_process_status(self, agent):
        """Test process status tracking"""
        # First start a process
        result = await agent.optimize_hyperparameters(
            "test_model_003", OptimizationConfig(max_trials=5)
        )
        process_id = result.process_id

        # Get status
        status = await agent.get_process_status(process_id)
        assert status["status"] == "completed"
        assert "result" in status

        # Test non-existent process
        fake_status = await agent.get_process_status("non_existent")
        assert fake_status["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_optimize_model_full_pipeline(self, agent):
        """Test complete model optimization pipeline"""
        result = await agent.optimize_model("test_model_004", "fast")

        assert result.model_id == "test_model_004"
        assert result.status == "completed"
        assert isinstance(result.ensemble_used, bool)
        assert result.optimization_time > 0

    @pytest.mark.asyncio
    async def test_quick_setup_function(self):
        """Test quick setup convenience function"""
        result = await quick_setup("test_model_005", "fast")

        assert result.model_id == "test_model_005"
        assert result.status == "completed"
        assert isinstance(result.best_score, float)

    @pytest.mark.asyncio
    async def test_create_optimization_agent_function(self):
        """Test agent creation function"""
        agent = await create_optimization_agent()
        assert isinstance(agent, AIModelOptimizationAgent)

    def test_configuration_strategies(self):
        """Test different configuration strategies"""
        # Fast strategy
        fast_config = OptimizationConfig(strategy="fast")
        assert fast_config.max_trials == 50  # default, will be overridden

        # Balanced strategy
        balanced_config = OptimizationConfig(strategy="balanced")
        assert balanced_config.strategy == "balanced"

        # Thorough strategy
        thorough_config = OptimizationConfig(strategy="thorough")
        assert thorough_config.strategy == "thorough"

    @pytest.mark.asyncio
    async def test_concurrent_optimization(self):
        """Test running multiple optimizations concurrently"""
        agent = AIModelOptimizationAgent()

        # Run multiple optimizations concurrently
        tasks = []
        for i in range(3):
            task = agent.optimize_hyperparameters(
                f"model_{i}", OptimizationConfig(max_trials=5)
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks)

        # Verify all completed successfully
        assert len(results) == 3
        for i, result in enumerate(results):
            assert result.model_id == f"model_{i}"
            assert result.status == "completed"
            assert result.process_id in agent.active_processes


if __name__ == "__main__":
    # Run tests directly
    async def run_test():
        test_instance = TestAIModelOptimizationAgent()
        agent = test_instance.agent()
        await test_instance.test_agent_initialization(agent)
        print("Test completed successfully!")

    asyncio.run(run_test())
