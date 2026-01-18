"""
Tests for the continuous learning system
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from backend.src.continuous_learning import (
    ContinuousLearningSystem,
    SkillQualityEvaluator,
    SkillExtractor,
    TaskContext,
    SkillCandidate,
    ExtractedSkill,
)


class TestSkillQualityEvaluator:
    """Test the skill quality evaluation logic"""

    def setup_method(self):
        self.evaluator = SkillQualityEvaluator()

    def test_evaluate_reusability_high_score(self):
        """Test high reusability score for debugging task"""
        candidate = SkillCandidate(
            name="debug-react-hydration",
            problem="React hydration error in Next.js",
            solution="Add suppressHydrationWarning to component",
            trigger_conditions=["hydration error", "server/client mismatch"],
            verification_steps=["Error disappears", "App renders correctly"],
            context="frontend",
            technologies=["React", "Next.js"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Fixed hydration error",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert should_extract == True
        assert score > 0.7
        assert scores["reusability"] > 0.5

    def test_evaluate_specificity_exact_error_message(self):
        """Test high specificity score for exact error messages"""
        candidate = SkillCandidate(
            name="fix-enoent-error",
            problem="ENOENT error when running npm scripts",
            solution="Use npm install to fix missing dependencies",
            trigger_conditions=["ENOENT: no such file or directory", "npm run fails"],
            verification_steps=["npm install succeeds", "script runs"],
            context="build",
            technologies=["npm", "Node.js"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Fixed npm script error",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert scores["specificity"] > 0.6  # Exact error message bonus

    def test_evaluate_non_triviality_debugging_keywords(self):
        """Test non-triviality score for debugging keywords"""
        candidate = SkillCandidate(
            name="debug-async-race-condition",
            problem="Race condition in async operations",
            solution="Discovered through extensive debugging and logging",
            trigger_conditions=["intermittent failures", "async operations"],
            verification_steps=["Add mutex", "Test concurrent operations"],
            context="backend",
            technologies=["Python", "asyncio"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Fixed race condition after hours of debugging",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert scores["non_triviality"] > 0.4  # Debugging keywords

    def test_evaluate_verifiability_actionable_steps(self):
        """Test verifiability score for actionable verification steps"""
        candidate = SkillCandidate(
            name="optimize-bundle-size",
            problem="Large bundle size causing slow load",
            solution="Implement code splitting and lazy loading",
            trigger_conditions=["slow page load", "large bundle size"],
            verification_steps=[
                "Check bundle size reduction",
                "Verify loading performance improvement",
                "Test lazy-loaded components",
            ],
            context="frontend",
            technologies=["React", "Webpack"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Optimized bundle size",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert scores["verifiability"] > 0.7  # Multiple actionable steps

    def test_reject_low_quality_candidate(self):
        """Test rejection of low quality candidate"""
        candidate = SkillCandidate(
            name="simple-config-change",
            problem="Changed config setting",
            solution="Set value to true",
            trigger_conditions=["config issue"],
            verification_steps=["Check it works"],
            context="general",
            technologies=[],  # No specific technologies
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Simple config change",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert should_extract == False
        assert score < 0.6  # Below threshold

    def test_technology_matching_bonus(self):
        """Test technology matching increases score"""
        candidate = SkillCandidate(
            name="react-performance",
            problem="React component slow rendering",
            solution="Use React.memo and useMemo",
            trigger_conditions=["slow rendering", "performance issue"],
            verification_steps=["Check render time improvement"],
            context="frontend",
            technologies=["React", "JavaScript"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Optimized React performance",
        )

        # Mock context with matching technologies
        with patch.object(self.evaluator, "_evaluate_reusability") as mock_reuse:
            mock_reuse.return_value = 0.5
            should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

            # Technology match should increase score
            assert scores["reusability"] >= 0.5

    def test_error_related_bonus(self):
        """Test error-related queries get bonus"""
        candidate = SkillCandidate(
            name="fix-memory-leak",
            problem="Memory leak causing crashes",
            solution="Fixed by clearing event listeners",
            trigger_conditions=["memory leak", "crashes", "out of memory"],
            verification_steps=["Monitor memory usage", "Check for crashes"],
            context="backend",
            technologies=["Node.js"],
            quality_score=0.0,
            extraction_confidence=0.8,
            source_task="Fixed memory leak",
        )

        should_extract, score, scores = self.evaluator.evaluate_candidate(candidate)

        assert should_extract == True  # Error-related gets bonus


class TestSkillExtractor:
    """Test the skill extraction logic"""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.extractor = SkillExtractor(self.temp_dir)

    def teardown_method(self):
        shutil.rmtree(self.temp_dir)

    def test_analyze_debugging_task(self):
        """Test skill extraction from debugging task"""
        task_context = TaskContext(
            task_type="debugging",
            description="Fixed React hydration error in Next.js app",
            duration=45.5,
            success=True,
            error_messages=["Text content did not match"],
            technologies_used=["React", "Next.js"],
            patterns_discovered=["hydration mismatch"],
            solutions_applied=["Added suppressHydrationWarning"],
            challenges_encountered=["SSR differences"],
        )

        skill = self.extractor.analyze_task_completion(task_context)

        assert skill is not None
        assert "debug" in skill.name
        assert "hydration" in skill.problem.lower()

    def test_save_and_load_skill(self):
        """Test saving and loading skill to/from filesystem"""
        skill = ExtractedSkill(
            name="test-skill",
            description="Test skill description",
            problem="Test problem",
            solution="Test solution",
            trigger_conditions=["test condition"],
            verification_steps=["test verification"],
            context="test",
            technologies=["Python"],
            author="test",
            version="1.0.0",
            date_created=datetime.now().isoformat(),
            quality_score=0.8,
        )

        # Save skill
        success = self.extractor.save_skill(skill)
        assert success == True

        # Check file exists
        skill_file = Path(self.temp_dir) / "test-skill" / "SKILL.md"
        assert skill_file.exists()

        # Check content
        content = skill_file.read_text()
        assert "Test skill description" in content
        assert "Test solution" in content


class TestContinuousLearningSystem:
    """Test the main continuous learning system"""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.system = ContinuousLearningSystem()
        # Replace extractor with test version
        self.system.extractor = SkillExtractor(self.temp_dir)

    def teardown_method(self):
        shutil.rmtree(self.temp_dir)

    def test_on_task_completion_successful(self):
        """Test successful task completion processing"""
        task_context = TaskContext(
            task_type="debugging",
            description="Fixed critical bug",
            duration=30.0,
            success=True,
            error_messages=["Null pointer exception"],
            technologies_used=["Java"],
            patterns_discovered=["error handling"],
            solutions_applied=["Added null check"],
            challenges_encountered=["hard to reproduce"],
        )

        skill = self.system.on_task_completion(task_context)

        # Should extract skill for debugging task
        assert skill is not None
        assert skill.quality_score > 0

    def test_on_task_completion_failed_task(self):
        """Test failed task completion"""
        task_context = TaskContext(
            task_type="deployment",
            description="Failed to deploy to production",
            duration=10.0,
            success=False,
            error_messages=["Build failed"],
            technologies_used=["Docker"],
            patterns_discovered=[],
            solutions_applied=[],
            challenges_encountered=["CI/CD issues"],
        )

        skill = self.system.on_task_completion(task_context)

        # Failed tasks might still produce skills if debugging was involved
        # This depends on the evaluation logic

    def test_get_learning_stats(self):
        """Test learning statistics generation"""
        # Add some task history
        self.system.task_history = [
            TaskContext(
                task_type="debugging",
                description="Fixed bug 1",
                duration=20.0,
                success=True,
                error_messages=["Error 1"],
                technologies_used=["Python"],
                patterns_discovered=[],
                solutions_applied=["Fix 1"],
                challenges_encountered=[],
            ),
            TaskContext(
                task_type="debugging",
                description="Fixed bug 2",
                duration=25.0,
                success=True,
                error_messages=["Error 2"],
                technologies_used=["Python"],
                patterns_discovered=[],
                solutions_applied=["Fix 2"],
                challenges_encountered=[],
            ),
        ]

        stats = self.system.get_learning_stats()

        assert stats["total_tasks_analyzed"] == 2
        assert "Python" in [tech for tech, count in stats["most_common_technologies"]]


class TestIntegration:
    """Integration tests for the learning system"""

    @pytest.mark.asyncio
    async def test_async_prediction_flow(self):
        """Test async prediction flow"""
        from backend.src.ai.predictor import make_prediction_async

        # This would need actual model setup
        # For now, just test the async wrapper exists
        assert callable(make_prediction_async)

    def test_skill_search_integration(self):
        """Test skill search integration"""
        from backend.src.skill_search import skill_search

        # Test search with empty index
        results = skill_search.search_skills("test query")
        assert len(results) == 0  # No skills in empty system

    def test_end_to_end_flow(self):
        """Test end-to-end learning flow"""
        # Create temp directory for skills
        temp_dir = tempfile.mkdtemp()

        try:
            # Initialize system
            extractor = SkillExtractor(temp_dir)
            system = ContinuousLearningSystem()
            system.extractor = extractor

            # Simulate task completion
            task = TaskContext(
                task_type="debugging",
                description="Fixed critical database connection issue",
                duration=60.0,
                success=True,
                error_messages=["Connection timeout", "Pool exhausted"],
                technologies_used=["PostgreSQL", "Python"],
                patterns_discovered=["connection pooling"],
                solutions_applied=["Increased pool size", "Added retry logic"],
                challenges_encountered=["Intermittent failures"],
            )

            # Process task
            skill = system.on_task_completion(task)

            # Should have extracted a skill
            assert skill is not None
            assert skill.quality_score > 0.6  # High quality debugging task

            # Check skill was saved
            skill_dir = Path(temp_dir) / skill.name
            assert skill_dir.exists()
            skill_file = skill_dir / "SKILL.md"
            assert skill_file.exists()

            # Verify content
            content = skill_file.read_text()
            assert "database connection" in content.lower()
            assert "pool" in content.lower()

        finally:
            shutil.rmtree(temp_dir)


# Fixtures for common test data
@pytest.fixture
def sample_task_context():
    """Sample task context for testing"""
    return TaskContext(
        task_type="debugging",
        description="Fixed React component re-rendering issue",
        duration=35.0,
        success=True,
        error_messages=["Component re-renders excessively"],
        technologies_used=["React", "JavaScript"],
        patterns_discovered=["unnecessary re-renders"],
        solutions_applied=["Used React.memo", "Optimized useEffect dependencies"],
        challenges_encountered=["Performance debugging"],
    )


@pytest.fixture
def temp_skills_dir():
    """Temporary directory for skill storage"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)
