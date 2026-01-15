"""​Numba JIT最適化ユーティリティ

重い計算を高速化
"""

import logging

import numpy as np

logger = logging.getLogger(__name__)

# Numbaが利用可能かチェック
try:
    from numba import jit, prange

    NUMBA_AVAILABLE = True
except ImportError:
    NUMBA_AVAILABLE = False
    logger.info("Numba not available, using pure Python fallbacks")

    # ダミーデコレータ
    def jit(*args, **kwargs):
        def decorator(func):
            return func

        return decorator

    prange = range


# === テクニカル指標計算 ===


@jit(nopython=True, cache=True)
def fast_sma(prices: np.ndarray, period: int) -> np.ndarray:
    """高速単純移動平均

    Args:
        prices: 価格配列
        period: 期間

    Returns:
        SMA配列
    """
    n = len(prices)
    result = np.empty(n)
    result[: period - 1] = np.nan

    # 最初の値
    window_sum = np.sum(prices[:period])
    result[period - 1] = window_sum / period

    # ローリング計算
    for i in range(period, n):
        window_sum = window_sum - prices[i - period] + prices[i]
        result[i] = window_sum / period

    return result


@jit(nopython=True, cache=True)
def fast_ema(prices: np.ndarray, period: int) -> np.ndarray:
    """高速指数移動平均

    Args:
        prices: 価格配列
        period: 期間

    Returns:
        EMA配列
    """
    n = len(prices)
    result = np.empty(n)
    result[0] = prices[0]

    alpha = 2.0 / (period + 1)

    for i in range(1, n):
        result[i] = alpha * prices[i] + (1 - alpha) * result[i - 1]

    return result


@jit(nopython=True, cache=True)
def fast_rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    """高速RSI計算

    Args:
        prices: 価格配列
        period: 期間

    Returns:
        RSI配列
    """
    n = len(prices)
    result = np.empty(n)
    result[:period] = np.nan

    # 価格変化
    deltas = np.diff(prices)

    # 上昇・下降を分離
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    # 初期平均
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    if avg_loss == 0:
        result[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        result[period] = 100.0 - (100.0 / (1.0 + rs))

    # スムージング
    for i in range(period + 1, n):
        avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period

        if avg_loss == 0:
            result[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            result[i] = 100.0 - (100.0 / (1.0 + rs))

    return result


@jit(nopython=True, cache=True)
def fast_macd(
    prices: np.ndarray,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> tuple:
    """高速MACD計算

    Args:
        prices: 価格配列
        fast_period: 短期EMA期間
        slow_period: 長期EMA期間
        signal_period: シグナル期間

    Returns:
        (MACDライン, シグナルライン, ヒストグラム)
    """
    ema_fast = fast_ema(prices, fast_period)
    ema_slow = fast_ema(prices, slow_period)

    macd_line = ema_fast - ema_slow
    signal_line = fast_ema(macd_line, signal_period)
    histogram = macd_line - signal_line

    return macd_line, signal_line, histogram


@jit(nopython=True, cache=True)
def fast_bollinger_bands(
    prices: np.ndarray,
    period: int = 20,
    num_std: float = 2.0,
) -> tuple:
    """高速ボリンジャーバンド計算

    Args:
        prices: 価格配列
        period: 期間
        num_std: 標準偏差の倍数

    Returns:
        (上バンド, 中心線, 下バンド)
    """
    n = len(prices)
    middle = fast_sma(prices, period)

    upper = np.empty(n)
    lower = np.empty(n)
    upper[: period - 1] = np.nan
    lower[: period - 1] = np.nan

    for i in range(period - 1, n):
        window = prices[i - period + 1 : i + 1]
        std = np.std(window)
        upper[i] = middle[i] + num_std * std
        lower[i] = middle[i] - num_std * std

    return upper, middle, lower


# === リスク計算 ===


@jit(nopython=True, cache=True)
def fast_max_drawdown(equity_curve: np.ndarray) -> float:
    """高速最大ドローダウン計算

    Args:
        equity_curve: 資産曲線

    Returns:
        最大ドローダウン（負の値）
    """
    peak = equity_curve[0]
    max_dd = 0.0

    for i in range(len(equity_curve)):
        if equity_curve[i] > peak:
            peak = equity_curve[i]

        dd = (equity_curve[i] - peak) / peak
        if dd < max_dd:
            max_dd = dd

    return max_dd


@jit(nopython=True, cache=True)
def fast_sharpe_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.0,
    annualization_factor: float = 252.0,
) -> float:
    """高速シャープレシオ計算

    Args:
        returns: リターン配列（日次）
        risk_free_rate: 無リスク金利（年率）
        annualization_factor: 年率化係数

    Returns:
        シャープレシオ
    """
    daily_rf = risk_free_rate / annualization_factor
    excess_returns = returns - daily_rf

    mean_excess = np.mean(excess_returns)
    std_excess = np.std(excess_returns)

    if std_excess == 0:
        return 0.0

    return (mean_excess / std_excess) * np.sqrt(annualization_factor)


@jit(nopython=True, cache=True)
def fast_sortino_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.0,
    annualization_factor: float = 252.0,
) -> float:
    """高速ソルティノレシオ計算

    Args:
        returns: リターン配列
        risk_free_rate: 無リスク金利
        annualization_factor: 年率化係数

    Returns:
        ソルティノレシオ
    """
    daily_rf = risk_free_rate / annualization_factor
    excess_returns = returns - daily_rf

    mean_excess = np.mean(excess_returns)

    # 下方偏差
    downside = excess_returns[excess_returns < 0]
    if len(downside) == 0:
        return 0.0

    downside_std = np.std(downside)

    if downside_std == 0:
        return 0.0

    return (mean_excess / downside_std) * np.sqrt(annualization_factor)


# === バックテスト用 ===


@jit(nopython=True, cache=True, parallel=True)
def fast_portfolio_returns(
    weights: np.ndarray,
    asset_returns: np.ndarray,
) -> np.ndarray:
    """高速ポートフォリオリターン計算

    Args:
        weights: 資産配分 (n_assets,)
        asset_returns: 各資産のリターン (n_periods, n_assets)

    Returns:
        ポートフォリオリターン (n_periods,)
    """
    n_periods = asset_returns.shape[0]
    result = np.zeros(n_periods)

    for i in prange(n_periods):
        for j in range(len(weights)):
            result[i] += weights[j] * asset_returns[i, j]

    return result


@jit(nopython=True, cache=True)
def fast_correlation_matrix(returns: np.ndarray) -> np.ndarray:
    """高速相関行列計算

    Args:
        returns: リターン行列 (n_periods, n_assets)

    Returns:
        相関行列 (n_assets, n_assets)
    """
    n_assets = returns.shape[1]
    corr = np.empty((n_assets, n_assets))

    # 平均と標準偏差
    means = np.empty(n_assets)
    stds = np.empty(n_assets)

    for i in range(n_assets):
        means[i] = np.mean(returns[:, i])
        stds[i] = np.std(returns[:, i])

    # 相関計算
    for i in range(n_assets):
        for j in range(n_assets):
            if stds[i] == 0 or stds[j] == 0:
                corr[i, j] = 0.0
            else:
                cov = np.mean((returns[:, i] - means[i]) * (returns[:, j] - means[j]))
                corr[i, j] = cov / (stds[i] * stds[j])

    return corr


# === ヘルパー関数 ===


def is_numba_available() -> bool:
    """​Numbaが利用可能かチェック"""
    return NUMBA_AVAILABLE


def benchmark_numba():
    """​Numbaのパフォーマンスをベンチマーク"""
    import time

    # テストデータ
    prices = np.random.randn(10000).cumsum() + 100

    # ウォームアップ
    fast_sma(prices, 20)
    fast_rsi(prices, 14)

    # ベンチマーク
    start = time.time()
    for _ in range(100):
        fast_sma(prices, 20)
        fast_rsi(prices, 14)
        fast_macd(prices)
    elapsed = time.time() - start

    return {
        "numba_available": NUMBA_AVAILABLE,
        "iterations": 100,
        "data_size": len(prices),
        "elapsed_seconds": elapsed,
        "ops_per_second": 300 / elapsed,
    }
