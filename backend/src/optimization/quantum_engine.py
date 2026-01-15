"""
Quantum Hybrid Optimization Engine
擬似量子アニーリングを用いたポートフォリオ最適化エンジン
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

class QuantumAnnealer:
    """擬似量子アニーリングを用いた最適化クラス"""

    def __init__(self, temperature_start: float = 100.0, cooling_rate: float = 0.99, steps: int = 1000):
        self.temp_start = temperature_start
        self.cooling_rate = cooling_rate
        self.steps = steps

    def solve_qubo(
        self, 
        matrix: np.ndarray, 
        target_count: Optional[int] = None,
        penalty: float = 10.0
    ) -> np.ndarray:
        """
        QUBO (Quadratic Unconstrained Binary Optimization) を擬似アニーリングで解く
        
        Args:
            matrix: QUBO行列 (n x n)
            target_count: 選択する銘柄数 (Noneの場合は制限なし)
            penalty: 制約違反に対するペナルティ
            
        Returns:
            選択された銘柄のバイナリ配列
        """
        n = matrix.shape[0]
        # 初期状態: ランダムなバイナリ
        state = np.random.randint(0, 2, n)
        
        def calculate_energy(s):
            energy = s @ matrix @ s
            if target_count is not None:
                energy += penalty * (np.sum(s) - target_count) ** 2
            return energy
            
        current_energy = calculate_energy(state)
        best_state = state.copy()
        best_energy = current_energy
        
        temp = self.temp_start
        all_rand = np.random.rand(self.steps)
        
        for i in range(self.steps):
            # 1ビット反転
            idx = np.random.randint(0, n)
            new_state = state.copy()
            new_state[idx] = 1 - new_state[idx]
            
            new_energy = calculate_energy(new_state)
            delta_e = new_energy - current_energy
            
            if delta_e < 0 or all_rand[i] < np.exp(-delta_e / temp):
                state = new_state
                current_energy = new_energy
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_state = state.copy()
            
            temp *= self.cooling_rate
            
        return best_state

    def solve_portfolio_optimization(
        self, 
        expected_returns: pd.Series, 
        cov_matrix: pd.DataFrame, 
        risk_aversion: float = 0.5,
        num_assets_to_select: Optional[int] = None
    ) -> Dict[str, float]:
        """
        ポートフォリオの最適配分をベクトル演算で高速に算出する
        """
        tickers = expected_returns.index.tolist()
        n = len(tickers)
        
        # 期待リターンと共分散をnumpyに変換
        mu = expected_returns.values
        sigma = cov_matrix.values
        
        # 初期状態
        weights = np.random.dirichlet(np.ones(n))
        best_weights = weights.copy()
        
        # 目的関数をベクトル化
        def calculate_energy_batch(w_batch):
            # w_batch: (n,) or (batch_size, n)
            risks = np.dot(w_batch, np.dot(sigma, w_batch.T))
            if w_batch.ndim > 1:
                risks = np.diag(risks)
            returns = np.dot(w_batch, mu)
            return risk_aversion * risks - (1 - risk_aversion) * returns

        current_energy = calculate_energy_batch(weights)
        best_energy = current_energy
        
        temp = self.temp_start
        
        # 乱数を一括生成してループ内のオーバーヘッドを削減
        all_rand = np.random.rand(self.steps)
        all_changes = np.random.uniform(0, 0.05, self.steps)
        all_indices = np.random.choice(n, (self.steps, 2))

        for i in range(self.steps):
            # 近傍探索: 重みを少しだけ動かす
            new_weights = weights.copy()
            idx1, idx2 = all_indices[i]
            change = all_changes[i] * weights[idx1]
            
            new_weights[idx1] -= change
            new_weights[idx2] += change
            
            # 制約: 重みの合計は1、かつ各重みは0以上 (ベクトル演算で正規化)
            new_weights = np.maximum(0, new_weights)
            s = np.sum(new_weights)
            if s > 0:
                new_weights /= s
            
            new_energy = calculate_energy_batch(new_weights)
            
            # 遷移確率の計算 (メトロポリス法)
            delta_e = new_energy - current_energy
            if delta_e < 0 or all_rand[i] < np.exp(-delta_e / temp):
                weights = new_weights
                current_energy = new_energy
                
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_weights = weights.copy()
            
            # 冷却
            temp *= self.cooling_rate
            
        # 結果を辞書形式に変換 (0.01以下の微小な値を排除して再正規化)
        result = {tickers[i]: float(best_weights[i]) for i in range(n) if best_weights[i] > 0.01}
        total = sum(result.values())
        if total > 0:
            result = {k: v / total for k, v in result.items()}
            
        logger.info(f"Quantum Optimization (Vectorized) completed. Best energy: {best_energy:.6f}")
        return result

class QuantumPortfolioOptimizer:
    """量子ハイブリッド最適化マネージャー"""
    
    def __init__(self):
        self.annealer = QuantumAnnealer()

    def get_optimized_allocation(self, data_map: Dict[str, pd.DataFrame]) -> Dict[str, float]:
        """
        最新データから量子最適化された配分を取得する
        """
        return self.solve_hybrid_optimization(data_map)

    def solve_hybrid_optimization(
        self, 
        data_map: Dict[str, pd.DataFrame], 
        risk_aversion: float = 0.5,
        target_assets: int = 10
    ) -> Dict[str, float]:
        """
        ハイブリッド最適化: 
        1. 擬似量子アニーリングによる銘柄選択 (Discrete Selection)
        2. 連続値最適化による重み配分 (Weight Allocation)
        """
        if not data_map:
            return {}

        # データ準備
        returns_dict = {}
        for ticker, df in data_map.items():
            if not df.empty and 'Close' in df.columns:
                returns_dict[ticker] = df['Close'].pct_change().dropna()
        
        returns_df = pd.DataFrame(returns_dict).dropna()
        if returns_df.empty:
            return {t: 1.0/len(data_map) for t in data_map.keys()}

        mu = returns_df.mean().values * 252
        sigma = returns_df.cov().values * 252
        tickers = returns_df.columns.tolist()
        n = len(tickers)

        # 1. 銘柄選択 (QUBO)
        # Q = risk_aversion * sigma - (1 - risk_aversion) * diag(mu)
        Q = risk_aversion * sigma - np.diag((1 - risk_aversion) * mu)
        
        # ターゲット数が銘柄数より多い場合は調整
        k = min(target_assets, n)
        
        selected_binary = self.annealer.solve_qubo(Q, target_count=k)
        selected_indices = np.where(selected_binary == 1)[0]
        
        if len(selected_indices) == 0:
            # 万が一何も選択されなかった場合は全銘柄
            selected_indices = np.arange(n)
            
        selected_tickers = [tickers[i] for i in selected_indices]
        
        # 2. 重み配分 (選択された銘柄のみで連続値最適化)
        sub_returns = returns_df[selected_tickers]
        
        # 既存の solve_portfolio_optimization を利用して重みを決定
        sub_expected = sub_returns.mean() * 252
        sub_cov = sub_returns.cov() * 252
        
        allocation = self.annealer.solve_portfolio_optimization(
            sub_expected, 
            sub_cov, 
            risk_aversion=risk_aversion
        )
        
        logger.info(f"Hybrid Optimization completed: Selected {len(selected_tickers)} assets.")
        return allocation

if __name__ == "__main__":
    # シンプルなテスト
    tickers = ["AAPL", "GOOGL", "MSFT", "AMZN"]
    returns = pd.Series([0.15, 0.12, 0.18, 0.10], index=tickers)
    cov = pd.DataFrame(np.eye(4) * 0.05, index=tickers, columns=tickers)
    
    optimizer = QuantumPortfolioOptimizer()
    result = optimizer.annealer.solve_portfolio_optimization(returns, cov)
    print("Optimization Result:", result)
