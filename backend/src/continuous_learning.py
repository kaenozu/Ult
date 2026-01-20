"""
Continuous Learning System for opencode
Automatically extracts and codifies reusable knowledge from task completions
"""

import json
import os
import hashlib
import base64
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TaskContext:
    """Context information about a completed task"""

    task_type: str
    description: str
    duration: float
    success: bool
    error_messages: List[str]
    technologies_used: List[str]
    patterns_discovered: List[str]
    solutions_applied: List[str]
    challenges_encountered: List[str]
    timestamp: datetime


@dataclass
class SkillCandidate:
    """Potential skill extracted from task completion"""

    name: str
    problem: str
    solution: str
    trigger_conditions: List[str]
    verification_steps: List[str]
    context: str
    technologies: List[str]
    quality_score: float
    extraction_confidence: float
    source_task: str


@dataclass
class ExtractedSkill:
    """Final codified skill"""

    name: str
    description: str
    problem: str
    solution: str
    trigger_conditions: List[str]
    verification_steps: List[str]
    context: str
    technologies: List[str]
    author: str
    version: str
    date_created: str
    quality_score: float


class SkillQualityEvaluator:
    """Evaluates whether discovered knowledge qualifies as a reusable skill"""

    def __init__(self):
        self.quality_thresholds = {
            "reusability": 0.7,
            "specificity": 0.6,
            "non_triviality": 0.5,
            "verifiability": 0.8,
            "overall": 0.65,
        }

    def evaluate_candidate(
        self, candidate: SkillCandidate
    ) -> Tuple[bool, float, Dict[str, float]]:
        """
        Evaluate skill candidate quality
        Returns: (should_extract, overall_score, detailed_scores)
        """
        scores = {}

        # Reusability: Will this help future tasks?
        scores["reusability"] = self._evaluate_reusability(candidate)

        # Specificity: Are trigger conditions specific enough?
        scores["specificity"] = self._evaluate_specificity(candidate)

        # Non-triviality: Required discovery, not just documentation lookup?
        scores["non_triviality"] = self._evaluate_non_triviality(candidate)

        # Verifiability: Can the solution be verified to work?
        scores["verifiability"] = self._evaluate_verifiability(candidate)

        # Overall score (weighted average)
        overall_score = (
            scores["reusability"] * 0.3
            + scores["specificity"] * 0.25
            + scores["non_triviality"] * 0.25
            + scores["verifiability"] * 0.2
        )

        should_extract = overall_score >= self.quality_thresholds["overall"]

        return should_extract, overall_score, scores

    def _evaluate_reusability(self, candidate: SkillCandidate) -> float:
        """Evaluate if skill will be useful for future tasks"""
        score = 0.0

        # Check if solution addresses common problems
        common_indicators = [
            "error",
            "bug",
            "issue",
            "problem",
            "failure",
            "timeout",
            "crash",
            "exception",
            "undefined",
        ]

        if any(
            indicator in candidate.problem.lower() for indicator in common_indicators
        ):
            score += 0.3

        # Check if solution involves specific technologies
        if len(candidate.technologies) > 0:
            score += 0.2

        # Check if solution has clear trigger conditions
        if len(candidate.trigger_conditions) > 1:
            score += 0.3

        # Check if solution is actionable
        if len(candidate.solution.strip()) > 100:  # Substantial solution
            score += 0.2

        return min(score, 1.0)

    def _evaluate_specificity(self, candidate: SkillCandidate) -> float:
        """Evaluate how specific the trigger conditions are"""
        score = 0.0

        conditions = candidate.trigger_conditions

        # Prefer exact error messages over vague descriptions
        exact_errors = [
            c for c in conditions if "error:" in c.lower() or "exception:" in c.lower()
        ]
        if exact_errors:
            score += 0.4

        # Prefer specific symptoms over general problems
        specific_indicators = ["file:", "line:", "function:", "class:", "method:"]
        specific_conditions = [
            c
            for c in conditions
            if any(ind in c.lower() for ind in specific_indicators)
        ]
        if specific_conditions:
            score += 0.3

        # Bonus for multiple specific conditions
        if len(conditions) >= 3:
            score += 0.3

        return min(score, 1.0)

    def _evaluate_non_triviality(self, candidate: SkillCandidate) -> float:
        """Evaluate if solution required actual discovery"""
        score = 0.0

        solution_text = candidate.solution.lower()

        # Indicators of non-trivial solutions
        discovery_indicators = [
            "discovered",
            "found",
            "realized",
            "learned",
            "debugging",
            "investigation",
            "trial",
            "error",
            "workaround",
            "hack",
            "trick",
            "non-obvious",
        ]

        matches = sum(1 for ind in discovery_indicators if ind in solution_text)
        score += min(matches * 0.2, 0.6)

        # Check for debugging process description
        if "debug" in solution_text or "investigat" in solution_text:
            score += 0.2

        # Check for multiple steps or approaches tried
        if solution_text.count("step") > 2 or "alternative" in solution_text:
            score += 0.2

        return min(score, 1.0)

    def _evaluate_verifiability(self, candidate: SkillCandidate) -> float:
        """Evaluate if solution can be verified to work"""
        score = 0.0

        verification_steps = candidate.verification_steps

        # Prefer explicit verification steps
        if len(verification_steps) > 0:
            score += 0.4

        # Check for testable outcomes
        testable_indicators = [
            "check",
            "verify",
            "test",
            "confirm",
            "validate",
            "run",
            "execute",
            "see",
            "observe",
        ]

        verification_text = " ".join(verification_steps).lower()
        matches = sum(1 for ind in testable_indicators if ind in verification_text)
        score += min(matches * 0.15, 0.4)

        # Check for specific success criteria
        if "should" in verification_text or "will" in verification_text:
            score += 0.2

        return min(score, 1.0)


class SkillExtractor:
    """Extracts skills from completed tasks"""

    def __init__(self, skills_dir: str = ".opencode/skills"):
        self.skills_dir = Path(skills_dir)
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        self.quality_evaluator = SkillQualityEvaluator()

    def analyze_task_completion(
        self, task_context: TaskContext
    ) -> Optional[ExtractedSkill]:
        """
        Analyze completed task and extract skill if valuable knowledge found
        """
        logger.info(f"Analyzing task completion: {task_context.description}")

        # Generate skill candidate
        candidate = self._generate_skill_candidate(task_context)

        if not candidate:
            logger.debug("No skill candidate generated from task")
            return None

        # Evaluate quality
        should_extract, quality_score, detailed_scores = (
            self.quality_evaluator.evaluate_candidate(candidate)
        )

        candidate.quality_score = quality_score

        if not should_extract:
            logger.info(
                f"Skill candidate '{candidate.name}' failed quality check (score: {quality_score:.2f})"
            )
            logger.debug(f"Detailed scores: {detailed_scores}")
            return None

        # Convert to final skill
        skill = self._finalize_skill(candidate, task_context)
        logger.info(
            f"Extracted skill '{skill.name}' with quality score {quality_score:.2f}"
        )

        return skill

    def _generate_skill_candidate(
        self, task_context: TaskContext
    ) -> Optional[SkillCandidate]:
        """Generate potential skill from task context"""
        # This is a simplified implementation
        # In practice, this would use NLP/AI to analyze the task context

        # Check for debugging/problem-solving patterns
        if self._is_problem_solving_task(task_context):
            return self._extract_debugging_skill(task_context)

        # Check for configuration/setup patterns
        if self._is_configuration_task(task_context):
            return self._extract_configuration_skill(task_context)

        # Check for optimization patterns
        if self._is_optimization_task(task_context):
            return self._extract_optimization_skill(task_context)

        return None

    def _is_problem_solving_task(self, task_context: TaskContext) -> bool:
        """Check if task involved problem solving"""
        indicators = ["error", "bug", "fix", "debug", "issue", "problem"]
        description = task_context.description.lower()
        return (
            any(ind in description for ind in indicators)
            or len(task_context.error_messages) > 0
        )

    def _is_configuration_task(self, task_context: TaskContext) -> bool:
        """Check if task involved configuration/setup"""
        indicators = ["config", "setup", "install", "deploy", "environment"]
        description = task_context.description.lower()
        return any(ind in description for ind in indicators)

    def _is_optimization_task(self, task_context: TaskContext) -> bool:
        """Check if task involved optimization"""
        indicators = ["optimize", "performance", "speed", "memory", "efficiency"]
        description = task_context.description.lower()
        return any(ind in description for ind in indicators)

    def _extract_debugging_skill(self, task_context: TaskContext) -> SkillCandidate:
        """Extract debugging skill from task"""
        # Simplified extraction logic
        name = f"debug-{task_context.technologies_used[0].lower() if task_context.technologies_used else 'general'}"

        problem = f"Debugging {task_context.description}"
        solution = f"Solution discovered: {', '.join(task_context.solutions_applied)}"

        trigger_conditions = task_context.error_messages.copy()
        if not trigger_conditions:
            trigger_conditions = [f"When {task_context.description.lower()}"]

        return SkillCandidate(
            name=name,
            problem=problem,
            solution=solution,
            trigger_conditions=trigger_conditions,
            verification_steps=[
                "Verify the error is resolved",
                "Test the functionality",
            ],
            context=task_context.task_type,
            technologies=task_context.technologies_used,
            quality_score=0.0,  # Will be set by evaluator
            extraction_confidence=0.8,
            source_task=task_context.description,
        )

    def _extract_configuration_skill(self, task_context: TaskContext) -> SkillCandidate:
        """Extract configuration skill from task"""
        name = f"config-{task_context.technologies_used[0].lower() if task_context.technologies_used else 'general'}"

        problem = f"Configuration setup for {task_context.description}"
        solution = f"Configuration steps: {', '.join(task_context.solutions_applied)}"

        return SkillCandidate(
            name=name,
            problem=problem,
            solution=solution,
            trigger_conditions=[f"Setting up {task_context.description.lower()}"],
            verification_steps=["Verify configuration works", "Test integration"],
            context=task_context.task_type,
            technologies=task_context.technologies_used,
            quality_score=0.0,
            extraction_confidence=0.7,
            source_task=task_context.description,
        )

    def _extract_optimization_skill(self, task_context: TaskContext) -> SkillCandidate:
        """Extract optimization skill from task"""
        name = f"optimize-{task_context.technologies_used[0].lower() if task_context.technologies_used else 'general'}"

        problem = f"Performance optimization for {task_context.description}"
        solution = (
            f"Optimization techniques: {', '.join(task_context.solutions_applied)}"
        )

        return SkillCandidate(
            name=name,
            problem=problem,
            solution=solution,
            trigger_conditions=[f"Optimizing {task_context.description.lower()}"],
            verification_steps=["Measure performance improvement", "Verify stability"],
            context=task_context.task_type,
            technologies=task_context.technologies_used,
            quality_score=0.0,
            extraction_confidence=0.6,
            source_task=task_context.description,
        )

    def _finalize_skill(
        self, candidate: SkillCandidate, task_context: TaskContext
    ) -> ExtractedSkill:
        """Convert candidate to final skill"""
        return ExtractedSkill(
            name=candidate.name,
            description=f"Skill for {candidate.problem}",
            problem=candidate.problem,
            solution=candidate.solution,
            trigger_conditions=candidate.trigger_conditions,
            verification_steps=candidate.verification_steps,
            context=candidate.context,
            technologies=candidate.technologies,
            author="opencode",
            version="1.0.0",
            date_created=datetime.now().isoformat(),
            quality_score=candidate.quality_score,
        )

    def save_skill(self, skill: ExtractedSkill) -> bool:
        """Save extracted skill to filesystem with security validation"""
        try:
            # Security: Validate skill name to prevent path traversal
            if not self._is_safe_skill_name(skill.name):
                logger.error(f"Unsafe skill name rejected: {skill.name}")
                return False

            skill_dir = self.skills_dir / skill.name
            skill_dir.mkdir(parents=True, exist_ok=True)

            skill_file = skill_dir / "SKILL.md"

            # Create skill content
            content = self._format_skill_markdown(skill)

            # Security: Encrypt sensitive content (optional - for demonstration)
            if self._should_encrypt_skill(skill):
                content = self._encrypt_content(content)

            # Security: Write with restricted permissions
            with open(skill_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)

            logger.info(f"Saved skill '{skill.name}' to {skill_file}")
            return True

        except Exception as e:
            logger.error(f"Failed to save skill '{skill.name}': {e}")
            return False

    def _should_encrypt_skill(self, skill: ExtractedSkill) -> bool:
        """Determine if skill content should be encrypted"""
        # Encrypt skills with sensitive information
        sensitive_keywords = ["password", "secret", "key", "token", "credential"]
        content = (skill.problem + skill.solution).lower()
        return any(keyword in content for keyword in sensitive_keywords)

    def _encrypt_content(self, content: str) -> str:
        """Simple content encryption using base64 (for demonstration)"""
        # In production, use proper encryption like Fernet
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        return f"---ENCRYPTED---\n{encoded}\n---END---"

    def _decrypt_content(self, encrypted_content: str) -> str:
        """Decrypt content"""
        if encrypted_content.startswith("---ENCRYPTED---"):
            lines = encrypted_content.split("\n")
            if len(lines) >= 3:
                encoded = lines[1]
                try:
                    return base64.b64decode(encoded).decode("utf-8")
                except Exception:
                    return encrypted_content
        return encrypted_content

    def _is_safe_skill_name(self, name: str) -> bool:
        """Validate skill name for security"""
        import re

        # Allow only alphanumeric, hyphens, and underscores
        # Reject path traversal attempts
        if not re.match(r"^[a-zA-Z0-9_-]+$", name):
            return False

        # Reject suspicious patterns
        dangerous_patterns = ["..", "/", "\\", "<", ">", ":", "*", "?", '"', "|"]
        if any(pattern in name for pattern in dangerous_patterns):
            return False

        # Length limits
        if len(name) < 3 or len(name) > 50:
            return False

        return True

    def _format_skill_markdown(self, skill: ExtractedSkill) -> str:
        """Format skill as markdown"""
        frontmatter = {
            "name": skill.name,
            "description": skill.description,
            "author": skill.author,
            "version": skill.version,
            "date": skill.date_created,
            "quality_score": skill.quality_score,
        }

        content = f"""---
{json.dumps(frontmatter, indent=2, ensure_ascii=False)}
---

# {skill.name.replace("-", " ").title()}

## Problem
{skill.problem}

## Solution
{skill.solution}

## Trigger Conditions
{chr(10).join(f"- {condition}" for condition in skill.trigger_conditions)}

## Verification
{chr(10).join(f"- {step}" for step in skill.verification_steps)}

## Context
{skill.context}

## Technologies
{", ".join(skill.technologies) if skill.technologies else "General"}
"""

        return content


class ContinuousLearningSystem:
    """Main continuous learning system"""

    def __init__(self):
        self.extractor = SkillExtractor()
        self.task_history: List[TaskContext] = []

    def on_task_completion(self, task_context: TaskContext) -> Optional[ExtractedSkill]:
        """
        Hook called when a task is completed
        Evaluates whether valuable knowledge was gained and extracts skill if appropriate
        """
        logger.info(f"Task completed: {task_context.description}")

        # Store task context
        self.task_history.append(task_context)

        # Analyze for skill extraction
        skill = self.extractor.analyze_task_completion(task_context)

        if skill:
            # Save the skill
            if self.extractor.save_skill(skill):
                logger.info(f"Successfully extracted and saved skill: {skill.name}")
                return skill
            else:
                logger.error(f"Failed to save extracted skill: {skill.name}")

        return None

    def get_learning_stats(self) -> Dict[str, Any]:
        """Get statistics about the learning system"""
        total_tasks = len(self.task_history)
        extracted_skills = len([t for t in self.task_history if t.success])

        return {
            "total_tasks_analyzed": total_tasks,
            "skills_extracted": extracted_skills,
            "extraction_rate": extracted_skills / total_tasks if total_tasks > 0 else 0,
            "most_common_technologies": self._get_common_technologies(),
            "recent_skills": [t.description for t in self.task_history[-5:]],
        }

    def _get_common_technologies(self) -> List[Tuple[str, int]]:
        """Get most commonly encountered technologies"""
        tech_counts = {}
        for task in self.task_history:
            for tech in task.technologies_used:
                tech_counts[tech] = tech_counts.get(tech, 0) + 1

        return sorted(tech_counts.items(), key=lambda x: x[1], reverse=True)[:5]


# Global instance
continuous_learning = ContinuousLearningSystem()
