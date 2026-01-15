"""
Parallel Backtester - マルチプロセス対応バックテスト
複数銘柄・複数戦略を並列実行して高速化
"""

import time
from multiprocessing import Pool, cpu_count
from typing import Dict, List

import pandas as pd


class ParallelBacktester:
    """並列バックテストエンジン"""

    def __init__(self, n_jobs: int = None):
        """
        Args:
            n_jobs: 並列実行数（Noneの場合はCPU数）
        """
        self.n_jobs = n_jobs or max(1, cpu_count() - 1)

    def run_parallel_backtest(
        self,
        tickers: List[str],
        strategies: List,
        data_map: Dict[str, pd.DataFrame],
        **kwargs,
    ) -> pd.DataFrame:
        """
        並列バックテスト実行

        Args:
            tickers: 銘柄リスト
            strategies: 戦略リスト
            data_map: 価格データ
            **kwargs: バックテストパラメータ

        Returns:
            結果DataFrame
        """
        # タスク生成
        tasks = []
        for ticker in tickers:
            if ticker not in data_map:
                continue
            for strategy in strategies:
                tasks.append((ticker, strategy, data_map[ticker], kwargs))

        # 並列実行
        with Pool(processes=self.n_jobs) as pool:
            results = pool.starmap(self._run_single_backtest, tasks)

        # 結果を集約
        if results:
            return pd.DataFrame(results)
        else:
            return pd.DataFrame()

    @staticmethod
    def _run_single_backtest(ticker: str, strategy, data: pd.DataFrame, params: Dict) -> Dict:
        """
        単一バックテスト実行

        Args:
            ticker: 銘柄
            strategy: 戦略
            data: 価格データ
            params: パラメータ

        Returns:
            結果辞書
        """
        try:
            # シグナル生成
            signals = strategy.generate_signals(data)

            # バックテスト実行
            from src.backtester import Backtester

            backtester = Backtester(
                initial_capital=params.get("initial_capital", 1000000),
                commission=params.get("commission", 0.001),
            )

            result = backtester.run(data, signals)

            return {
                "ticker": ticker,
                "strategy": strategy.__class__.__name__,
                "total_return": result.get("total_return", 0),
                "sharpe_ratio": result.get("sharpe_ratio", 0),
                "max_drawdown": result.get("max_drawdown", 0),
                "win_rate": result.get("win_rate", 0),
                "num_trades": result.get("num_trades", 0),
            }
        except Exception as e:
            return {
                "ticker": ticker,
                "strategy": strategy.__class__.__name__,
                "error": str(e),
            }

    def run_walk_forward_parallel(
        self,
        tickers: List[str],
        strategy,
        data_map: Dict[str, pd.DataFrame],
        train_size: int = 252,
        test_size: int = 63,
        **kwargs,
    ) -> pd.DataFrame:
        """
        ウォークフォワード分析（並列）

        Args:
            tickers: 銘柄リスト
            strategy: 戦略
            data_map: 価格データ
            train_size: 訓練期間（日数）
            test_size: テスト期間（日数）
            **kwargs: パラメータ

        Returns:
            結果DataFrame
        """
        tasks = []

        for ticker in tickers:
            if ticker not in data_map:
                continue

            data = data_map[ticker]

            # ウォークフォワードウィンドウ生成
            for i in range(0, len(data) - train_size - test_size, test_size):
                train_data = data.iloc[i : i + train_size]
                test_data = data.iloc[i + train_size : i + train_size + test_size]

                tasks.append((ticker, strategy, train_data, test_data, i, kwargs))

        # 並列実行
        with Pool(processes=self.n_jobs) as pool:
            results = pool.starmap(self._run_walk_forward_window, tasks)

        return pd.DataFrame(results)

    @staticmethod
    def _run_walk_forward_window(
        ticker: str,
        strategy,
        train_data: pd.DataFrame,
        test_data: pd.DataFrame,
        window_idx: int,
        params: Dict,
    ) -> Dict:
        """ウォークフォワードウィンドウ実行"""
        try:
            # 訓練
            strategy.fit(train_data)

            # テスト
            signals = strategy.generate_signals(test_data)

            from src.backtester import Backtester

            backtester = Backtester(initial_capital=params.get("initial_capital", 1000000))

            result = backtester.run(test_data, signals)

            return {
                "ticker": ticker,
                "window": window_idx,
                "train_start": train_data.index[0],
                "train_end": train_data.index[-1],
                "test_start": test_data.index[0],
                "test_end": test_data.index[-1],
                "return": result.get("total_return", 0),
                "sharpe": result.get("sharpe_ratio", 0),
            }
        except Exception as e:
            return {"ticker": ticker, "window": window_idx, "error": str(e)}


def benchmark_backtest_speed():
    """バックテスト速度ベンチマーク"""
    from src.data_loader import fetch_stock_data
    from src.strategies import SMACrossoverStrategy

    # テストデータ
    tickers = ["7203.T", "9984.T", "6758.T", "8035.T", "6861.T"]
    data_map = fetch_stock_data(tickers, period="2y")

    strategies = [SMACrossoverStrategy() for _ in range(3)]

    # シングルスレッド
    start = time.time()
    results_single = []
    for ticker in tickers:
        if ticker in data_map:
            for strategy in strategies:
                result = ParallelBacktester._run_single_backtest(ticker, strategy, data_map[ticker], {})
                results_single.append(result)
    single_time = time.time() - start

    # マルチプロセス
    start = time.time()
    backtester = ParallelBacktester()
    backtester.run_parallel_backtest(tickers, strategies, data_map)
    parallel_time = time.time() - start

    print(f"Single-threaded: {single_time:.2f}s")
    print(f"Multi-process: {parallel_time:.2f}s")
    print(f"Speedup: {single_time / parallel_time:.2f}x")


if __name__ == "__main__":
    benchmark_backtest_speed()
