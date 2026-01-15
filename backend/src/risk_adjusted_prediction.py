"""
リスク調整予測モジュール

- ベイズ的不確実性推定
- VaRとCVaRの統合
- リスク調整リターン最適化
"""

import logging
import warnings
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from tensorflow import keras


warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class BayesianUncertaintyEstimator:
    """ベイズ的不確実性推定器"""

    def __init__(self, model: Any, n_samples: int = 100):
        self.model = model
        self.n_samples = n_samples
        self.is_monte_carlo_dropout = False

        # モックドロップアウトを使用可能か確認
        if isinstance(model, keras.Model):
            self._check_monte_carlo_dropout()

    def _check_monte_carlo_dropout(self):
        """モデルがモンテカルロドロップアウトをサポートしているか確認"""
        for layer in self.model.layers:
            if "dropout" in layer.name.lower():
                self.is_monte_carlo_dropout = True
                break

    def estimate_uncertainty(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """不確実性の推定"""
        predictions = []

        if self.is_monte_carlo_dropout and isinstance(self.model, keras.Model):
            # モックドロップアウトによる不確実性推定
            for _ in range(self.n_samples):
                pred = self.model(X, training=True)  # training=Trueでドロップアウトを有効化
                predictions.append(pred.numpy())
        else:
            # モックサンプリングによる不確実性推定（RandomForest等）
            if hasattr(self.model, "predict"):
                for _ in range(self.n_samples):
                    # モックサンプルの予測（各推定器から）
                    if hasattr(self.model, "estimators_"):
                        # RandomForestの場合
                        pred = np.array([estimator.predict(X) for estimator in self.model.estimators_])
                        pred = np.mean(pred, axis=0)
                    else:
                        # その他のモデル
                        pred = self.model.predict(X)

                    predictions.append(pred)
            else:
                # 予測ができない場合は0で埋める
                predictions = [np.zeros(X.shape[0])] * self.n_samples

        predictions = np.array(predictions)

        # 平均と不確実性（標準偏差）を計算
        mean_pred = np.mean(predictions, axis=0)
        uncertainty = np.std(predictions, axis=0)

        return mean_pred, uncertainty

    def get_prediction_interval(
        self, X: np.ndarray, confidence_level: float = 0.95
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """予測区間の計算"""
        mean_pred, uncertainty = self.estimate_uncertainty(X)

        # 信頼区間のz値
        z_score = stats.norm.ppf((1 + confidence_level) / 2)

        lower_bound = mean_pred - z_score * uncertainty
        upper_bound = mean_pred + z_score * uncertainty

        return mean_pred, lower_bound, upper_bound


class ValueAtRiskCalculator:
    """VaR (Value at Risk) 計算器"""

    def __init__(self, confidence_level: float = 0.95):
        self.confidence_level = confidence_level
        self.historical_returns = []

    def fit(self, returns: np.ndarray):
        """履歴リターンに基づいてVaRを計算準備"""
        if isinstance(returns, pd.Series):
            returns = returns.values
        self.historical_returns = returns
        return self

    def calculate_var_historical(self) -> float:
        """履歴的VaRの計算"""
        if self.historical_returns is None or len(self.historical_returns) == 0:
            return 0.0

        # 指定信頼水準の分位数
        var = np.percentile(self.historical_returns, (1 - self.confidence_level) * 100)
        return var

    def calculate_var_parametric(self, mean: float = 0.0, std: float = 1.0) -> float:
        """パラメトリックVaRの計算（正規分布仮定）"""
        z_score = stats.norm.ppf(1 - self.confidence_level)
        var = mean + std * z_score
        return var

    def calculate_var_monte_carlo(self, n_simulations: int = 10000) -> float:
        """モンテカルロVaRの計算"""
        if self.historical_returns is None or len(self.historical_returns) == 0:
            return 0.0

        # 履歴リターンからサンプリング
        simulated_returns = np.random.choice(self.historical_returns, size=n_simulations)
        var = np.percentile(simulated_returns, (1 - self.confidence_level) * 100)
        return var


class ConditionalValueAtRiskCalculator:
    """CVaR (Conditional Value at Risk) 計算器"""

    def __init__(self, confidence_level: float = 0.95):
        self.confidence_level = confidence_level

    def calculate_cvar_historical(self, returns: np.ndarray) -> float:
        """履歴的CVaRの計算"""
        if isinstance(returns, pd.Series):
            returns = returns.values

        var = np.percentile(returns, (1 - self.confidence_level) * 100)

        # VaR以下のリターンの平均
        tail_losses = returns[returns <= var]
        if len(tail_losses) == 0:
            return var  # VaR以下がなければVaRを返す

        cvar = np.mean(tail_losses)
        return cvar

    def calculate_cvar_parametric(self, mean: float = 0.0, std: float = 1.0) -> float:
        """パラメトリックCVaRの計算（正規分布仮定）"""
        z_alpha = stats.norm.ppf(1 - self.confidence_level)

        # 正規分布のCVaR式
        cvar = mean - std * stats.norm.pdf(z_alpha) / (1 - self.confidence_level)
        return cvar


class RiskAdjustedPredictor:
    """リスク調整予測器"""

    def __init__(self, base_predictor: Any = None, risk_free_rate: float = 0.02):
        self.base_predictor = base_predictor
        self.risk_free_rate = risk_free_rate
        self.uncertainty_estimator = BayesianUncertaintyEstimator(base_predictor)
        self.var_calculator = ValueAtRiskCalculator()
        self.var_calculator = ValueAtRiskCalculator()
        self.cvar_calculator = ConditionalValueAtRiskCalculator()

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

        # ダミーの過去リターンデータを生成（実際にはより適切なデータが必要）
        returns_data = np.random.normal(0.001, 0.02, 252)

        results = []
        for i in range(len(X)):
            res = self.predict_with_risk_adjustment(X[i], returns_data)
            # risk_adjusted_prediction の最初の値（翌日予測）を返す
            results.append(res["risk_adjusted_prediction"][0])

        return np.array(results)

    def predict_with_risk_adjustment(
        self, X: np.ndarray, returns_data: np.ndarray, investment_horizon: int = 5
    ) -> Dict[str, Any]:
        """リスク調整予測"""
        # 基本予測
        if hasattr(self.base_predictor, "predict"):
            base_prediction = self.base_predictor.predict(X)
        else:
            base_prediction = np.array([0.01] * investment_horizon)  # ダミー

        # 不確実性推定
        (
            mean_pred,
            lower_bound,
            upper_bound,
        ) = self.uncertainty_estimator.get_prediction_interval(X)

        # VaRとCVaRの計算（履歴リターンに基づく）
        self.var_calculator.fit(returns_data)
        historical_var = self.var_calculator.calculate_var_historical()
        historical_cvar = self.cvar_calculator.calculate_cvar_historical(returns_data)

        # シャープ比の計算（リスク調整リターン）
        expected_return = float(np.mean(base_prediction)) if len(base_prediction) > 0 else 0.0
        portfolio_volatility = float(np.std(returns_data)) if len(returns_data) > 1 else 0.01  # 0割防止

        if portfolio_volatility > 0:
            sharpe_ratio = (expected_return - self.risk_free_rate) / portfolio_volatility
        else:
            sharpe_ratio = 0.0

        # トレイナー比（Sharpe比の変種）
        excess_return = expected_return - self.risk_free_rate
        if portfolio_volatility > 0:
            treynor_ratio = excess_return / portfolio_volatility  # 簡略化（ベータ値を使用する方が正確）
        else:
            treynor_ratio = 0.0

        # ジュリアノ指標（Sharp比の改良版、下振れリスク重視）
        downside_returns = returns_data[returns_data < self.risk_free_rate / 252]  # 年率リスクフリーレートを日次に変換
        if len(downside_returns) > 0:
            downside_deviation = np.std(downside_returns)
            if downside_deviation > 0:
                sortino_ratio = excess_return / downside_deviation
            else:
                sortino_ratio = 0.0
        else:
            sortino_ratio = sharpe_ratio  # 下振れがなければSharpe比を流用

        # リスク調整後の予測リターン
        risk_adjusted_return = expected_return
        if sharpe_ratio < 0:  # リスクに見合わないリターンであれば調整
            risk_adjusted_return *= 1 + sharpe_ratio * 0.1  # 10%を乗数として調整

        # VaRとCVaRに基づくリスク調整
        risk_factor = 1.0
        if historical_var < 0:  # 損失リスクが高い場合
            risk_factor *= 1 + historical_var  # リスクを考慮して予測を調整
        if historical_cvar < 0:  # 平均損失が大きい場合
            risk_factor *= 1 + historical_cvar * 0.5  # CVaRの半分を調整因子として使用

        adjusted_prediction = [r * risk_factor for r in base_prediction]

        return {
            "base_prediction": base_prediction.tolist() if hasattr(base_prediction, "tolist") else base_prediction,
            "mean_prediction": float(np.mean(base_prediction)) if len(base_prediction) > 0 else 0.0,
            "prediction_uncertainty": float(np.std(base_prediction)) if len(base_prediction) > 0 else 0.0,
            "confidence_interval": {
                "lower": lower_bound.tolist() if hasattr(lower_bound, "tolist") else lower_bound,
                "upper": upper_bound.tolist() if hasattr(upper_bound, "tolist") else upper_bound,
            },
            "var": historical_var,
            "cvar": historical_cvar,
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "treynor_ratio": treynor_ratio,
            "risk_factor": risk_factor,
            "risk_adjusted_prediction": adjusted_prediction,
            "expected_return": expected_return,
            "portfolio_volatility": portfolio_volatility,
        }

    def get_risk_metrics(self, returns: np.ndarray) -> Dict[str, float]:
        """リスク指標の計算"""
        # 指標の計算
        mean_return = np.mean(returns)
        volatility = np.std(returns)

        # VaRとCVaR
        var_calc = ValueAtRiskCalculator(0.95).fit(returns)
        var_95 = var_calc.calculate_var_historical()
        cvar_95 = ConditionalValueAtRiskCalculator(0.95).calculate_cvar_historical(returns)

        # 総合リスクスコア（独自指標）
        risk_score = (
            0.3 * abs(var_95)
            + 0.4 * abs(cvar_95)
            + 0.2 * volatility
            + 0.1 * (np.max(returns) - np.min(returns))  # 範囲も考慮
        )

        return {
            "volatility": volatility,
            "var_95": var_95,
            "cvar_95": cvar_95,
            "max_drawdown": self._calculate_max_drawdown(returns),
            "volatility_252d": volatility * np.sqrt(252),  # 年間化ボラティリティ
            "risk_score": risk_score,
            "return_volatility_ratio": mean_return / (volatility + 1e-8),  # シャープ比の簡易版
        }

    def _calculate_max_drawdown(self, returns: np.ndarray) -> float:
        """最大ドローダンの計算"""
        cumulative = np.concatenate([[0], np.cumprod(1 + returns)])
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = np.min(drawdown) if len(drawdown) > 0 else 0.0
        return max_drawdown


class PortfolioRiskOptimizer:
    """ポートフォリオリスク最適化器"""

    def __init__(self, risk_metrics: Dict[str, float]):
        self.risk_metrics = risk_metrics

    def optimize_allocation_by_risk(
        self, assets_returns: Dict[str, np.ndarray], target_volatility: float = 0.15
    ) -> Dict[str, float]:
        """リスクに基づくアロケーション最適化"""
        # 単純なリスクパリティ最適化（等リスク分配）
        asset_volatilities = {}
        for asset, returns in assets_returns.items():
            vol = np.std(returns) if len(returns) > 1 else 0.01
            asset_volatilities[asset] = vol

        # リスク逆数を基にウェイトを計算
        total_inverse_risk = sum(1 / vol for vol in asset_volatilities.values() if vol > 0)
        weights = {}
        for asset, vol in asset_volatilities.items():
            if vol > 0:
                weights[asset] = (1 / vol) / total_inverse_risk
            else:
                weights[asset] = 0.0

        return weights

    def calculate_portfolio_var(self, weights: Dict[str, float], assets_returns: Dict[str, np.ndarray]) -> float:
        """ポートフォリオVaRの計算"""
        # 線形結合したリターンを計算
        combined_returns = np.zeros(len(list(assets_returns.values())[0]))
        total_weight = sum(weights.values())

        for asset, asset_returns in assets_returns.items():
            weight = weights.get(asset, 0.0) / total_weight
            combined_returns += asset_returns * weight

        # ポ合リターンのVaRを計算
        var_calc = ValueAtRiskCalculator(0.95).fit(combined_returns)
        portfolio_var = var_calc.calculate_var_historical()

        return portfolio_var


class RiskBasedPredictionAdjuster:
    """リスクベース予測調整器"""

    def __init__(self, base_predictor: Any):
        self.base_predictor = base_predictor
        self.risk_predictor = RiskAdjustedPredictor(base_predictor)

    def adjust_prediction_by_risk(
        self,
        X: np.ndarray,
        returns_data: np.ndarray,
        confidence_threshold: float = 0.7,
        risk_tolerance: float = 0.05,
    ) -> Dict[str, Any]:
        """リスクに応じた予測調整"""
        # リスク調整予測の実行
        risk_adjusted_result = self.risk_predictor.predict_with_risk_adjustment(X, returns_data)

        # 予測の信頼度に基づく調整
        confidence = risk_adjusted_result["sharpe_ratio"] / (abs(risk_adjusted_result["sharpe_ratio"]) + 1.0)
        if abs(confidence) < confidence_threshold:
            # 信頼度が低い場合は予測を控えめに調整
            adjustment_factor = (abs(confidence) / confidence_threshold) * 0.7
            risk_adjusted_result["risk_adjusted_prediction"] = [
                p * adjustment_factor for p in risk_adjusted_result["risk_adjusted_prediction"]
            ]

        # リスク許容度に基づく調整
        if risk_adjusted_result["portfolio_volatility"] > risk_tolerance:
            # リスクが高い場合はリターン予測を控えめに
            volatility_adjustment = risk_tolerance / risk_adjusted_result["portfolio_volatility"]
            risk_adjusted_result["risk_adjusted_prediction"] = [
                p * volatility_adjustment for p in risk_adjusted_result["risk_adjusted_prediction"]
            ]

        return risk_adjusted_result


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # モック予測器
    class MockPredictor:
        def predict(self, X):
            return np.array([0.01, 0.015, 0.005, 0.02, 0.012])  # 5ステップの予測

    mock_predictor = MockPredictor()

    # サンプルリターンデータ
    np.random.seed(42)
    sample_returns = np.random.normal(0.001, 0.02, 252)  # 1年分の日次リターン

    # 特徴量のダミー
    dummy_features = np.random.random((1, 10))

    # リスク調整予測器のテスト
    risk_predictor = RiskAdjustedPredictor(mock_predictor)
    result = risk_predictor.predict_with_risk_adjustment(dummy_features, sample_returns, investment_horizon=5)

    print("Risk-Adjusted Prediction Results:")
    print(f"Base prediction: {result['base_prediction']}")
    print(f"Risk-adjusted prediction: {result['risk_adjusted_prediction']}")
    print(f"Expected return: {result['expected_return']:.4f}")
    print(f"Portfolio volatility: {result['portfolio_volatility']:.4f}")
    print(f"Sharpe ratio: {result['sharpe_ratio']:.4f}")
    print(f"Sortino ratio: {result['sortino_ratio']:.4f}")
    print(f"VaR (95%): {result['var']:.4f}")
    print(f"CVaR (95%): {result['cvar']:.4f}")

    # リスク指標の計算
    risk_metrics = risk_predictor.get_risk_metrics(sample_returns)
    print(f"\nRisk Metrics: {risk_metrics}")

    # リスクベース予測調整器のテスト
    risk_adjuster = RiskBasedPredictionAdjuster(mock_predictor)
    adjusted_result = risk_adjuster.adjust_prediction_by_risk(dummy_features, sample_returns)
    print(f"\nRisk-Adjusted Prediction: {adjusted_result['risk_adjusted_prediction']}")

    print("Risk-adjusted prediction components test completed.")
