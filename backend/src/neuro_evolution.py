"""
Neuro-Evolution Engine - 人工知能遺伝的進化
遺伝的アルゴリズムを用いて最強の取引パラメータを進化させる
"""

import json
import logging
import os
import random
from typing import Any, Dict

import pandas as pd

from src.vector_backtester import get_vector_backtester

logger = logging.getLogger(__name__)


class NeuroEvolutionEngine:
    """進化計算エンジン"""

    def __init__(self, population_size: int = 50, mutation_rate: float = 0.1):
        self.pop_size = population_size
        self.mutation_rate = mutation_rate
        self.generation = 0
        self.population = []  # List of gene dicts
        self.population = []  # List of gene dicts
        self.backtester = get_vector_backtester()
        self.best_gene_path = "models/best_gene.json"

    def save_best_gene(self, gene: Dict, score: float):
        """最良個体を保存"""
        try:
            os.makedirs("models", exist_ok=True)
            data = {
                "gene": gene,
                "score": score,
                "generation": self.generation,
                "timestamp": pd.Timestamp.now().isoformat(),
            }
            with open(self.best_gene_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save best gene: {e}")

    def load_best_gene(self) -> Dict:
        """最良個体を読み込み"""
        try:
            if os.path.exists(self.best_gene_path):
                with open(self.best_gene_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return data.get("gene", {})
        except Exception as e:
            logger.error(f"Failed to load best gene: {e}")
        return {}

    def initialize_population(self):
        """初期個体群の生成"""
        self.population = []

        # 1. Standard Gene (Seed) - ベースラインを確保
        standard_gene = {
            "rsi_buy_threshold": 30,
            "rsi_sell_threshold": 70,
            "sma_short_window": 20,
            "sma_long_window": 50,
            "stop_loss_pct": 0.05,
            "take_profit_pct": 0.10,
        }
        self.population.append(standard_gene)

        # 2. Random Genes
        for _ in range(self.pop_size - 1):
            gene = {
                "rsi_buy_threshold": random.randint(20, 50),
                "rsi_sell_threshold": random.randint(50, 80),
                "sma_short_window": random.randint(5, 50),
                "sma_long_window": random.randint(50, 200),
                "stop_loss_pct": random.uniform(0.01, 0.10),
                "take_profit_pct": random.uniform(0.01, 0.20),
            }
            self.population.append(gene)
        self.generation = 0
        logger.info(f"Initialized population of {self.pop_size} agents (includes Seed).")

    def fitness_function(self, gene: Dict, data: pd.DataFrame) -> float:
        """適応度関数: Sharpe Ratio重視"""
        result = self.backtester.run_strategy(data, gene)
        sharpe = result.get("sharpe_ratio", -1.0)
        ret = result.get("total_return", -1.0)

        # 評価基準: シャープレシオ + リターンボーナス
        # ただしトレード回数が極端に少ない(0回等)場合はペナルティ
        trades = result.get("trades", 0)
        if trades < 5:
            return -1.0

        score = sharpe + (ret * 0.5)
        return score

    def crossover(self, parent1: Dict, parent2: Dict) -> Dict:
        """交叉 (一様交叉)"""
        child = {}
        for key in parent1.keys():
            if random.random() > 0.5:
                child[key] = parent1[key]
            else:
                child[key] = parent2[key]
        return child

    def mutate(self, gene: Dict) -> Dict:
        """突然変異"""
        mutated = gene.copy()
        for key in gene.keys():
            if random.random() < self.mutation_rate:
                # パラメータごとに変異ロジックを変えるべきだが、簡易的にランダム再設定
                if "threshold" in key:
                    mutated[key] = random.randint(20, 80)
                elif "window" in key:
                    mutated[key] = random.randint(5, 200)
                elif "pct" in key:
                    mutated[key] = random.uniform(0.01, 0.20)
        return mutated

    def evolve(self, data: pd.DataFrame) -> Dict[str, Any]:
        """1世代進化させる"""
        if not self.population:
            self.initialize_population()

        # 1. 評価
        scored_population = []
        for gene in self.population:
            score = self.fitness_function(gene, data)
            scored_population.append((score, gene))

        # ソート（スコア高い順）
        scored_population.sort(key=lambda x: x[0], reverse=True)

        best_score = scored_population[0][0]
        best_gene = scored_population[0][1]

        logger.info(f"Gen {self.generation}: Best Score {best_score:.4f}")

        # 2. 選択 (エリート保存 + ルーレット選択 or トーナメント)
        # エリート保存: 上位 20%
        elite_count = int(self.pop_size * 0.2)
        next_gen = [ind[1] for ind in scored_population[:elite_count]]

        # 3. 交配と変異
        while len(next_gen) < self.pop_size:
            # 親を選択（上位50%からランダム）
            parents_pool = scored_population[: int(self.pop_size * 0.5)]
            p1 = random.choice(parents_pool)[1]
            p2 = random.choice(parents_pool)[1]

            child = self.crossover(p1, p2)
            child = self.mutate(child)
            next_gen.append(child)

        self.population = next_gen
        self.generation += 1

        # Save best gene if it's good enough
        if best_score > 0:
            self.save_best_gene(best_gene, best_score)

        return {
            "generation": self.generation,
            "best_score": best_score,
            "best_gene": best_gene,
        }

    def run_evolution(self, data: pd.DataFrame, generations: int = 10):
        """指定世代数ループ実行"""
        history = []
        for _ in range(generations):
            res = self.evolve(data)
            history.append(res)

        return history


# シングルトン
_evo_engine = None


def get_neuro_evolution_engine() -> NeuroEvolutionEngine:
    global _evo_engine
    if _evo_engine is None:
        _evo_engine = NeuroEvolutionEngine()
    return _evo_engine
