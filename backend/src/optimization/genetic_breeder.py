import random
import numpy as np
import pandas as pd
from typing import List, Dict, Any
import logging
from dataclasses import dataclass
import copy

logger = logging.getLogger(__name__)


@dataclass
class StrategyDNA:
    """戦略の遺伝子情報"""

    name: str
    rsi_period: int = 14
    rsi_lower: int = 30
    rsi_upper: int = 70
    sma_short: int = 5
    sma_long: int = 25
    bb_window: int = 20
    bb_dev: float = 2.0
    stop_loss_pct: float = 0.05
    take_profit_pct: float = 0.10
    fitness: float = 0.0  # 評価スコア（勝率やシャープレシオ）
    generation: int = 0
    parents: str = "Genesis"


class GeneticStrategyBreeder:
    """
    遺伝的アルゴリズムを用いて最強の戦略パラメータを探索するブリーダー
    """

    def __init__(self, population_size: int = 20, mutation_rate: float = 0.1):
        self.population_size = population_size
        self.mutation_rate = mutation_rate
        self.population: List[StrategyDNA] = []
        self.generation_count = 0

    def initialize_population(self):
        """初期個体群をランダム生成"""
        self.population = []
        for i in range(self.population_size):
            dna = StrategyDNA(
                name=f"Gen0_Unit_{i:03d}",
                rsi_period=random.randint(5, 30),
                rsi_lower=random.randint(15, 45),
                rsi_upper=random.randint(55, 85),
                sma_short=random.randint(3, 20),
                sma_long=random.randint(20, 100),
                bb_window=random.randint(10, 50),
                bb_dev=round(random.uniform(1.5, 3.0), 1),
                stop_loss_pct=round(random.uniform(0.01, 0.10), 2),
                take_profit_pct=round(random.uniform(0.05, 0.30), 2),
                generation=0,
            )
            # SMA整合性チェック
            if dna.sma_short >= dna.sma_long:
                dna.sma_long = dna.sma_short + 5
            self.population.append(dna)

        logger.info(f"Initialized genetic population size: {self.population_size}")

    def evaluate_fitness(self, dna: StrategyDNA) -> float:
        """
        適応度評価関数（実データバックテスト版）
        """
        from src.data_loader import fetch_stock_data
        from src.backtesting.fast_engine import FastBacktester

        # データのロード（キャッシュされるので高速）
        # 評価基準としてトヨタ(7203)とソフトバンク(9984)を使用
        tickers = ["7203.T", "9984.T"]
        data_map = fetch_stock_data(tickers, period="6mo")

        total_score = 0

        for ticker in tickers:
            df = data_map.get(ticker)
            if df is None or df.empty:
                continue

            tester = FastBacktester(df)
            result = tester.run_simulation(dna)

            # スコアリングロジック
            # 利益重視だが、取引回数が極端に少ない(まぐれ)場合はペナルティ
            pnl_score = result["pnl"] / 10000  # 1万円利益につき1点
            win_rate_score = result["win_rate"] * 0.5

            # 取引回数ボーナス（適度な取引を推奨）
            activity_bonus = 0
            if result["trades"] > 5:
                activity_bonus = 10
            elif result["trades"] == 0:
                activity_bonus = -50

            ticker_score = pnl_score + win_rate_score + activity_bonus
            total_score += ticker_score

        # 平均スコア
        final_score = total_score / len(tickers)

        # 0.0 ~ 100.0 の範囲に正規化（簡易的）
        dna.fitness = max(0.0, min(100.0, 50 + final_score))
        return dna.fitness

    def crossover(self, parent1: StrategyDNA, parent2: StrategyDNA) -> StrategyDNA:
        """二つの親から新しい子を作成（交配）"""
        child_name = f"Gen{self.generation_count+1}_Child_{random.randint(1000,9999)}"

        # 遺伝子の各要素を50%の確率でどちらかの親から継承
        child = StrategyDNA(
            name=child_name,
            rsi_period=random.choice([parent1.rsi_period, parent2.rsi_period]),
            rsi_lower=random.choice([parent1.rsi_lower, parent2.rsi_lower]),
            rsi_upper=random.choice([parent1.rsi_upper, parent2.rsi_upper]),
            sma_short=random.choice([parent1.sma_short, parent2.sma_short]),
            sma_long=random.choice([parent1.sma_long, parent2.sma_long]),
            bb_window=random.choice([parent1.bb_window, parent2.bb_window]),
            bb_dev=random.choice([parent1.bb_dev, parent2.bb_dev]),
            stop_loss_pct=random.choice([parent1.stop_loss_pct, parent2.stop_loss_pct]),
            take_profit_pct=random.choice([parent1.take_profit_pct, parent2.take_profit_pct]),
            generation=self.generation_count + 1,
            parents=f"{parent1.name} + {parent2.name}",
        )

        # 整合性補正
        if child.sma_short >= child.sma_long:
            child.sma_long = child.sma_short + 5

        return child

    def mutate(self, dna: StrategyDNA):
        """突然変異：一定確率でパラメータをランダムに変更"""
        if random.random() < self.mutation_rate:
            dna.rsi_period = random.randint(5, 30)
            dna.name += "_Mutated"
        if random.random() < self.mutation_rate:
            dna.stop_loss_pct = round(random.uniform(0.01, 0.10), 2)

    def run_generation(self):
        """一世代を進める"""
        # 1. 全個体の評価
        for dna in self.population:
            self.evaluate_fitness(dna)

        # 2. 淘汰（スコア順にソート）
        self.population.sort(key=lambda x: x.fitness, reverse=True)

        # エリート保存（上位20%はそのまま残る）
        elite_count = int(self.population_size * 0.2)
        next_gen = self.population[:elite_count]

        # 3. 交配と変異で次世代を埋める
        while len(next_gen) < self.population_size:
            # 上位50%から親を選ぶ
            parent1 = random.choice(self.population[: self.population_size // 2])
            parent2 = random.choice(self.population[: self.population_size // 2])

            child = self.crossover(parent1, parent2)
            self.mutate(child)
            next_gen.append(child)

        self.population = next_gen
        self.generation_count += 1

        best = self.population[0]
        logger.info(f"Generation {self.generation_count} Complete. Best Fitness: {best.fitness:.1f}")
        return self.population
