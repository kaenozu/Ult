"""
型ヒント付きのコア関数
型安全性の向上とmypy対応
"""

from typing import Dict, List, Optional, Tuple, Union, Any, Callable
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def calculate_returns(prices: pd.Series, period: int = 1) -> pd.Series:
    """
    リターンを計算

    Args:
        prices: 価格系列
        period: 計算期間

    Returns:
        リターン系列
    """
    return prices.pct_change(period)


def calculate_volatility(returns: pd.Series, window: int = 20) -> pd.Series:
    """
    ボラティリティを計算

    Args:
        returns: リターン系列
        window: 計算ウィンドウ

    Returns:
        ボラティリティ系列
    """
    return returns.rolling(window=window).std()


def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.02) -> float:
    """
    シャープレシオを計算

    Args:
        returns: リターン系列
        risk_free_rate: 無リスク利率

    Returns:
        シャープレシオ
    """
    excess_returns = returns - risk_free_rate / 252
    return excess_returns.mean() / excess_returns.std()


def calculate_max_drawdown(prices: pd.Series) -> Tuple[float, datetime, datetime]:
    """
    最大ドローダウンを計算

    Args:
        prices: 価格系列

    Returns:
        (ドローダウン率, 開始日, 終了日)
    """
    cumulative = (1 + prices.pct_change()).cumprod()
    rolling_max = cumulative.expanding().max()
    drawdown = (cumulative - rolling_max) / rolling_max

    max_dd = drawdown.min()
    end_date = drawdown.idxmin()
    start_date = cumulative[:end_date].idxmax()

    return max_dd, start_date, end_date


def calculate_var(returns: pd.Series, confidence: float = 0.95) -> float:
    """
    Value at Riskを計算

    Args:
        returns: リターン系列
        confidence: 信頼水準

    Returns:
        VaR値
    """
    return np.percentile(returns, (1 - confidence) * 100)


def optimize_portfolio_weights(
    expected_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    risk_tolerance: float = 1.0,
) -> np.ndarray:
    """
    ポートフォリオウェイトを最適化

    Args:
        expected_returns: 期待リターン配列
        covariance_matrix: 共分散行列
        risk_tolerance: リスク許容度

    Returns:
        最適ウェイト配列
    """
    n_assets = len(expected_returns)

    # 簡易的な最適化（等ウェイトを出発点）
    weights = np.ones(n_assets) / n_assets

    return weights


def validate_data_quality(data: pd.DataFrame, required_columns: Optional[List[str]] = None) -> Tuple[bool, List[str]]:
    """
    データ品質を検証

    Args:
        data: 検証するデータ
        required_columns: 必須カラムリスト

    Returns:
        (品質OK, エラーメッセージリスト)
    """
    errors: List[str] = []

    if data.empty:
        errors.append("データが空です")

    if required_columns:
        missing_cols = set(required_columns) - set(data.columns)
        if missing_cols:
            errors.append(f"必須カラムがありません: {missing_cols}")

    # 欠損値のチェック
    null_cols = data.columns[data.isnull().any()].tolist()
    if null_cols:
        errors.append(f"欠損値があります: {null_cols}")

    return len(errors) == 0, errors


def calculate_technical_indicators(prices: pd.DataFrame) -> Dict[str, pd.Series]:
    """
    テクニカル指標を計算

    Args:
        prices: OHLCVデータ

    Returns:
        指標名をキーとした辞書
    """
    indicators: Dict[str, pd.Series] = {}

    # RSI
    delta = prices["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    indicators["RSI"] = 100 - (100 / (1 + rs))

    # MACD
    exp1 = prices["Close"].ewm(span=12).mean()
    exp2 = prices["Close"].ewm(span=26).mean()
    indicators["MACD"] = exp1 - exp2
    indicators["MACD_Signal"] = indicators["MACD"].ewm(span=9).mean()

    # ボリンジャーバンド
    sma = prices["Close"].rolling(window=20).mean()
    std = prices["Close"].rolling(window=20).std()
    indicators["BB_Upper"] = sma + (std * 2)
    indicators["BB_Lower"] = sma - (std * 2)
    indicators["BB_Middle"] = sma

    return indicators


def apply_risk_management_rules(
    signals: Dict[str, Dict[str, Any]],
    portfolio: Dict[str, Dict[str, Any]],
    risk_params: Dict[str, float],
) -> Dict[str, Dict[str, Any]]:
    """
    リスク管理ルールを適用

    Args:
        signals: 取引シグナル
        portfolio: 現在ポートフォリオ
        risk_params: リスクパラメータ

    Returns:
        フィルタされたシグナル
    """
    filtered_signals = signals.copy()

    for ticker, signal in signals.items():
        # ポジションサイズ制限
        if ticker in portfolio:
            current_weight = portfolio[ticker].get("weight", 0)
            max_weight = risk_params.get("max_position_size", 0.1)

            if current_weight + signal.get("weight", 0) > max_weight:
                filtered_signals[ticker]["action"] = "HOLD"
                filtered_signals[ticker]["reason"] = "Position size limit"

    return filtered_signals


def backtest_strategy(
    data: pd.DataFrame,
    strategy_func: Callable[[pd.DataFrame], Dict[str, str]],
    initial_capital: float = 1000000,
) -> Dict[str, Any]:
    """
    戦略をバックテスト

    Args:
        data: 価格データ
        strategy_func: 戦略関数
        initial_capital: 初期資金

    Returns:
        バックテスト結果
    """
    results = {"returns": [], "positions": [], "trades": []}

    current_capital = initial_capital

    for date in data.index:
        # 戦略シグナル生成
        window_data = data[:date]
        signals = strategy_func(window_data)

        # シグナル実行（簡易化）
        results["trades"].append({"date": date, "signals": signals})

    return results


def generate_performance_report(returns: pd.Series, benchmark: Optional[pd.Series] = None) -> Dict[str, float]:
    """
    パフォーマンスレポート生成

    Args:
        returns: リターン系列
        benchmark: ベンチマークリターン

    Returns:
        パフォーマンス指標辞書
    """
    report = {}

    # 基本統計
    report["total_return"] = (1 + returns).prod() - 1
    report["annual_return"] = (1 + returns.mean()) ** 252 - 1
    report["volatility"] = returns.std() * np.sqrt(252)
    report["sharpe_ratio"] = calculate_sharpe_ratio(returns)
    report["max_drawdown"] = calculate_max_drawdown((1 + returns).cumprod())[0]

    # ベンチマーク比較
    if benchmark is not None:
        report["alpha"] = report["annual_return"] - ((1 + benchmark).prod() - 1)
        report["tracking_error"] = (returns - benchmark).std() * np.sqrt(252)
        report["information_ratio"] = report["alpha"] / report["tracking_error"] if report["tracking_error"] != 0 else 0

    return report
