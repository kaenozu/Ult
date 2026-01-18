"""
Walk-Forward Analysis for LightGBM with Confusion Matrix
Provides rigorous time-series validation with scientific metrics
"""

import logging
from typing import Dict, List, Tuple, Any, Optional
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
)

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

try:
    import matplotlib.pyplot as plt
    import seaborn as sns

    PLOT_AVAILABLE = True
except ImportError:
    PLOT_AVAILABLE = False
    logging.warning("Matplotlib/Seaborn not available. Plotting disabled.")

logger = logging.getLogger(__name__)


class LightGBMWalkForwardAnalyzer:
    """
    Walk-Forward Analysis for LightGBM models with comprehensive confusion matrices.

    This implements a scientifically rigorous validation approach:
    1. Prevents look-ahead bias
    2. Simulates real-world trading conditions
    3. Provides detailed classification metrics
    4. Tracks performance degradation over time
    """

    def __init__(
        self,
        train_period_days: int = 730,  # 2 years training
        test_period_days: int = 30,  # 1 month testing
        step_days: int = 30,  # Move forward 1 month
        min_train_samples: int = 500,  # Minimum training samples
    ):
        self.train_period_days = train_period_days
        self.test_period_days = test_period_days
        self.step_days = step_days
        self.min_train_samples = min_train_samples

        # Storage for analysis results
        self.results: List[Dict[str, Any]] = []
        self.all_predictions: np.ndarray = np.array([])
        self.all_actuals: np.ndarray = np.array([])
        self.all_probabilities: np.ndarray = np.array([])

        # Feature and target tracking
        self.feature_columns: Optional[List[str]] = None
        self.target_column: str = "target"

    def prepare_lightgbm_data(
        self,
        df: pd.DataFrame,
        feature_columns: List[str],
        target_column: str = "Return_1d",
        classification_threshold: float = 0.0,
    ) -> pd.DataFrame:
        """
        Prepare data for LightGBM classification.

        Args:
            df: Input DataFrame with price data
            feature_columns: List of feature column names
            target_column: Column to use for target (e.g., 'Return_1d')
            classification_threshold: Threshold for binary classification (positive vs negative)

        Returns:
            Prepared DataFrame with target column
        """
        data = df.copy()

        # Ensure datetime index
        if not isinstance(data.index, pd.DatetimeIndex):
            data.index = pd.to_datetime(data.index)

        data = data.sort_index()

        # Create binary target (1 = positive return, 0 = negative/flat)
        if target_column in data.columns:
            data[self.target_column] = (
                data[target_column] > classification_threshold
            ).astype(int)
        else:
            # Calculate returns if not present
            if "Close" in data.columns:
                data["Return_1d"] = data["Close"].pct_change()
                data[self.target_column] = (
                    data["Return_1d"] > classification_threshold
                ).astype(int)
            else:
                raise ValueError(
                    f"Target column '{target_column}' not found and 'Close' column missing"
                )

        self.feature_columns = feature_columns
        return data

    def generate_walkforward_splits(
        self,
        df: pd.DataFrame,
    ) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
        """
        Generate train/test splits for walk-forward analysis.

        Args:
            df: DataFrame with datetime index and prepared data

        Returns:
            List of (train_df, test_df) tuples
        """
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)

        df = df.sort_index()

        splits = []
        start_date = df.index.min()
        end_date = df.index.max()

        current_date = start_date + timedelta(days=self.train_period_days)

        split_num = 0
        while current_date + timedelta(days=self.test_period_days) <= end_date:
            # Define train period
            train_start = current_date - timedelta(days=self.train_period_days)
            train_end = current_date

            # Define test period
            test_start = current_date
            test_end = current_date + timedelta(days=self.test_period_days)

            # Extract data
            train_df = df[(df.index >= train_start) & (df.index < train_end)]
            test_df = df[(df.index >= test_start) & (df.index < test_end)]

            if len(train_df) >= self.min_train_samples and not test_df.empty:
                splits.append((train_df, test_df))
                logger.debug(
                    f"Split {split_num}: Train {train_start.date()} to {train_end.date()} "
                    f"({len(train_df)} samples), Test {test_start.date()} to {test_end.date()} "
                    f"({len(test_df)} samples)"
                )
                split_num += 1

            # Move forward
            current_date += timedelta(days=self.step_days)

        logger.info(f"Created {len(splits)} walk-forward splits")
        return splits

    def train_lightgbm_model(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        params: Optional[Dict] = None,
    ) -> lgb.Booster:
        """
        Train a LightGBM model on training data.

        Args:
            X_train: Training features
            y_train: Training target
            params: LightGBM parameters

        Returns:
            Trained LightGBM booster
        """
        if lgb is None:
            raise ImportError("LightGBM not installed")

        # Default parameters with regularization to prevent overfitting
        default_params = {
            "objective": "binary",
            "metric": ["binary_logloss", "auc"],
            "verbosity": -1,
            "seed": 42,
            "boosting_type": "gbdt",
            "num_leaves": 31,
            "max_depth": 6,
            "learning_rate": 0.05,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "lambda_l1": 0.1,
            "lambda_l2": 0.1,
            "min_child_samples": 20,
        }

        if params:
            default_params.update(params)

        train_data = lgb.Dataset(X_train, label=y_train)

        # Early stopping to prevent overfitting
        valid_size = min(len(X_train) // 5, 100)
        if valid_size > 10:
            eval_data = lgb.Dataset(
                X_train.iloc[-valid_size:],
                label=y_train.iloc[-valid_size:],
                reference=train_data,
            )
            model = lgb.train(
                default_params,
                train_data,
                num_boost_round=200,
                valid_sets=[eval_data],
                callbacks=[
                    lgb.early_stopping(stopping_rounds=20, verbose=False),
                    lgb.log_evaluation(period=0),
                ],
            )
        else:
            model = lgb.train(default_params, train_data, num_boost_round=100)

        return model

    def run_walkforward_analysis(
        self,
        df: pd.DataFrame,
        feature_columns: List[str],
        target_column: str = "Return_1d",
        lgb_params: Optional[Dict] = None,
        prediction_threshold: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Run complete walk-forward analysis with confusion matrices.

        Args:
            df: Input DataFrame
            feature_columns: List of feature columns
            target_column: Target column name
            lgb_params: LightGBM parameters
            prediction_threshold: Threshold for binary predictions

        Returns:
            Dictionary containing comprehensive analysis results
        """
        # Prepare data
        prepared_df = self.prepare_lightgbm_data(df, feature_columns, target_column)

        # Generate splits
        splits = self.generate_walkforward_splits(prepared_df)

        if not splits:
            return {"error": "No valid splits generated"}

        # Reset storage
        self.results = []
        self.all_predictions = np.array([])
        self.all_actuals = np.array([])
        self.all_probabilities = np.array([])

        # Track performance over time
        time_series_metrics = {
            "dates": [],
            "accuracy": [],
            "precision": [],
            "recall": [],
            "f1": [],
            "train_size": [],
            "test_size": [],
        }

        # Run analysis for each split
        for split_idx, (train_df, test_df) in enumerate(splits):
            logger.info(f"Processing split {split_idx + 1}/{len(splits)}")

            try:
                # Prepare features
                X_train = train_df[self.feature_columns].fillna(0)
                y_train = train_df[self.target_column]

                X_test = test_df[self.feature_columns].fillna(0)
                y_test = test_df[self.target_column]

                # Train model
                model = self.train_lightgbm_model(X_train, y_train, lgb_params)

                # Predict
                y_pred_proba = model.predict(X_test)
                y_pred = (y_pred_proba > prediction_threshold).astype(int)

                # Store results
                self.all_predictions = np.concatenate([self.all_predictions, y_pred])
                self.all_actuals = np.concatenate([self.all_actuals, y_test.values])
                self.all_probabilities = np.concatenate(
                    [self.all_probabilities, y_pred_proba]
                )

                # Calculate metrics for this split
                split_metrics = {
                    "split": split_idx,
                    "train_start": train_df.index.min(),
                    "train_end": train_df.index.max(),
                    "test_start": test_df.index.min(),
                    "test_end": test_df.index.max(),
                    "train_size": len(train_df),
                    "test_size": len(test_df),
                    "accuracy": accuracy_score(y_test, y_pred),
                    "precision": precision_score(y_test, y_pred, zero_division=0),
                    "recall": recall_score(y_test, y_pred, zero_division=0),
                    "f1": f1_score(y_test, y_pred, zero_division=0),
                }

                self.results.append(split_metrics)

                # Track time series
                time_series_metrics["dates"].append(test_df.index.min())
                time_series_metrics["accuracy"].append(split_metrics["accuracy"])
                time_series_metrics["precision"].append(split_metrics["precision"])
                time_series_metrics["recall"].append(split_metrics["recall"])
                time_series_metrics["f1"].append(split_metrics["f1"])
                time_series_metrics["train_size"].append(len(train_df))
                time_series_metrics["test_size"].append(len(test_df))

                logger.info(
                    f"Split {split_idx}: Acc={split_metrics['accuracy']:.3f}, "
                    f"Prec={split_metrics['precision']:.3f}, "
                    f"Rec={split_metrics['recall']:.3f}, "
                    f"F1={split_metrics['f1']:.3f}"
                )

            except Exception as e:
                logger.error(f"Error in split {split_idx}: {e}")
                continue

        # Calculate overall metrics
        overall_metrics = self._calculate_overall_metrics()

        # Generate confusion matrix
        cm = confusion_matrix(self.all_actuals, self.all_predictions)

        return {
            "overall_metrics": overall_metrics,
            "split_results": self.results,
            "time_series_metrics": time_series_metrics,
            "confusion_matrix": cm,
            "total_predictions": len(self.all_predictions),
            "num_splits": len(splits),
            "feature_importance": self._calculate_feature_importance(
                splits, feature_columns
            ),
        }

    def _calculate_overall_metrics(self) -> Dict[str, float]:
        """Calculate overall classification metrics."""
        if len(self.all_predictions) == 0:
            return {}

        metrics = {
            "accuracy": accuracy_score(self.all_actuals, self.all_predictions),
            "precision": precision_score(
                self.all_actuals, self.all_predictions, zero_division=0
            ),
            "recall": recall_score(
                self.all_actuals, self.all_predictions, zero_division=0
            ),
            "f1": f1_score(self.all_actuals, self.all_predictions, zero_division=0),
            "total_samples": len(self.all_predictions),
            "positive_samples": int(self.all_actuals.sum()),
            "negative_samples": int(len(self.all_actuals) - self.all_actuals.sum()),
        }

        # Add balanced accuracy
        metrics["balanced_accuracy"] = (metrics["recall"] + metrics["recall"]) / 2

        return metrics

    def _calculate_feature_importance(
        self,
        splits: List[Tuple[pd.DataFrame, pd.DataFrame]],
        feature_columns: List[str],
    ) -> Dict[str, float]:
        """
        Calculate average feature importance across all splits.

        Note: This requires retraining models, so it's optional.
        """
        importance_dict = {col: 0.0 for col in feature_columns}
        valid_splits = 0

        for split_idx, (train_df, test_df) in enumerate(splits):
            try:
                X_train = train_df[self.feature_columns].fillna(0)
                y_train = train_df[self.target_column]

                model = self.train_lightgbm_model(X_train, y_train)

                importance = model.feature_importance(importance_type="gain")
                for i, col in enumerate(feature_columns):
                    if i < len(importance):
                        importance_dict[col] += importance[i]

                valid_splits += 1
            except Exception as e:
                logger.warning(
                    f"Could not calculate importance for split {split_idx}: {e}"
                )
                continue

        if valid_splits > 0:
            importance_dict = {
                col: val / valid_splits for col, val in importance_dict.items()
            }
            # Normalize to percentages
            total = sum(importance_dict.values())
            if total > 0:
                importance_dict = {
                    col: (val / total) * 100 for col, val in importance_dict.items()
                }

        return importance_dict

    def plot_confusion_matrix(
        self,
        cm: np.ndarray,
        output_path: Optional[str] = None,
        title: str = "LightGBM Walk-Forward Confusion Matrix",
    ) -> Optional[str]:
        """
        Plot and optionally save confusion matrix.

        Args:
            cm: Confusion matrix
            output_path: Path to save the plot
            title: Plot title

        Returns:
            Path to saved plot or None
        """
        if not PLOT_AVAILABLE:
            logger.warning("Plotting not available (matplotlib/seaborn not installed)")
            return None

        fig, ax = plt.subplots(figsize=(8, 6))

        # Create heatmap
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            cbar=True,
            square=True,
            ax=ax,
            xticklabels=["Negative", "Positive"],
            yticklabels=["Negative", "Positive"],
        )

        ax.set_xlabel("Predicted Label", fontsize=12, fontweight="bold")
        ax.set_ylabel("True Label", fontsize=12, fontweight="bold")
        ax.set_title(title, fontsize=14, fontweight="bold", pad=20)

        # Add metrics text
        if len(self.all_actuals) > 0:
            accuracy = accuracy_score(self.all_actuals, self.all_predictions)
            precision = precision_score(
                self.all_actuals, self.all_predictions, zero_division=0
            )
            recall = recall_score(
                self.all_actuals, self.all_predictions, zero_division=0
            )
            f1 = f1_score(self.all_actuals, self.all_predictions, zero_division=0)

            metrics_text = f"Accuracy: {accuracy:.3f}\nPrecision: {precision:.3f}\nRecall: {recall:.3f}\nF1: {f1:.3f}"
            plt.text(
                1.5,
                -0.1,
                metrics_text,
                transform=ax.transAxes,
                fontsize=10,
                verticalalignment="top",
                bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5),
            )

        plt.tight_layout()

        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(output_path, dpi=150, bbox_inches="tight")
            logger.info(f"Confusion matrix saved to {output_path}")
            plt.close()
            return output_path
        else:
            plt.show()
            return None

    def plot_performance_over_time(
        self,
        time_series_metrics: Dict[str, List],
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        Plot performance metrics over time to detect degradation.

        Args:
            time_series_metrics: Dictionary with time series data
            output_path: Path to save the plot

        Returns:
            Path to saved plot or None
        """
        if not PLOT_AVAILABLE:
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle(
            "LightGBM Walk-Forward Performance Over Time",
            fontsize=16,
            fontweight="bold",
        )

        metrics = ["accuracy", "precision", "recall", "f1"]
        titles = ["Accuracy", "Precision", "Recall", "F1 Score"]
        colors = ["#2ecc71", "#3498db", "#9b59b6", "#e74c3c"]

        for ax, metric, title, color in zip(axes.flat, metrics, titles, colors):
            ax.plot(
                time_series_metrics["dates"],
                time_series_metrics[metric],
                marker="o",
                linewidth=2,
                markersize=6,
                color=color,
                label=metric.title(),
            )

            # Add trend line
            if len(time_series_metrics[metric]) > 1:
                x_numeric = np.arange(len(time_series_metrics[metric]))
                z = np.polyfit(x_numeric, time_series_metrics[metric], 1)
                p = np.poly1d(z)
                ax.plot(
                    time_series_metrics["dates"],
                    p(x_numeric),
                    "--",
                    alpha=0.5,
                    color="gray",
                    label="Trend",
                )

            ax.set_title(title, fontsize=12, fontweight="bold")
            ax.set_ylabel(metric.title(), fontsize=10)
            ax.grid(True, alpha=0.3)
            ax.legend(loc="best")
            ax.tick_params(axis="x", rotation=45)

        plt.tight_layout()

        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(output_path, dpi=150, bbox_inches="tight")
            logger.info(f"Performance plot saved to {output_path}")
            plt.close()
            return output_path
        else:
            plt.show()
            return None

    def get_classification_report(self) -> str:
        """Generate detailed classification report."""
        if len(self.all_predictions) == 0:
            return "No predictions available"

        return classification_report(
            self.all_actuals,
            self.all_predictions,
            target_names=["Negative", "Positive"],
            digits=4,
        )

    def print_summary(self) -> None:
        """Print comprehensive analysis summary."""
        print("\n" + "=" * 80)
        print("LIGHTGBM WALK-FORWARD ANALYSIS SUMMARY")
        print("=" * 80)

        if len(self.all_predictions) == 0:
            print("No predictions available")
            return

        # Overall metrics
        metrics = self._calculate_overall_metrics()
        print(f"\nTotal Splits: {len(self.results)}")
        print(f"Total Predictions: {metrics['total_samples']}")
        print(
            f"Positive Samples: {metrics['positive_samples']} ({metrics['positive_samples'] / metrics['total_samples'] * 100:.1f}%)"
        )
        print(
            f"Negative Samples: {metrics['negative_samples']} ({metrics['negative_samples'] / metrics['total_samples'] * 100:.1f}%)"
        )

        print(f"\nOverall Performance:")
        print(f"  Accuracy: {metrics['accuracy']:.4f}")
        print(f"  Precision: {metrics['precision']:.4f}")
        print(f"  Recall: {metrics['recall']:.4f}")
        print(f"  F1 Score: {metrics['f1']:.4f}")
        print(f"  Balanced Accuracy: {metrics['balanced_accuracy']:.4f}")

        # Confusion Matrix
        print(f"\nConfusion Matrix:")
        cm = confusion_matrix(self.all_actuals, self.all_predictions)
        print(f"  True Negatives:  {cm[0, 0]}")
        print(f"  False Positives: {cm[0, 1]}")
        print(f"  False Negatives: {cm[1, 0]}")
        print(f"  True Positives:  {cm[1, 1]}")

        # Performance stability
        if len(self.results) > 1:
            accuracies = [r["accuracy"] for r in self.results]
            print(f"\nPerformance Stability:")
            print(f"  Accuracy Range: {min(accuracies):.4f} - {max(accuracies):.4f}")
            print(f"  Accuracy Std: {np.std(accuracies):.4f}")
            print(f"  Accuracy Trend: {accuracies[-1] - accuracies[0]:.4f}")

        print("\n" + "=" * 80)
        print("DETAILED CLASSIFICATION REPORT")
        print("=" * 80)
        print(self.get_classification_report())
        print("=" * 80)


def run_lightgbm_walkforward_analysis(
    df: pd.DataFrame,
    feature_columns: List[str],
    output_dir: str = "logs/walkforward_analysis",
    train_period_days: int = 730,
    test_period_days: int = 30,
    step_days: int = 30,
) -> Dict[str, Any]:
    """
    Convenience function to run complete Walk-Forward Analysis.

    Args:
        df: Input DataFrame with price and feature data
        feature_columns: List of feature column names
        output_dir: Directory to save plots and results
        train_period_days: Training period in days
        test_period_days: Test period in days
        step_days: Step size in days

    Returns:
        Dictionary containing all analysis results
    """
    analyzer = LightGBMWalkForwardAnalyzer(
        train_period_days=train_period_days,
        test_period_days=test_period_days,
        step_days=step_days,
    )

    # Run analysis
    results = analyzer.run_walkforward_analysis(df, feature_columns)

    if "error" in results:
        logger.error(f"Analysis failed: {results['error']}")
        return results

    # Print summary
    analyzer.print_summary()

    # Generate plots
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Confusion matrix
    analyzer.plot_confusion_matrix(
        results["confusion_matrix"],
        output_path=str(output_path / "confusion_matrix.png"),
        title="LightGBM Walk-Forward Confusion Matrix",
    )

    # Performance over time
    analyzer.plot_performance_over_time(
        results["time_series_metrics"],
        output_path=str(output_path / "performance_over_time.png"),
    )

    # Save results to CSV
    if results["split_results"]:
        results_df = pd.DataFrame(results["split_results"])
        results_df.to_csv(output_path / "split_results.csv", index=False)

    # Save feature importance
    if results["feature_importance"]:
        importance_df = pd.DataFrame.from_dict(
            results["feature_importance"], orient="index", columns=["importance"]
        ).sort_values("importance", ascending=False)
        importance_df.to_csv(output_path / "feature_importance.csv")

    logger.info(f"Walk-forward analysis complete. Results saved to {output_dir}")

    return results
