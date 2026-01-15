"""
シナリオ分析とストレステストモジュール

- モテカルロシミュレーション
- 歴史的イベントテスト
- リットフォリオシミュレーション
"""

import logging
import warnings
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.covariance import LedoitWolf

from .base_predictor import BasePredictor

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class HistoricalScenarioAnalyzer:
    """歴史的シナリオアナライザー"""

    def __init__(self):
        self.historical_events = {
            "2008_crisis": {
                "start": "2008-01-01",
                "end": "2009-06-30",
                "description": "リーマンショック",
                "market_impact": -0.5,  # 平均的な市場下落率
            },
            "2020_covid": {
                "start": "2020-02-20",
                "end": "2020-03-23",
                "description": "新型コロナウイルスパンデミック",
                "market_impact": -0.35,  # 短期的な急落
            },
            "2000_dotcom": {
                "start": "2000-03-10",
                "end": "2002-10-09",
                "description": "ITバブル崩壊",
                "market_impact": -0.6,  # 長期的な下落
            },
            "1987_crash": {
                "start": "1987-10-19",
                "end": "1987-10-20",
                "description": "ブラックマンデー",
                "market_impact": -0.25,  # 1日での急落
            },
        }

    def get_historical_data(self, ticker: str, period: str = "5y") -> pd.DataFrame:
        """履歴データの取得"""
        try:
            data = yf.download(ticker, period=period, interval="1d")
            return data
        except Exception as e:
            logger.error(f"Failed to download data for {ticker}: {e}")
            return pd.DataFrame()

    def analyze_historical_event_impact(self, ticker: str, event_name: str) -> Dict[str, Any]:
        """歴史的イベントの銘柄への影響分析"""
        if event_name not in self.historical_events:
            return {}

        event = self.historical_events[event_name]
        data = self.get_historical_data(ticker, "max")

        if data.empty:
            return {}

        # イベント期間のデータを抽出
        event_start = pd.to_datetime(event["start"])
        event_end = pd.to_datetime(event["end"])

        event_data = data[(data.index >= event_start) & (data.index <= event_end)]

        if event_data.empty:
            return {}

        # 価格変動の分析
        start_price = data[data.index < event_start]["Close"].iloc[-1] if len(data[data.index < event_start]) > 0 else 0
        end_price = event_data["Close"].iloc[-1] if len(event_data) > 0 else 0
        peak_price = event_data["High"].max() if len(event_data) > 0 else start_price
        trough_price = event_data["Low"].min() if len(event_data) > 0 else start_price

        if start_price > 0:
            event_return = (end_price - start_price) / start_price
            max_drawdown = (trough_price - start_price) / start_price
            peak_to_trough = (trough_price - peak_price) / peak_price
        else:
            event_return = 0
            max_drawdown = 0
            peak_to_trough = 0

        return {
            "ticker": ticker,
            "event_name": event_name,
            "event_description": event["description"],
            "event_period": f"{event_start.date()} to {event_end.date()}",
            "start_price": start_price,
            "end_price": end_price,
            "peak_price": peak_price,
            "trough_price": trough_price,
            "event_return": event_return,
            "max_drawdown_during_event": max_drawdown,
            "peak_to_trough": peak_to_trough,
            "volatility_during_event": event_data["Close"].pct_change().std() if len(event_data) > 1 else 0,
        }

    def compare_current_to_historical(self, ticker: str, current_data: pd.DataFrame) -> Dict[str, Any]:
        """現在の市場状況と歴史的イベントの比較"""
        # 直近のリターンを計算
        if len(current_data) < 30:
            return {}

        recent_returns = current_data["Close"].pct_change().tail(30).dropna()
        current_volatility = recent_returns.std()
        current_return_30d = (current_data["Close"].iloc[-1] / current_data["Close"].iloc[-30]) - 1

        comparison_results = {}

        for event_name, event_info in self.historical_events.items():
            historical_event = self.analyze_historical_event_impact(ticker, event_name)

            if historical_event:
                similarity_score = self._calculate_similarity(
                    current_return_30d,
                    current_volatility,
                    historical_event["event_return"],
                    historical_event["volatility_during_event"],
                )

                comparison_results[event_name] = {
                    "similarity_score": similarity_score,
                    "current_metrics": {
                        "return_30d": current_return_30d,
                        "volatility_30d": current_volatility,
                    },
                    "historical_metrics": {
                        "return": historical_event["event_return"],
                        "volatility": historical_event["volatility_during_event"],
                    },
                }

        return comparison_results

    def _calculate_similarity(self, curr_ret: float, curr_vol: float, hist_ret: float, hist_vol: float) -> float:
        """類似度の計算（単純化）"""
        # 簡単なユークリッド距離の逆数
        distance = np.sqrt((curr_ret - hist_ret) ** 2 + (curr_vol - hist_vol) ** 2)
        similarity = 1 / (1 + distance)
        return similarity


class MonteCarloSimulator:
    """モンテカルロシミュレータ"""

    def __init__(self, n_simulations: int = 10000, confidence_level: float = 0.05):
        self.n_simulations = n_simulations
        self.confidence_level = confidence_level

    def simulate_single_asset(
        self,
        initial_price: float,
        expected_return: float,
        volatility: float,
        time_horizon: int,
        time_steps: int = 252,
    ) -> np.ndarray:
        """単一資産の価格シミュレーション（GBM）"""
        dt = time_horizon / time_steps
        price_paths = np.zeros((self.n_simulations, time_steps + 1))
        price_paths[:, 0] = initial_price

        for t in range(1, time_steps + 1):
            # ラプロセス
            dW = np.random.normal(0, np.sqrt(dt), self.n_simulations)
            dS = expected_return * price_paths[:, t - 1] * dt + volatility * price_paths[:, t - 1] * dW
            price_paths[:, t] = price_paths[:, t - 1] + dS

        return price_paths

    def simulate_portfolio(
        self,
        weights: np.ndarray,
        expected_returns: np.ndarray,
        covariance_matrix: np.ndarray,
        initial_prices: np.ndarray,
        time_horizon: int,
        time_steps: int = 252,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """ポートフォリオの価格シミュレーション"""
        dt = time_horizon / time_steps
        n_assets = len(weights)
        portfolio_paths = np.zeros((self.n_simulations, time_steps + 1))

        # 各資産の価格パス
        asset_paths = np.zeros((self.n_simulations, n_assets, time_steps + 1))

        for i in range(n_assets):
            asset_paths[:, i, 0] = initial_prices[i]

        for t in range(1, time_steps + 1):
            # ラ関行列の平方根を計算（コレスキー分解）
            try:
                L = np.linalg.cholesky(covariance_matrix * dt)
            except BaseException:
                # 正定値でない場合はレドイット=ウルフ推定器を使用
                lw = LedoitWolf()
                lw.fit(np.random.multivariate_normal(expected_returns, covariance_matrix, 1000))
                L = np.linalg.cholesky(lw.covariance_ * dt)

            # 標準正規乱数
            z = np.random.normal(0, 1, (self.n_simulations, n_assets))
            correlated_shocks = np.dot(z, L.T)

            # 各資産価格の変化
            for i in range(n_assets):
                dS = (
                    expected_returns[i] * asset_paths[:, i, t - 1] * dt
                    + asset_paths[:, i, t - 1] * correlated_shocks[:, i]
                )
                asset_paths[:, i, t] = asset_paths[:, i, t - 1] + dS

        # ポ合ポートフォリオ価値
        for t in range(time_steps + 1):
            portfolio_values = np.sum(asset_paths[:, :, t] * weights, axis=1)
            portfolio_paths[:, t] = portfolio_values

        return portfolio_paths, asset_paths

    def analyze_simulation_results(self, price_paths: np.ndarray) -> Dict[str, Any]:
        """シミュレーション結果の分析"""
        final_prices = price_paths[:, -1]

        # 基本統計
        mean_final_price = np.mean(final_prices)
        median_final_price = np.median(final_prices)
        std_final_price = np.std(final_prices)

        # 量子
        var_5p = np.percentile(final_prices, self.confidence_level * 100)
        var_95p = np.percentile(final_prices, (1 - self.confidence_level) * 100)

        # ドーダーン（最大ドローダン）
        max_drawdowns = []
        for path in price_paths:
            running_max = np.maximum.accumulate(path)
            drawdown = (path - running_max) / running_max
            max_drawdowns.append(np.min(drawdown))

        avg_max_drawdown = np.mean(max_drawdowns)

        # 勝率
        initial_price = price_paths[0, 0]  # 最初のパスの最初の価格を基準に
        win_rate = np.mean(final_prices > initial_price)

        return {
            "mean_final_price": mean_final_price,
            "median_final_price": median_final_price,
            "std_final_price": std_final_price,
            "var_5p": var_5p,  # 5% VaR
            "var_95p": var_95p,  # 95% VaR
            "expected_shortfall": np.mean(final_prices[final_prices <= var_5p]),  # ES
            "max_drawdown_avg": avg_max_drawdown,
            "win_rate": win_rate,
            "total_simulations": self.n_simulations,
            "price_paths": price_paths,
        }


class StressTestAnalyzer:
    """ストレステストアナライザー"""

    def __init__(self):
        self.scenario_multipliers = {
            "base_case": 1.0,
            "moderate_stress": 0.7,  # 30%下落
            "severe_stress": 0.5,  # 50%下落
            "extreme_stress": 0.2,  # 80%下落
        }

    def apply_stress_scenarios(
        self, baseline_returns: np.ndarray, scenarios: List[str] = None
    ) -> Dict[str, np.ndarray]:
        """ストレステストシナリオの適用"""
        if scenarios is None:
            scenarios = ["base_case", "moderate_stress", "severe_stress"]

        stressed_returns = {}

        for scenario in scenarios:
            if scenario in self.scenario_multipliers:
                multiplier = self.scenario_multipliers[scenario]
                # リターンにシナリオ乗数を適用（単純化）
                stressed_rets = baseline_returns * multiplier
                stressed_returns[scenario] = stressed_rets
            else:
                logger.warning(f"Unknown scenario: {scenario}")

        return stressed_returns

    def portfolio_stress_test(
        self,
        portfolio_weights: np.ndarray,
        asset_returns: np.ndarray,
        scenarios: List[str] = None,
    ) -> Dict[str, Dict[str, float]]:
        """ポートフォリオに対するストレステスト"""
        if scenarios is None:
            scenarios = [
                "base_case",
                "moderate_stress",
                "severe_stress",
                "extreme_stress",
            ]

        results = {}

        for scenario in scenarios:
            if scenario in self.scenario_multipliers:
                multiplier = self.scenario_multipliers[scenario]

                # 各資産リターンをシナリオ乗数で調整
                stressed_asset_returns = asset_returns * multiplier

                # ポ合リターンの計算
                portfolio_returns = np.dot(stressed_asset_returns, portfolio_weights)

                # 指標の計算
                mean_return = np.mean(portfolio_returns)
                volatility = np.std(portfolio_returns)
                var_5p = np.percentile(portfolio_returns, 5)
                var_95p = np.percentile(portfolio_returns, 95)

                results[scenario] = {
                    "mean_return": mean_return,
                    "volatility": volatility,
                    "var_5p": var_5p,
                    "var_95p": var_95p,
                    "sharpe_ratio": mean_return / (volatility + 1e-8) if volatility > 0 else 0.0,
                    "max_drawdown": self._calculate_max_drawdown(portfolio_returns),
                }

        return results

    def _calculate_max_drawdown(self, returns: np.ndarray) -> float:
        """最大ドローダンの計算"""
        cumulative_returns = np.concatenate([[0], np.cumprod(1 + returns)])
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdown = (cumulative_returns - running_max) / (running_max + 1e-8)
        return np.min(drawdown) if len(drawdown) > 0 else 0.0

    def generate_stress_test_report(self, stress_results: Dict[str, Dict[str, float]]) -> str:
        """ストレステストレポートの生成"""
        report = ["=== ストレステストレポート ===", ""]

        for scenario, metrics in stress_results.items():
            report.append(f"{scenario}:")
            for metric_name, value in metrics.items():
                report.append(f"  {metric_name}: {value:.4f}")
            report.append("")

        return "\n".join(report)


class ScenarioBasedPredictor(BasePredictor):
    """シナリオベース予測器"""

    def __init__(self, base_predictor: Any = None):
        self.base_predictor = base_predictor
        self.historical_analyzer = HistoricalScenarioAnalyzer()
        self.monte_carlo_simulator = MonteCarloSimulator()
        self.monte_carlo_simulator = MonteCarloSimulator()
        self.stress_tester = StressTestAnalyzer()

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X: np.ndarray) -> np.ndarray:
        """標準的な予測インターフェース (X: 特徴量行列)"""
        # Xがデータフレームの場合は値を抽出
        if isinstance(X, pd.DataFrame):
            X = X.values

        # 予測の実行（単一の入力またはバッチに対応）
        if X.ndim == 1:
            X = X.reshape(1, -1)

        # ダミーの現在データを生成（実際にはより適切なデータが必要）
        # シナリオ分析には時系列データが必要なため、簡易的なデータフレームを作成
        ticker = "INDEX"
        dummy_data = pd.DataFrame(
            {
                "Close": [100.0] * 252,
                "High": [105.0] * 252,
                "Low": [95.0] * 252,
                "Open": [100.0] * 252,
                "Volume": [1000000] * 252,
            }
        )

        results = []
        for i in range(len(X)):
            res = self.predict_with_scenarios(ticker, dummy_data, prediction_days=5)
            # base_prediction の最初の値（翌日予測）を返す
            results.append(res["base_prediction"][0])

        return np.array(results)

    def predict_with_scenarios(
        self, ticker: str, current_data: pd.DataFrame, prediction_days: int = 30
    ) -> Dict[str, Any]:
        """シナリオを考慮した予測"""
        # 基本予測
        if hasattr(self.base_predictor, "predict"):
            base_features = self._prepare_features(current_data)
            base_predictions = (
                self.base_predictor.predict([base_features]) if len(base_features) > 0 else [0.0] * prediction_days
            )
        else:
            base_predictions = [0.01] * prediction_days  # ダミー

        # モテカルロシミュレーションでの予測範囲
        initial_price = current_data["Close"].iloc[-1]
        expected_return = np.mean(current_data["Close"].pct_change().tail(252))  # 年間リターン
        volatility = current_data["Close"].pct_change().std() * np.sqrt(252)  # 年間ボラティリティ

        mc_paths = self.monte_carlo_simulator.simulate_single_asset(
            initial_price=initial_price,
            expected_return=expected_return / 252,  # 日次リターン
            volatility=volatility / np.sqrt(252),  # 日次ボラティリティ
            time_horizon=prediction_days / 252,
            time_steps=prediction_days,
        )

        # シミュレーション結果の分析
        mc_analysis = self.monte_carlo_simulator.analyze_simulation_results(mc_paths)

        # 歴史的イベントとの比較
        historical_comparison = self.historical_analyzer.compare_current_to_historical(ticker, current_data)

        # シナリオベースのリスク評価
        scenario_risk_assessment = self._assess_scenario_risks(current_data, mc_analysis)

        return {
            "base_prediction": base_predictions,
            "monte_carlo_analysis": mc_analysis,
            "historical_comparisons": historical_comparison,
            "scenario_risk_assessment": scenario_risk_assessment,
            "prediction_days": prediction_days,
            "tickers_affected": [ticker],
        }

    def _prepare_features(self, data: pd.DataFrame) -> List[float]:
        """特徴量の準備"""
        if data.empty:
            return [0.0] * 10  # ダミー特徴量

        features = []

        # 価格関連
        features.append(data["Close"].iloc[-1])
        features.append(data["Close"].pct_change().iloc[-1])  # 前日比

        # 技術指標（移動平均）
        if len(data) >= 5:
            features.append(data["Close"].rolling(5).mean().iloc[-1] / data["Close"].iloc[-1] - 1)
        else:
            features.append(0.0)

        if len(data) >= 20:
            features.append(data["Close"].rolling(20).mean().iloc[-1] / data["Close"].iloc[-1] - 1)
        else:
            features.append(0.0)

        # ボラティリティ
        if len(data) >= 10:
            features.append(data["Close"].pct_change().rolling(10).std().iloc[-1])
        else:
            features.append(0.0)

        # 長さを10に統一（不足分は0で埋める）
        while len(features) < 10:
            features.append(0.0)

        return features[:10]

    def _assess_scenario_risks(self, current_data: pd.DataFrame, mc_analysis: Dict) -> Dict[str, float]:
        """シナリオリスクの評価"""
        current_volatility = current_data["Close"].pct_change().std()
        current_price_level = current_data["Close"].iloc[-1] / current_data["Close"].rolling(252).mean().iloc[-1]

        # 現在の市場状況が不安定かどうか
        is_high_volatility = current_volatility > current_data["Close"].pct_change().rolling(252).std().quantile(0.8)
        is_overvalued = current_price_level > 1.2  # 長期平均の120%以上

        # シナリオリスクスコア
        scenario_risk_score = 0.0
        if is_high_volatility:
            scenario_risk_score += 0.3
        if is_overvalued:
            scenario_risk_score += 0.2
        if mc_analysis["var_5p"] < mc_analysis["mean_final_price"] * 0.95:  # 5%VaRが平均の95%以下
            scenario_risk_score += 0.5

        scenario_risk_score = min(1.0, scenario_risk_score)

        return {
            "current_volatility_level": current_volatility,
            "relative_price_level": current_price_level,
            "is_high_volatility_regime": is_high_volatility,
            "is_possible_overvaluation": is_overvalued,
            "scenario_risk_score": scenario_risk_score,
            "var_warning_level": (
                mc_analysis["var_5p"] / mc_analysis["mean_final_price"] if mc_analysis["mean_final_price"] > 0 else 0.0
            ),
        }

    def run_portfolio_scenario_analysis(
        self,
        assets_returns: Dict[str, np.ndarray],
        portfolio_weights: Dict[str, float],
        n_simulations: int = 5000,
    ) -> Dict[str, Any]:
        """ポートフォリオシナリオ分析"""
        # 必要なデータを準備
        asset_list = list(assets_returns.keys())
        weights_array = np.array([portfolio_weights.get(asset, 0.0) for asset in asset_list])

        # 共分散行列の計算
        returns_df = pd.DataFrame(assets_returns)
        cov_matrix = returns_df.cov().values

        # 期待リターンの計算
        expected_returns = returns_df.mean().values

        # 初合価格（ダミー）
        initial_prices = np.array([100.0] * len(asset_list))  # 仮の初期価格

        # モテカルロシミュレーション
        mc_simulator = MonteCarloSimulator(n_simulations=n_simulations)
        portfolio_paths, asset_paths = mc_simulator.simulate_portfolio(
            weights=weights_array,
            expected_returns=expected_returns,
            covariance_matrix=cov_matrix,
            initial_prices=initial_prices,
            time_horizon=1.0,  # 1年
            time_steps=252,
        )

        portfolio_analysis = mc_simulator.analyze_simulation_results(portfolio_paths)

        # ストレステスト
        stress_results = self.stress_tester.portfolio_stress_test(
            portfolio_weights=weights_array, asset_returns=returns_df.values
        )

        return {
            "portfolio_monte_carlo_analysis": portfolio_analysis,
            "portfolio_stress_test_results": stress_results,
            "asset_correlation_matrix": returns_df.corr().to_dict(),
            "simulated_asset_paths": asset_paths,
            "portfolio_weights_used": portfolio_weights,
        }


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # モック予測器
    class MockPredictor:
        def predict(self, X):
            return [0.01, 0.015, 0.005, 0.02, 0.012]  # 5ステップの予測

    mock_predictor = MockPredictor()

    # シナリオ分析予測器のテスト
    scenario_predictor = ScenarioBasedPredictor(mock_predictor)

    # サンプルデータの作成
    dates = pd.date_range(start="2023-01-01", end="2023-12-31", freq="D")
    sample_data = pd.DataFrame(
        {
            "Open": 100 + np.cumsum(np.random.normal(0, 1, len(dates))),
            "High": 100 + np.cumsum(np.random.normal(0, 1, len(dates))) + 0.5,
            "Low": 100 + np.cumsum(np.random.normal(0, 1, len(dates))) - 0.5,
            "Close": 100 + np.cumsum(np.random.normal(0, 1, len(dates))),
            "Volume": np.random.randint(1000000, 5000000, len(dates)),
        },
        index=dates,
    )

    # シナリオ予測の実行
    result = scenario_predictor.predict_with_scenarios("TEST.T", sample_data, prediction_days=5)

    print("Scenario-based Prediction Results:")
    print(f"Base prediction: {result['base_prediction']}")
    print(f"Scenario risk score: {result['scenario_risk_assessment']['scenario_risk_score']}")
    print(f"Historical comparisons: {list(result['historical_comparisons'].keys())}")

    # モテカルロ分析の結果
    mc_result = result["monte_carlo_analysis"]
    print(f"Monte Carlo - Mean final price: {mc_result['mean_final_price']:.2f}")
    print(f"Monte Carlo - VaR 5%: {mc_result['var_5p']:.2f}")
    print(f"Monte Carlo - Win rate: {mc_result['win_rate']:.2f}")

    # ポ合シナリオ分析のテスト
    assets_returns = {
        "Asset1": np.random.normal(0.001, 0.02, 252),
        "Asset2": np.random.normal(0.0005, 0.015, 252),
        "Asset3": np.random.normal(0.0015, 0.025, 252),
    }
    portfolio_weights = {"Asset1": 0.4, "Asset2": 0.3, "Asset3": 0.3}

    portfolio_result = scenario_predictor.run_portfolio_scenario_analysis(
        assets_returns, portfolio_weights, n_simulations=1000
    )

    print("\nPortfolio scenario analysis completed")
    print(f"Portfolio VaR 5%: {portfolio_result['portfolio_monte_carlo_analysis']['var_5p']:.4f}")
    print(f"Portfolio stress test results: {list(portfolio_result['portfolio_stress_test_results'].keys())}")

    print("Scenario analysis and stress test components test completed.")
