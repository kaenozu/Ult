"""
ML Prediction System with Enhanced Features
機械学習予測システム（高度な特徴量付き）
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, accuracy_score
import joblib
import logging
from pathlib import Path

try:
    import xgboost as xgb

    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

from .enhanced_features import EnhancedFeatureEngineer

logger = logging.getLogger(__name__)


class MLPredictionSystem:
    """機械学習予測システム"""

    def __init__(self, model_type: str = "ensemble"):
        self.model_type = model_type
        self.feature_engineer = EnhancedFeatureEngineer()
        self.models = {}
        self.feature_names = []
        self.scaler = None

    def prepare_data(self, df: pd.DataFrame, target_days: int = 1) -> Tuple[pd.DataFrame, pd.Series]:
        """データ準備"""
        # 特徴量エンジニアリング
        df_features = self.feature_engineer.create_features(df)

        # ターゲット変数作成
        df_features[f"Target_{target_days}d"] = df_features["Close"].pct_change(target_days).shift(-target_days)

        # 欠損値を除去
        df_clean = df_features.dropna()

        # 特徴量とターゲットを分離
        feature_cols = [col for col in df_clean.columns if not col.startswith("Target_")]
        X = df_clean[feature_cols]
        y = df_clean[f"Target_{target_days}d"]

        self.feature_names = feature_cols

        logger.info(f"データ準備完了: {len(X)} サンプル, {len(feature_cols)} 特徴量")
        return X, y

    def create_models(self) -> Dict:
        """モデル群の作成"""
        models = {}

        # RandomForest
        models["random_forest"] = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )

        # Gradient Boosting
        models["gradient_boosting"] = GradientBoostingRegressor(
            n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42
        )

        # XGBoost（利用可能な場合）
        if XGBOOST_AVAILABLE:
            models["xgboost"] = xgb.XGBRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42,
                eval_metric="rmse",
            )

        return models

    def train_models(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """モデル群の学習"""
        models = self.create_models()
        trained_models = {}

        # 時系列分割で学習
        tscv = TimeSeriesSplit(n_splits=5)

        for name, model in models.items():
            logger.info(f"モデル学習中: {name}")

            # 最後の分割で学習
            train_idx, test_idx = list(tscv.split(X))[-1]
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

            # 学習
            model.fit(X_train, y_train)

            # 評価
            train_pred = model.predict(X_train)
            test_pred = model.predict(X_test)

            train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
            test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
            train_mae = mean_absolute_error(y_train, train_pred)
            test_mae = mean_absolute_error(y_test, test_pred)

            # 方向性精度
            train_direction = accuracy_score((y_train > 0), (train_pred > 0))
            test_direction = accuracy_score((y_test > 0), (test_pred > 0))

            trained_models[name] = {
                "model": model,
                "train_rmse": train_rmse,
                "test_rmse": test_rmse,
                "train_mae": train_mae,
                "test_mae": test_mae,
                "train_direction": train_direction,
                "test_direction": test_direction,
            }

            logger.info(f"{name} - Train RMSE: {train_rmse:.6f}, Test RMSE: {test_rmse:.6f}")
            logger.info(f"{name} - Train Direction: {train_direction:.3f}, Test Direction: {test_direction:.3f}")

        self.models = trained_models
        return trained_models

    def create_ensemble_prediction(self, X: pd.DataFrame, method: str = "weighted") -> np.ndarray:
        """アンサンブル予測"""
        if not self.models:
            raise ValueError("Models not trained yet")

        predictions = []
        weights = []

        for name, model_data in self.models.items():
            model = model_data["model"]
            pred = model.predict(X)
            predictions.append(pred)

            # 重み付け（テスト精度ベース）
            if method == "weighted":
                weight = model_data["test_direction"]
                weights.append(weight)
            else:
                weights.append(1.0)

        # 重み付き平均
        weights = np.array(weights)
        weights = weights / weights.sum()

        ensemble_pred = np.average(predictions, axis=0, weights=weights)
        return ensemble_pred

    def predict(self, X: pd.DataFrame, method: str = "weighted") -> Dict:
        """予測実行"""
        if not self.models:
            raise ValueError("Models not trained yet")

        # 各モデルの予測
        predictions = {}
        for name, model_data in self.models.items():
            model = model_data["model"]
            pred = model.predict(X)
            predictions[name] = pred

        # アンサンブル予測
        ensemble_pred = self.create_ensemble_prediction(X, method)
        predictions["ensemble"] = ensemble_pred

        return predictions

    def evaluate_models(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """モデル群の評価"""
        if not self.models:
            raise ValueError("Models not trained yet")

        results = {}

        for name, model_data in self.models.items():
            model = model_data["model"]
            pred = model.predict(X)

            # 評価指標
            rmse = np.sqrt(mean_squared_error(y, pred))
            mae = mean_absolute_error(y, pred)
            direction = accuracy_score((y > 0), (pred > 0))

            results[name] = {"rmse": rmse, "mae": mae, "direction_accuracy": direction}

        # アンサンブル評価
        ensemble_pred = self.create_ensemble_prediction(X)
        results["ensemble"] = {
            "rmse": np.sqrt(mean_squared_error(y, ensemble_pred)),
            "mae": mean_absolute_error(y, ensemble_pred),
            "direction_accuracy": accuracy_score((y > 0), (ensemble_pred > 0)),
        }

        return results

    def get_feature_importance(self, model_name: str = "random_forest") -> Dict:
        """特徴量重要度取得"""
        if model_name not in self.models:
            logger.error(f"Model {model_name} not found")
            return {}

        model = self.models[model_name]["model"]

        if hasattr(model, "feature_importances_"):
            importance = model.feature_importances_
            feature_importance = dict(zip(self.feature_names, importance))

            # 重要度でソート
            sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)

            return dict(sorted_features)

        return {}

    def save_models(self, directory: str = "models"):
        """モデル保存"""
        Path(directory).mkdir(exist_ok=True)

        for name, model_data in self.models.items():
            model_path = f"{directory}/{name}_model.pkl"
            joblib.dump(model_data["model"], model_path)
            logger.info(f"Model saved: {model_path}")

    def load_models(self, directory: str = "models"):
        """モデル読み込み"""
        import glob

        model_files = glob.glob(f"{directory}/*_model.pkl")

        for model_file in model_files:
            model_name = Path(model_file).stem.replace("_model", "")

            try:
                model = joblib.load(model_file)
                self.models[model_name] = {"model": model}
                logger.info(f"Model loaded: {model_name}")
            except Exception as e:
                logger.error(f"Failed to load model {model_name}: {e}")

    def generate_signals(self, X: pd.DataFrame, threshold: float = 0.01) -> pd.DataFrame:
        """売買シグナル生成"""
        predictions = self.predict(X)
        signals = pd.DataFrame(index=X.index)

        for name, pred in predictions.items():
            # シグナル生成
            signal = np.zeros(len(pred))
            signal[pred > threshold] = 1  # 買いシグナル
            signal[pred < -threshold] = -1  # 売りシグナル

            signals[f"Signal_{name}"] = signal
            signals[f"Prediction_{name}"] = pred

        return signals


# テスト実行用関数
def test_ml_prediction_system():
    """ML予測システムのテスト"""
    import yfinance as yf

    logger.info("ML予測システムテスト開始")

    # データ取得
    ticker = "7203.T"
    stock = yf.Ticker(ticker)
    df = stock.history(period="1y")

    if df.empty:
        logger.error("データ取得失敗")
        return

    logger.info(f"データ取得: {len(df)} 日分")

    # ML予測システム
    ml_system = MLPredictionSystem()

    # データ準備
    X, y = ml_system.prepare_data(df, target_days=1)

    # 学習・テスト分割
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]

    # モデル学習
    logger.info("モデル学習開始")
    trained_models = ml_system.train_models(X_train, y_train)

    # モデル評価
    logger.info("モデル評価開始")
    results = ml_system.evaluate_models(X_test, y_test)

    print("\nモデル評価結果:")
    print("-" * 60)
    for name, metrics in results.items():
        print(f"{name}:")
        print(f"  RMSE: {metrics['rmse']:.6f}")
        print(f"  MAE: {metrics['mae']:.6f}")
        print(f"  方向性精度: {metrics['direction_accuracy']:.3f}")

    # 特徴量重要度
    importance = ml_system.get_feature_importance("random_forest")
    if importance:
        print(f"\n重要特徴量（トップ10）:")
        for i, (feature, score) in enumerate(list(importance.items())[:10]):
            print(f"  {i + 1}. {feature}: {score:.4f}")

    # 最新予測
    latest_X = X.iloc[-1:]
    predictions = ml_system.predict(latest_X)

    print(f"\n最新予測:")
    for name, pred in predictions.items():
        signal = "HOLD"
        if pred[0] > 0.01:
            signal = "BUY"
        elif pred[0] < -0.01:
            signal = "SELL"
        print(f"  {name}: {pred[0]:.4f} ({signal})")

    # シグナル生成
    signals = ml_system.generate_signals(X_test)
    print(f"\nシグナル生成結果（最新5件）:")
    print(signals[["Signal_ensemble", "Prediction_ensemble"]].tail())

    return ml_system, results


if __name__ == "__main__":
    test_ml_prediction_system()
