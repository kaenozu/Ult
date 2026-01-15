"""
Genetic Breeder: Code-Level Evolution Engine
Selects two 'parent' strategies and uses Gemini to breed a 'child' strategy
combining their best logics while mitigating their shared weaknesses.
"""

import importlib.util
import logging
import os
from datetime import datetime
from typing import List, Optional, Tuple

import google.generativeai as genai

from src.agents.strategy_arena import StrategyArena
from src.evolution.market_simulator import MarketSimulator

logger = logging.getLogger(__name__)


class GeneticBreeder:
    """
    Implements a genetic algorithm at the source code level.
    Uses LLM-based crossover and mutation to evolve trading logic.
    """

    def __init__(self, output_dir: str = "src/strategies/evolved"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.arena = StrategyArena()
        self.simulator = MarketSimulator()
        self._init_gemini()

    def _init_gemini(self):
        """Initializes the Gemini model for code breeding."""
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                self.has_gemini = True
            except Exception as e:
                logger.error(f"Failed to init Gemini for Breeder: {e}")
                self.has_gemini = False
        else:
            self.has_gemini = False

    def run_evolution_cycle(self) -> Optional[str]:
        """Runs a complete selection -> breeding -> validation cycle."""
        if not self.has_gemini:
            logger.warning("Gemini API not configured. Skipping Genetic Breeding.")
            return None

        # 1. Selection (Survival of the Fittest)
        parents = self._select_parents()
        if not parents or len(parents) < 2:
            logger.info("Not enough diverse parents for breeding yet.")
            return None

        p1_name, p1_code = parents[0]
        p2_name, p2_code = parents[1]
        logger.info(f"🧬 Breeding: {p1_name} x {p2_name}")

        # 2. Crossover & Mutation (AI Guided)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        child_class_name = f"GeneticStrategy_{timestamp}"

        try:
            child_code = self._breed_code(p1_code, p2_code, child_class_name)
            if not child_code:
                return None

            # 3. Validation (Stress Test)
            if self._validate_child(child_code, child_class_name):
                filename = f"genetic_{timestamp}.py"
                filepath = os.path.join(self.output_dir, filename)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(child_code)

                logger.info(f"✅ Genetic Child SUCCESS: {filepath}")
                return filepath
            else:
                logger.warning(f"❌ Genetic Child FAILED validation: {child_class_name}")
                return None
        except Exception as e:
            logger.error(f"Error in evolution cycle: {e}")
            return None

    def _select_parents(self) -> List[Tuple[str, str]]:
        """Selects top strategies based on arena weight."""
        weights = self.arena.get_weights()
        if not weights:
            return []

        # Select top performing ones
        sorted_strats = sorted(weights.items(), key=lambda x: x[1], reverse=True)
        candidates = [name for name, _ in sorted_strats[:5]]  # Top 5

        selected = []
        search_dirs = ["src/strategies", "src/strategies/custom", "src/strategies/evolved"]

        for name in candidates:
            code = self._find_code_by_class(name, search_dirs)
            if code:
                selected.append((name, code))
                if len(selected) >= 2:
                    break

        return selected

    def _find_code_by_class(self, class_name: str, search_dirs: List[str]) -> Optional[str]:
        """Locates source code for a given class name."""
        for d in search_dirs:
            if not os.path.exists(d):
                continue
            for f in os.listdir(d):
                if f.endswith(".py"):
                    try:
                        with open(os.path.join(d, f), "r", encoding="utf-8") as file:
                            content = file.read()
                            if f"class {class_name}" in content:
                                return content
                    except BaseException:
                        continue
        return None

    def _breed_code(self, p1_code: str, p2_code: str, child_name: str) -> Optional[str]:
        """Uses Gemini to synthesize a new strategy from two parents."""
        prompt = f"""
        あなたはシニア・アルゴリズム・エンジニアです。
        以下の2つの優れた「親戦略」のコードを融合させ、さらに優れた「子戦略」を生成してください。

        【親戦略 1】
        {p1_code}

        【親戦略 2】
        {p2_code}

        【指示】
        1. 両者のロジックの強みを組み合わせ、相補的なエントリー・エグジット条件を構築してください。
        2. 新しい戦略のクラス名は `{child_name}` にしてください。
        3. `base.py` の `Strategy` クラスを継承し、`generate_signals` メソッドを実装してください。
        4. ロジックは複雑にせず、堅牢性を重視してください。

        出力はPythonコードのみ（Markdownなし）にしてください。
        """
        response = self.model.generate_content(prompt)
        return response.text.replace("```python", "").replace("```", "").strip()

    def _validate_child(self, code: str, class_name: str) -> bool:
        """Stress tests the child strategy in a simulated environment."""
        tmp_path = "tmp_breeding_test.py"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(code)

            spec = importlib.util.spec_from_file_location("tmp_module", tmp_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            strategy_class = getattr(module, class_name)
            strategy_inst = strategy_class()

            # Run Stress Test simulator
            results = self.simulator.run_stress_test(strategy_inst)

            # Criteria: 50% success across scenarios or specific bear market survival
            bear_perf = results.get("Bear Market", {}).get("total_return", -100)
            return bear_perf > -15.0  # Stop-loss effectiveness check

        except Exception as e:
            logger.error(f"Child validation error: {e}")
            return False
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
