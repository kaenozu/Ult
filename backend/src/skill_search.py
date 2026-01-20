"""
Semantic Skill Search and Auto-loading System
Automatically finds and loads relevant skills based on task context
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Set
import logging
import re
from collections import defaultdict

logger = logging.getLogger(__name__)


class SkillSearchEngine:
    """Semantic search engine for skills"""

    def __init__(self, skills_dir: str = ".opencode/skills"):
        self.skills_dir = Path(skills_dir)
        self.skill_index: Dict[str, Dict] = {}
        self._build_index()

    def _build_index(self):
        """Build search index from available skills"""
        self.skill_index = {}

        if not self.skills_dir.exists():
            logger.warning(f"Skills directory not found: {self.skills_dir}")
            return

        for skill_dir in self.skills_dir.iterdir():
            if skill_dir.is_dir():
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    try:
                        skill_data = self._parse_skill_file(skill_file)
                        if skill_data:
                            self.skill_index[skill_data["name"]] = skill_data
                    except Exception as e:
                        logger.error(f"Error parsing skill {skill_dir.name}: {e}")

        logger.info(f"Indexed {len(self.skill_index)} skills")

    def _parse_skill_file(self, skill_file: Path) -> Optional[Dict]:
        """Parse skill markdown file"""
        try:
            with open(skill_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Extract frontmatter
            if not content.startswith("---"):
                return None

            frontmatter_end = content.find("---", 3)
            if frontmatter_end == -1:
                return None

            frontmatter_text = content[3:frontmatter_end].strip()
            frontmatter = json.loads(frontmatter_text)

            # Extract content sections
            body = content[frontmatter_end + 3 :].strip()

            # Parse sections
            sections = self._parse_markdown_sections(body)

            return {
                "name": frontmatter.get("name", ""),
                "description": frontmatter.get("description", ""),
                "problem": sections.get("Problem", ""),
                "solution": sections.get("Solution", ""),
                "trigger_conditions": sections.get("Trigger Conditions", ""),
                "technologies": frontmatter.get("technologies", []),
                "quality_score": frontmatter.get("quality_score", 0.0),
                "file_path": str(skill_file),
            }

        except Exception as e:
            logger.error(f"Error parsing skill file {skill_file}: {e}")
            return None

    def _parse_markdown_sections(self, content: str) -> Dict[str, str]:
        """Parse markdown sections"""
        sections = {}
        lines = content.split("\n")
        current_section = None
        current_content = []

        for line in lines:
            if line.startswith("## "):
                # Save previous section
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()
                # Start new section
                current_section = line[3:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)

        # Save last section
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        return sections

    def search_skills(
        self, query: str, context: Dict = None, limit: int = 5
    ) -> List[Tuple[Dict, float]]:
        """
        Search for relevant skills based on query and context
        Returns: List of (skill_data, relevance_score) tuples
        """
        if not self.skill_index:
            return []

        query_lower = query.lower()
        results = []

        for skill_name, skill_data in self.skill_index.items():
            score = self._calculate_relevance_score(
                skill_data, query_lower, context or {}
            )
            if score > 0:
                results.append((skill_data, score))

        # Sort by relevance score (descending)
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:limit]

    def _calculate_relevance_score(
        self, skill_data: Dict, query: str, context: Dict
    ) -> float:
        """Calculate relevance score for a skill against query and context"""
        score = 0.0

        # Exact matches in description (highest weight)
        description = skill_data.get("description", "").lower()
        if query in description:
            score += 1.0

        # Keyword matches in description
        query_words = set(query.split())
        desc_words = set(description.split())
        keyword_matches = len(query_words.intersection(desc_words))
        score += keyword_matches * 0.3

        # Problem section matches
        problem = skill_data.get("problem", "").lower()
        if query in problem:
            score += 0.8
        problem_matches = len(query_words.intersection(set(problem.split())))
        score += problem_matches * 0.2

        # Trigger conditions matches
        triggers = skill_data.get("trigger_conditions", "").lower()
        if query in triggers:
            score += 0.7
        trigger_matches = len(query_words.intersection(set(triggers.split())))
        score += trigger_matches * 0.15

        # Technology context matches
        technologies = set(skill_data.get("technologies", []))
        context_tech = set(context.get("technologies", []))
        tech_matches = len(technologies.intersection(context_tech))
        score += tech_matches * 0.4

        # Quality score bonus
        quality = skill_data.get("quality_score", 0.5)
        score *= 0.8 + quality * 0.4  # Quality between 0.8-1.2 multiplier

        # Error-specific patterns get higher scores
        if self._is_error_related(query):
            score *= 1.2

        return score

    def _is_error_related(self, query: str) -> bool:
        """Check if query is error-related"""
        error_indicators = [
            "error",
            "exception",
            "fail",
            "bug",
            "issue",
            "problem",
            "crash",
            "timeout",
            "undefined",
            "null",
            "cannot",
        ]
        return any(indicator in query for indicator in error_indicators)

    def find_best_skill(self, query: str, context: Dict = None) -> Optional[Dict]:
        """Find the single best matching skill"""
        results = self.search_skills(query, context, limit=1)
        return results[0][0] if results else None

    def get_skill_content(self, skill_name: str) -> Optional[str]:
        """Get full skill content by name"""
        skill_data = self.skill_index.get(skill_name)
        if not skill_data:
            return None

        skill_file = skill_data.get("file_path")
        if not skill_file or not Path(skill_file).exists():
            return None

        try:
            with open(skill_file, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading skill file {skill_file}: {e}")
            return None

    def refresh_index(self):
        """Refresh the skill index"""
        logger.info("Refreshing skill index...")
        self._build_index()


class AutoSkillLoader:
    """Automatically loads relevant skills based on task context"""

    def __init__(self, search_engine: SkillSearchEngine):
        self.search_engine = search_engine
        self.loaded_skills: Set[str] = set()
        self.skill_cache: Dict[str, str] = {}

    def analyze_task_context(
        self, task_description: str, context: Dict = None
    ) -> List[Dict]:
        """
        Analyze task context and return relevant skills to load
        """
        if not context:
            context = {}

        # Search for relevant skills
        relevant_skills = self.search_engine.search_skills(task_description, context)

        # Filter by minimum relevance threshold
        min_threshold = 0.3
        filtered_skills = [
            skill_data
            for skill_data, score in relevant_skills
            if score >= min_threshold
        ]

        # Mark as loaded (in real implementation, this would actually load them)
        for skill in filtered_skills:
            skill_name = skill.get("name", "")
            if skill_name and skill_name not in self.loaded_skills:
                self.loaded_skills.add(skill_name)
                logger.info(f"Auto-loaded skill: {skill_name}")

        return filtered_skills

    def get_loaded_skills(self) -> List[str]:
        """Get list of currently loaded skill names"""
        return list(self.loaded_skills)

    def unload_skill(self, skill_name: str):
        """Unload a specific skill"""
        if skill_name in self.loaded_skills:
            self.loaded_skills.remove(skill_name)
            logger.info(f"Unloaded skill: {skill_name}")

    def clear_loaded_skills(self):
        """Clear all loaded skills"""
        count = len(self.loaded_skills)
        self.loaded_skills.clear()
        logger.info(f"Cleared {count} loaded skills")


# Global instances
skill_search = SkillSearchEngine()
auto_loader = AutoSkillLoader(skill_search)


def search_relevant_skills(query: str, technologies: List[str] = None) -> List[Dict]:
    """
    Convenience function to search for relevant skills
    """
    context = {"technologies": technologies or []}
    return auto_loader.analyze_task_context(query, context)


def get_skill_details(skill_name: str) -> Optional[str]:
    """
    Get detailed content of a specific skill
    """
    return skill_search.get_skill_content(skill_name)


def refresh_skill_index():
    """
    Refresh the skill search index
    """
    skill_search.refresh_index()
