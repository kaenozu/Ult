"""
Test Script for LightGBM Walk-Forward Analysis with Confusion Matrix
Demonstrates scientific validation approach to detect overfitting
"""

import logging
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend" / "src"))

import numpy as np
import pandas as pd

# Import our walk-forward analyzer
from walkforward_lightgbm import (
    LightGBMWalkForwardAnalyzer,
    run_lightgbm_walkforward_analysis,
)

# Import data loader and features
try:
    from data_loader import fetch_stock_data
    from features import add_advanced_features, add_macro_features
except ImportError:
    print("Warning: Could not import data_loader or features. Using mock data.")
    fetch_stock_data = None

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def generate_mock_data(days=1000):
    """
    Generate mock price data for testing when real data is not available.
    Simulates realistic stock price movements with trends and volatility.
    """
    np.random.seed(42)

    dates = pd.date_range(start="2020-01-01", periods=days, freq="D")

    # Generate realistic price series with trend and volatility
    returns = np.random.normal(0.0003, 0.02, days)  # Daily returns
    trend = np.linspace(0, 0.0005, days)  # Slight upward trend
    returns += trend

    prices = 100 * np.cumprod(1 + returns)

    df = pd.DataFrame(
        {
            "Date": dates,
            "Open": prices * (1 + np.random.normal(0, 0.01, days)),
            "High": prices * (1 + np.abs(np.random.normal(0.005, 0.01, days))),
            "Low": prices * (1 - np.abs(np.random.normal(0.005, 0.01, days))),
            "Close": prices,
            "Volume": np.random.randint(1000000, 10000000, days),
        }
    )

    df.set_index("Date", inplace=True)
    return df


def create_features(df):
    """
    Create technical features for LightGBM model.
    """
    data = df.copy()

    # Basic technical indicators
    data["Returns"] = data["Close"].pct_change()
    data["Volume_Change"] = data["Volume"].pct_change()

    # Moving averages
    for window in [5, 10, 20, 50]:
        data[f"SMA_{window}"] = data["Close"].rolling(window=window).mean()
        data[f"Dist_SMA_{window}"] = (data["Close"] - data[f"SMA_{window}"]) / data[
            f"SMA_{window}"
        ]

    # RSI
    delta = data["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    data["RSI"] = 100 - (100 / (1 + rs))

    # Bollinger Bands
    sma_20 = data["Close"].rolling(window=20).mean()
    std_20 = data["Close"].rolling(window=20).std()
    data["BB_Upper"] = sma_20 + (std_20 * 2)
    data["BB_Lower"] = sma_20 - (std_20 * 2)
    data["BB_Width"] = (data["BB_Upper"] - data["BB_Lower"]) / sma_20

    # MACD
    ema_12 = data["Close"].ewm(span=12, adjust=False).mean()
    ema_26 = data["Close"].ewm(span=26, adjust=False).mean()
    data["MACD"] = ema_12 - ema_26
    data["MACD_Signal"] = data["MACD"].ewm(span=9, adjust=False).mean()
    data["MACD_Diff"] = data["MACD"] - data["MACD_Signal"]

    # ATR (Average True Range)
    high_low = data["High"] - data["Low"]
    high_close = np.abs(data["High"] - data["Close"].shift())
    low_close = np.abs(data["Low"] - data["Close"].shift())
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    data["ATR"] = tr.rolling(window=14).mean()

    # Momentum
    data["Momentum_5"] = data["Close"] / data["Close"].shift(5) - 1
    data["Momentum_10"] = data["Close"] / data["Close"].shift(10) - 1

    # Volatility
    data["Volatility_20"] = data["Returns"].rolling(window=20).std()

    return data


def run_demo(ticker="^N225", use_mock_data=False):
    """
    Run comprehensive walk-forward analysis demo.

    Args:
        ticker: Stock ticker symbol (default: Nikkei 225)
        use_mock_data: Use generated mock data instead of real data
    """
    print("\n" + "=" * 80)
    print("LIGHTGBM WALK-FORWARD ANALYSIS DEMO")
    print("Scientific Rigor Mode: Detecting Overfitting")
    print("=" * 80)

    # Fetch or generate data
    if use_mock_data or fetch_stock_data is None:
        print(f"\nUsing mock data (1000 days)")
        df = generate_mock_data(days=1000)
    else:
        print(f"\nFetching real data for {ticker}...")
        try:
            data_map = fetch_stock_data([ticker], period="5y")
            df = data_map.get(ticker)
            if df is None:
                print(f"Failed to fetch data for {ticker}, using mock data")
                df = generate_mock_data(days=1000)
            elif isinstance(df, tuple):
                df = df[0]
        except Exception as e:
            print(f"Error fetching data: {e}, using mock data")
            df = generate_mock_data(days=1000)

    # Clean timezone if present
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    print(f"Data shape: {df.shape}")
    print(f"Date range: {df.index.min()} to {df.index.max()}")

    # Create features
    print("\nGenerating technical features...")
    df_features = create_features(df)

    # Define feature columns (same as in LightGBM strategy)
    feature_columns = [
        "ATR",
        "BB_Width",
        "RSI",
        "MACD",
        "MACD_Signal",
        "MACD_Diff",
        "Dist_SMA_5",
        "Dist_SMA_10",
        "Dist_SMA_20",
        "Dist_SMA_50",
        "Momentum_5",
        "Momentum_10",
        "Volume_Change",
        "Volatility_20",
    ]

    # Ensure all feature columns exist
    for col in feature_columns:
        if col not in df_features.columns:
            df_features[col] = 0.0

    # Fill missing values
    df_features = df_features.fillna(0)

    print(f"Features created: {len(feature_columns)}")

    # Run walk-forward analysis
    print("\n" + "=" * 80)
    print("RUNNING WALK-FORWARD ANALYSIS")
    print("=" * 80)
    print(f"Configuration:")
    print(f"  Train Period: 730 days (2 years)")
    print(f"  Test Period: 30 days (1 month)")
    print(f"  Step Size: 30 days")
    print(f"  Total Features: {len(feature_columns)}")
    print(f"  Total Samples: {len(df_features)}")

    # Create output directory with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path("logs/walkforward_analysis") / timestamp

    # Run analysis
    results = run_lightgbm_walkforward_analysis(
        df=df_features,
        feature_columns=feature_columns,
        output_dir=str(output_dir),
        train_period_days=730,  # 2 years training
        test_period_days=30,  # 1 month testing
        step_days=30,  # Move forward 1 month
    )

    # Print results summary
    print("\n" + "=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)

    if "error" in results:
        print(f"Error: {results['error']}")
        return

    print(f"\nResults saved to: {output_dir}")
    print(f"\nGenerated files:")
    print(f"  - confusion_matrix.png")
    print(f"  - performance_over_time.png")
    print(f"  - split_results.csv")
    print(f"  - feature_importance.csv")

    # Additional analysis
    print("\n" + "=" * 80)
    print("OVERFITTING ANALYSIS")
    print("=" * 80)

    if results["split_results"]:
        split_accuracies = [r["accuracy"] for r in results["split_results"]]
        split_f1s = [r["f1"] for r in results["split_results"]]

        print(f"\nAccuracy across splits:")
        print(f"  Mean: {np.mean(split_accuracies):.4f}")
        print(f"  Std: {np.std(split_accuracies):.4f}")
        print(f"  Range: {min(split_accuracies):.4f} - {max(split_accuracies):.4f}")

        print(f"\nF1 Score across splits:")
        print(f"  Mean: {np.mean(split_f1s):.4f}")
        print(f"  Std: {np.std(split_f1s):.4f}")
        print(f"  Range: {min(split_f1s):.4f} - {max(split_f1s):.4f}")

        # Check for overfitting patterns
        accuracy_trend = split_accuracies[-1] - split_accuracies[0]
        f1_trend = split_f1s[-1] - split_f1s[0]

        print(f"\nPerformance Trends:")
        print(f"  Accuracy Trend: {accuracy_trend:+.4f}")
        print(f"  F1 Trend: {f1_trend:+.4f}")

        # Overfitting detection
        std_accuracy = np.std(split_accuracies)
        if std_accuracy > 0.05:
            print(
                f"\n⚠️  WARNING: High accuracy variance ({std_accuracy:.4f}) suggests overfitting"
            )
        elif accuracy_trend < -0.03:
            print(
                f"\n⚠️  WARNING: Declining performance trend ({accuracy_trend:.4f}) suggests model degradation"
            )
        else:
            print(f"\n✅ Model shows stable performance characteristics")

    # Feature importance analysis
    if results.get("feature_importance"):
        print("\n" + "=" * 80)
        print("TOP 10 MOST IMPORTANT FEATURES")
        print("=" * 80)

        sorted_features = sorted(
            results["feature_importance"].items(), key=lambda x: x[1], reverse=True
        )

        for i, (feature, importance) in enumerate(sorted_features[:10], 1):
            print(f"  {i:2d}. {feature:20s} {importance:6.2f}%")

    # Trading simulation
    print("\n" + "=" * 80)
    print("TRADING SIMULATION (Based on Confusion Matrix)")
    print("=" * 80)

    cm = results["confusion_matrix"]

    # Calculate trading metrics
    total_predictions = cm.sum()
    correct_predictions = cm[0, 0] + cm[1, 1]
    wrong_predictions = cm[0, 1] + cm[1, 0]

    # Win rate (assuming we trade on predictions)
    actionable_predictions = cm.sum(axis=1)  # All predictions
    win_rate = correct_predictions / total_predictions if total_predictions > 0 else 0

    # Precision for positive class (BUY signal quality)
    buy_precision = cm[1, 1] / (cm[0, 1] + cm[1, 1]) if (cm[0, 1] + cm[1, 1]) > 0 else 0

    # Recall for positive class (how many positive returns we caught)
    buy_recall = cm[1, 1] / (cm[1, 0] + cm[1, 1]) if (cm[1, 0] + cm[1, 1]) > 0 else 0

    print(f"\nTrading Metrics:")
    print(f"  Overall Win Rate: {win_rate:.4f}")
    print(f"  BUY Signal Precision: {buy_precision:.4f}")
    print(f"  BUY Signal Recall: {buy_recall:.4f}")
    print(f"  False Positive Rate: {cm[0, 1] / (cm[0, 0] + cm[0, 1]):.4f}")
    print(f"  False Negative Rate: {cm[1, 0] / (cm[1, 0] + cm[1, 1]):.4f}")

    print("\n" + "=" * 80)
    print("DEMO COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    # Run demo with mock data (faster, no API calls)
    run_demo(ticker="^N225", use_mock_data=True)

    # To run with real data, uncomment:
    # run_demo(ticker="^N225", use_mock_data=False)
