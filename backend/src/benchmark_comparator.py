"""
Benchmark Comparator - ベンチマーク比較分析

日経225、S&P500等との比較分析
"""

import logging
from typing import Dict

import numpy as np
import pandas as pd
import yfinance as yf

try:
    from sklearn.metrics import roc_auc_score
except ImportError:
    roc_auc_score = None


class BenchmarkComparator:
    """ベンチマーク比較クラス"""

    BENCHMARKS = {"nikkei225": "^N225", "sp500": "^GSPC", "topix": "^TPX", "nasdaq": "^IXIC"}

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.benchmark_data = {}

    def fetch_benchmark_data(self, benchmark_name: str, period: str = "1y") -> pd.DataFrame:
        """
        ベンチマークデータを取得

        Args:
            benchmark_name: ベンチマーク名
            period: 期間

        Returns:
            価格データ
        """
        ticker = self.BENCHMARKS.get(benchmark_name)
        if not ticker:
            return pd.DataFrame()

        try:
            # yfinance.Tickerを優先して呼び出し、モックしやすくする
            ticker_client = yf.Ticker(ticker)
            data = ticker_client.history(period=period)
            if data is None or data.empty:
                data = yf.download(ticker, period=period, progress=False)

            if data is None or data.empty:
                self.logger.warning("No benchmark data fetched for %s", benchmark_name)
                return pd.DataFrame()

            self.benchmark_data[benchmark_name] = data
            return data
        except Exception as e:
            self.logger.error(f"Failed to fetch {benchmark_name}: {e}")
            return pd.DataFrame()

    def calculate_active_return(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """
        アクティブリターンを計算

        Args:
            portfolio_returns: ポートフォリオのリターン
            benchmark_returns: ベンチマークのリターン

        Returns:
            アクティブリターン（年率）
        """
        # 累積リターン
        portfolio_cumulative = (1 + portfolio_returns).prod() - 1
        benchmark_cumulative = (1 + benchmark_returns).prod() - 1

        # 年率化
        days = len(portfolio_returns)
        years = days / 252

        portfolio_annual = (1 + portfolio_cumulative) ** (1 / years) - 1
        benchmark_annual = (1 + benchmark_cumulative) ** (1 / years) - 1

        active_return = portfolio_annual - benchmark_annual

        return active_return

    def calculate_information_ratio(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """
        情報比率（Information Ratio）を計算

        アクティブリターン / トラッキングエラー

        Args:
            portfolio_returns: ポートフォリオのリターン
            benchmark_returns: ベンチマークのリターン

        Returns:
            情報比率
        """
        # アクティブリターン
        active_returns = portfolio_returns - benchmark_returns

        # 平均アクティブリターン
        mean_active = active_returns.mean() * 252  # 年率化

        # トラッキングエラー（アクティブリターンの標準偏差）
        tracking_error = active_returns.std() * np.sqrt(252)  # 年率化

        if tracking_error == 0:
            return 0

        information_ratio = mean_active / tracking_error

        return information_ratio

    def calculate_beta(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """
        ベータ（β）を計算

        市場の動きに対するポートフォリオの感応度

        Args:
            portfolio_returns: ポートフォリオのリターン
            benchmark_returns: ベンチマークのリターン

        Returns:
            ベータ値
        """
        # 共分散 / 分散
        covariance = np.cov(portfolio_returns, benchmark_returns)[0][1]
        variance = np.var(benchmark_returns)

        if variance == 0:
            return 1.0

        beta = covariance / variance

        return beta

    def calculate_alpha(
        self, portfolio_returns: pd.Series, benchmark_returns: pd.Series, risk_free_rate: float = 0.001
    ) -> float:
        """
        アルファ（α）を計算

        CAPM理論に基づく超過リターン

        Args:
            portfolio_returns: ポートフォリオのリターン
            benchmark_returns: ベンチマークのリターン
            risk_free_rate: リスクフリーレート

        Returns:
            アルファ値（年率）
        """
        beta = self.calculate_beta(portfolio_returns, benchmark_returns)

        # ポートフォリオの年率リターン
        portfolio_annual = portfolio_returns.mean() * 252

        # ベンチマークの年率リターン
        benchmark_annual = benchmark_returns.mean() * 252

        # α = Rp - [Rf + β(Rm - Rf)]
        expected_return = risk_free_rate + beta * (benchmark_annual - risk_free_rate)
        alpha = portfolio_annual - expected_return

        return alpha

    def calculate_sharpe_ratio(self, returns: pd.Series, risk_free_rate: float = 0.001) -> float:
        """
        シャープレシオを計算 (Rp - Rf) / Sigma
        """
        if returns.empty:
            return 0.0

        excess_returns = returns - (risk_free_rate / 252)
        mean_excess = excess_returns.mean() * 252
        std_dev = returns.std() * np.sqrt(252)

        if std_dev < 1e-9:
            return 0.0

        return mean_excess / std_dev

    def calculate_auc(self, y_true: np.ndarray, y_score: np.ndarray) -> float:
        """
        AUC (Area Under Curve) を計算
        Args:
            y_true: 正解ラベル (0 or 1)
            y_score: 予測スコア (確率など)
        """
        if roc_auc_score is None:
            self.logger.warning("sklearn not installed, cannot calculate AUC")
            return 0.5

        try:
            # Drop NaNs if any aligned
            mask = ~np.isnan(y_true) & ~np.isnan(y_score)
            if not mask.any():
                return 0.5

            y_true_clean = y_true[mask]
            y_score_clean = y_score[mask]

            # AUC requires at least 2 classes
            if len(np.unique(y_true_clean)) < 2:
                return 0.5

            return roc_auc_score(y_true_clean, y_score_clean)
        except Exception as e:
            self.logger.error(f"Error calculating AUC: {e}")
            return 0.5

    def generate_comparison_report(self, portfolio_returns: pd.Series, benchmark_name: str = "nikkei225") -> Dict:
        """
        包括的な比較レポートを生成

        Args:
            portfolio_returns: ポートフォリオのリターン
            benchmark_name: ベンチマーク名

        Returns:
            比較レポート
        """
        # ベンチマークデータ取得
        benchmark_data = self.fetch_benchmark_data(benchmark_name)

        if benchmark_data.empty or "Close" not in benchmark_data.columns:
            return {}

        # ベンチマークリターン計算
        benchmark_returns = benchmark_data["Close"].pct_change().dropna()

        # 期間を合わせる
        common_index = portfolio_returns.index.intersection(benchmark_returns.index)
        if common_index.empty:
            return {}

        portfolio_aligned = portfolio_returns.loc[common_index]
        benchmark_aligned = benchmark_returns.loc[common_index]

        # 各指標計算
        active_return = self.calculate_active_return(portfolio_aligned, benchmark_aligned)
        info_ratio = self.calculate_information_ratio(portfolio_aligned, benchmark_aligned)
        beta = self.calculate_beta(portfolio_aligned, benchmark_aligned)
        alpha = self.calculate_alpha(portfolio_aligned, benchmark_aligned)

        # 累積リターン
        portfolio_cumulative = (1 + portfolio_aligned).prod() - 1
        benchmark_cumulative = (1 + benchmark_aligned).prod() - 1

        return {
            "benchmark_name": benchmark_name,
            "active_return": active_return * 100,  # %
            "information_ratio": info_ratio,
            "beta": beta,
            "alpha": alpha * 100,  # %
            "portfolio_return": portfolio_cumulative * 100,  # %
            "benchmark_return": benchmark_cumulative * 100,  # %
            "outperformance": (active_return > 0),
            "interpretation": self._interpret_metrics(alpha, info_ratio, beta),
        }

    def _interpret_metrics(self, alpha: float, info_ratio: float, beta: float) -> str:
        """
        指標の解釈を返す

        Args:
            alpha: アルファ値
            info_ratio: 情報比率
            beta: ベータ値

        Returns:
            解釈文
        """
        interpretation = []

        if alpha > 0:
            interpretation.append(f"✅ プラスアルファ（+{alpha*100:.2f}%）- ベンチマークを上回る")
        else:
            interpretation.append(f"❌ マイナスアルファ（{alpha*100:.2f}%）- ベンチマーク未達")

        if info_ratio > 0.5:
            interpretation.append("✅ 高い情報比率 - 効率的な運用")
        elif info_ratio > 0:
            interpretation.append("🟡 中程度の情報比率")
        else:
            interpretation.append("❌ 低い情報比率")

        if beta < 0.8:
            interpretation.append("🛡️ 低ベータ - 守りの運用")
        elif beta > 1.2:
            interpretation.append("⚡ 高ベータ - 攻めの運用")
        else:
            interpretation.append("➡️ 中程度のベータ")

        return "\n".join(interpretation)


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    comparator = BenchmarkComparator()

    print("=== Benchmark Comparator Test ===\n")

    # ダミーデータ
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=252)
    portfolio_returns = pd.Series(np.random.randn(252) * 0.015 + 0.0005, index=dates)

    # レポート生成
    report = comparator.generate_comparison_report(portfolio_returns, "nikkei225")

    if report:
        print(f"ベンチマーク: {report['benchmark_name']}")
        print(f"アクティブリターン: {report['active_return']:.2f}%")
        print(f"情報比率: {report['information_ratio']:.2f}")
        print(f"ベータ: {report['beta']:.2f}")
        print(f"アルファ: {report['alpha']:.2f}%\n")
        print("解釈:")
        print(report["interpretation"])
