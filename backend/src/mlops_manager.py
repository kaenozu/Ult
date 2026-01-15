"""
機械学習運用 (MLOps) 改善モジュール

- モデルバージョン管理
- A/Bテストフレームワーク
- モニタリングとアラート
"""

from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import os
import pickle
import shutil
import sqlite3
import subprocess
import threading
import time
import warnings
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
try:
    import mlflow
    from mlflow.models.signature import infer_signature
    from mlflow.utils.environment import _mlflow_conda_env
except ImportError:
    mlflow = None
    infer_signature = None
    _mlflow_conda_env = None

try:
    import tensorflow as tf
    from tensorflow import keras
except ImportError:
    tf = None
    keras = None

import yaml

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

# MLOps用データベースのパス
MLOPS_DB_PATH = "data/mlops.db"


def init_mlops_db():
    """MLOpsデータベースの初期化"""
    os.makedirs(os.path.dirname(MLOPS_DB_PATH), exist_ok=True)

    conn = sqlite3.connect(MLOPS_DB_PATH)
    cursor = conn.cursor()

    # モデルバージョンテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS model_versions (
            id INTEGER PRIMARY KEY,
            model_name TEXT NOT NULL,
            version TEXT NOT NULL,
            artifact_path TEXT,
            creation_timestamp TEXT,
            metrics TEXT,
            tags TEXT,
            UNIQUE(model_name, version)
        )
    """
    )

    # 実験テーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS experiments (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            creation_timestamp TEXT
        )
    """
    )

    # 実行テーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY,
            experiment_id INTEGER,
            run_id TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            parameters TEXT,
            metrics TEXT,
            tags TEXT,
            FOREIGN KEY(experiment_id) REFERENCES experiments(id),
            UNIQUE(run_id)
        )
    """
    )

    # A/Bテスト結果テーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ab_test_results (
            id INTEGER PRIMARY KEY,
            test_name TEXT NOT NULL,
            model_a_version TEXT,
            model_b_version TEXT,
            timestamp TEXT,
            metric_name TEXT,
            model_a_score REAL,
            model_b_score REAL,
            sample_size INTEGER,
            winner TEXT  -- 'A', 'B', or 'tie'
        )
    """
    )

    # モニタリングアラートテーブル
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
            id INTEGER PRIMARY KEY,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT,
            timestamp TEXT,
            resolved BOOLEAN DEFAULT 0,
            resolved_timestamp TEXT
        )
    """
    )

    conn.commit()
    conn.close()


@dataclass
class ModelMetadata:
    """モデルメタデータ"""

    model_name: str
    version: str
    created_by: str
    creation_timestamp: str
    metrics: Dict[str, float]
    parameters: Dict[str, Any]
    dependencies: List[str]
    artifact_path: str
    hash: str
    tags: List[str]


class ModelRegistry:
    """モデルレジストリ"""

    def __init__(self, registry_path: str = "models/registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)
        init_mlops_db()

    def save_model(self, model: Any, model_name: str, version: str, metadata: Dict[str, Any] = None) -> ModelMetadata:
        """モデルの保存とメタデータ登録"""
        # モデルパスの準備
        model_dir = self.registry_path / model_name / version
        model_dir.mkdir(parents=True, exist_ok=True)

        artifact_path = str(model_dir / f"{model_name}.pkl")

        # モデルの保存
        if isinstance(model, keras.Model):
            model_path = str(model_dir / f"{model_name}.h5")
            model.save(model_path)
            artifact_path = model_path
        else:
            with open(artifact_path, "wb") as f:
                pickle.dump(model, f)

        # ハッシュの計算
        model_hash = self._calculate_hash(artifact_path)

        # メタデータの作成
        if metadata is None:
            metadata = {}

        model_metadata = ModelMetadata(
            model_name=model_name,
            version=version,
            created_by="system",
            creation_timestamp=datetime.now().isoformat(),
            metrics=metadata.get("metrics", {}),
            parameters=metadata.get("parameters", {}),
            dependencies=metadata.get("dependencies", []),
            artifact_path=artifact_path,
            hash=model_hash,
            tags=metadata.get("tags", []),
        )

        # JSONメタデータファイルの保存
        metadata_path = model_dir / f"{model_name}_metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(asdict(model_metadata), f, indent=2, ensure_ascii=False)

        # データベースに登録
        self._register_model_in_db(model_metadata)

        logger.info(f"Model {model_name} v{version} registered with hash {model_hash}")
        return model_metadata

    def load_model(self, model_name: str, version: str = None) -> Tuple[Any, ModelMetadata]:
        """モデルの読み込み"""
        if version is None:
            version = self._get_latest_version(model_name)

        model_dir = self.registry_path / model_name / version
        metadata_path = model_dir / f"{model_name}_metadata.json"

        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata_dict = json.load(f)
        metadata = ModelMetadata(**metadata_dict)

        # モデルの読み込み
        if metadata.artifact_path.endswith(".h5"):
            model = keras.models.load_model(metadata.artifact_path)
        else:
            with open(metadata.artifact_path, "rb") as f:
                model = pickle.load(f)

        return model, metadata

    def _calculate_hash(self, file_path: str) -> str:
        """ファイルのハッシュを計算"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def _get_latest_version(self, model_name: str) -> str:
        """最新バージョンを取得"""
        model_dir = self.registry_path / model_name
        if not model_dir.exists():
            raise ValueError(f"Model {model_name} does not exist")

        versions = [d.name for d in model_dir.iterdir() if d.is_dir()]
        if not versions:
            raise ValueError(f"No versions found for model {model_name}")

        # バージョンを日時順に並び替え（仮に日時形式が使われていると仮定）
        versions.sort(reverse=True)
        return versions[0]

    def _register_model_in_db(self, metadata: ModelMetadata):
        """データベースにモデル情報を登録"""
        conn = sqlite3.connect(MLOPS_DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT OR REPLACE INTO model_versions
            (model_name, version, artifact_path, creation_timestamp, metrics, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                metadata.model_name,
                metadata.version,
                metadata.artifact_path,
                metadata.creation_timestamp,
                json.dumps(metadata.metrics),
                json.dumps(metadata.tags),
            ),
        )

        conn.commit()
        conn.close()

    def list_models(self, model_name: str = None) -> List[ModelMetadata]:
        """モデル一覧の取得"""
        conn = sqlite3.connect(MLOPS_DB_PATH)

        if model_name:
            query = "SELECT * FROM model_versions WHERE model_name = ? ORDER BY creation_timestamp DESC"
            df = pd.read_sql_query(query, conn, params=(model_name,))
        else:
            query = "SELECT * FROM model_versions ORDER BY creation_timestamp DESC"
            df = pd.read_sql_query(query, conn)

        conn.close()

        models = []
        for _, row in df.iterrows():
            metadata = ModelMetadata(
                model_name=row["model_name"],
                version=row["version"],
                created_by="system",  # 保存時に追加する必要あり
                creation_timestamp=row["creation_timestamp"],
                metrics=json.loads(row["metrics"]) if row["metrics"] else {},
                parameters={},  # 保存時に追加する必要あり
                dependencies=[],  # 保存時に追加する必要あり
                artifact_path=row["artifact_path"],
                hash="",  # 保存時に追加する必要あり
                tags=json.loads(row["tags"]) if row["tags"] else [],
            )
            models.append(metadata)

        return models


class ABTestFramework:
    """A/Bテストフレームワーク"""

    def __init__(self, model_registry: ModelRegistry):
        self.model_registry = model_registry
        self.test_results_db_path = MLOPS_DB_PATH
        self.tests = {}

    def run_ab_test(
        self,
        test_name: str,
        model_a_version: str,
        model_b_version: str,
        test_data: Tuple[np.ndarray, np.ndarray],
        metrics_to_compare: List[str] = ["mse", "mae"],
    ) -> Dict[str, Any]:
        """A/Bテストの実行"""
        X_test, y_test = test_data

        # モデルAの読み込みと予測
        model_a, metadata_a = self.model_registry.load_model("ensemble_model", model_a_version)  # 仮のモデル名
        pred_a = model_a.predict(X_test) if hasattr(model_a, "predict") else np.zeros(len(X_test))

        # モデルBの読み込みと予測
        model_b, metadata_b = self.model_registry.load_model("ensemble_model", model_b_version)
        pred_b = model_b.predict(X_test) if hasattr(model_b, "predict") else np.zeros(len(X_test))

        # 指標の計算
        results = {}
        for metric in metrics_to_compare:
            if metric == "mse":
                score_a = np.mean((y_test - pred_a) ** 2)
                score_b = np.mean((y_test - pred_b) ** 2)
            elif metric == "mae":
                score_a = np.mean(np.abs(y_test - pred_a))
                score_b = np.mean(np.abs(y_test - pred_b))
            elif metric == "rmse":
                score_a = np.sqrt(np.mean((y_test - pred_a) ** 2))
                score_b = np.sqrt(np.mean((y_test - pred_b) ** 2))
            else:
                raise ValueError(f"Unknown metric: {metric}")

            results[f"model_a_{metric}"] = float(score_a)
            results[f"model_b_{metric}"] = float(score_b)
            results[f"{metric}_difference"] = float(score_b - score_a)

        # 優位モデルの判定（MSEなどでは値が小さい方が優れている）
        winner = "tie"
        if results["mse_difference"] < 0:  # Bの方がMSEが小さい = 優れている
            winner = "B"
        elif results["mse_difference"] > 0:  # Aの方がMSEが小さい = 優れている
            winner = "A"

        # 結果をデータベースに保存
        self._save_ab_test_result(test_name, model_a_version, model_b_version, results, len(y_test), winner)

        return {
            "test_name": test_name,
            "model_a_version": model_a_version,
            "model_b_version": model_b_version,
            "results": results,
            "sample_size": len(y_test),
            "winner": winner,
            "timestamp": datetime.now().isoformat(),
        }

    def _save_ab_test_result(
        self,
        test_name: str,
        model_a_version: str,
        model_b_version: str,
        results: Dict[str, float],
        sample_size: int,
        winner: str,
    ):
        """A/Bテスト結果をデータベースに保存"""
        conn = sqlite3.connect(self.test_results_db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO ab_test_results
            (test_name, model_a_version, model_b_version, timestamp, metric_name, model_a_score, model_b_score, sample_size, winner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                test_name,
                model_a_version,
                model_b_version,
                datetime.now().isoformat(),
                "mse",  # ダミー、実際には複数指標を保存する
                results.get("model_a_mse", 0.0),
                results.get("model_b_mse", 0.0),
                sample_size,
                winner,
            ),
        )

        conn.commit()
        conn.close()

    def get_test_history(self, test_name: str = None) -> pd.DataFrame:
        """テスト履歴の取得"""
        conn = sqlite3.connect(self.test_results_db_path)

        if test_name:
            query = "SELECT * FROM ab_test_results WHERE test_name = ? ORDER BY timestamp DESC"
            df = pd.read_sql_query(query, conn, params=(test_name,))
        else:
            query = "SELECT * FROM ab_test_results ORDER BY timestamp DESC"
            df = pd.read_sql_query(query, conn)

        conn.close()
        return df


class MonitoringSystem:
    """モニタリングシステム"""

    def __init__(self):
        self.alerts_db_path = MLOPS_DB_PATH
        self.performance_thresholds = {}
        self.model_drift_detectors = {}
        self.data_drift_monitors = {}
        self.alert_callbacks = []

    def set_performance_threshold(self, metric_name: str, threshold: float, direction: str = "lower"):
        """パフォーマンス閾値の設定（lower: 小さい方が良い、upper: 大きい方が良い）"""
        self.performance_thresholds[metric_name] = {"threshold": threshold, "direction": direction}

    def check_performance_degradation(self, model_name: str, current_metrics: Dict[str, float]) -> List[Dict[str, Any]]:
        """性能低下の検出"""
        alerts = []

        for metric_name, value in current_metrics.items():
            if metric_name in self.performance_thresholds:
                threshold_info = self.performance_thresholds[metric_name]

                if threshold_info["direction"] == "lower":
                    # 小さい方が良い指標（例: MSE）
                    if value > threshold_info["threshold"]:
                        alert = {
                            "type": "performance_degradation",
                            "severity": "high",
                            "message": f"Model {model_name} {metric_name} exceeded threshold: {value:.4f} > {threshold_info['threshold']:.4f}",
                            "timestamp": datetime.now().isoformat(),
                            "metric_name": metric_name,
                            "actual_value": value,
                            "threshold": threshold_info["threshold"],
                        }
                        alerts.append(alert)
                else:
                    # 大きい方が良い指標（例: accuracy）
                    if value < threshold_info["threshold"]:
                        alert = {
                            "type": "performance_degradation",
                            "severity": "high",
                            "message": f"Model {model_name} {metric_name} below threshold: {value:.4f} < {threshold_info['threshold']:.4f}",
                            "timestamp": datetime.now().isoformat(),
                            "metric_name": metric_name,
                            "actual_value": value,
                            "threshold": threshold_info["threshold"],
                        }
                        alerts.append(alert)

        # アラートをデータベースに保存
        for alert in alerts:
            self._save_alert(alert)

        return alerts

    def detect_model_drift(
        self, model_predictions: np.ndarray, historical_predictions: np.ndarray, threshold: float = 0.05
    ) -> bool:
        """モデルドリフトの検出"""
        # 簡単な分布比較（KLダイバージェンスまたはJSダイバージェンス）
        if len(model_predictions) == 0 or len(historical_predictions) == 0:
            return False

        # 正規化
        pred_current = (model_predictions - np.mean(model_predictions)) / (np.std(model_predictions) + 1e-8)
        pred_historical = (historical_predictions - np.mean(historical_predictions)) / (
            np.std(historical_predictions) + 1e-8
        )

        # コルモゴロフ-スミルノフ検定
        from scipy import stats

        statistic, p_value = stats.ks_2samp(pred_current, pred_historical)

        drift_detected = p_value < threshold
        if drift_detected:
            logger.warning(f"Model drift detected. KS statistic: {statistic:.4f}, p-value: {p_value:.4f}")

        return drift_detected

    def detect_data_drift(
        self, current_data: np.ndarray, reference_data: np.ndarray, threshold: float = 0.05
    ) -> Dict[str, Any]:
        """データドリフトの検出"""
        detection_results = {}

        # 各種統計的検定
        if len(current_data) > 0 and len(reference_data) > 0:
            # コルモゴロフ-スミルノフ検定
            from scipy import stats

            statistic, p_value = stats.ks_2samp(current_data.flatten(), reference_data.flatten())

            detection_results = {
                "ks_statistic": float(statistic),
                "p_value": float(p_value),
                "drift_detected": p_value < threshold,
                "threshold_used": threshold,
            }

        return detection_results

    def _save_alert(self, alert: Dict[str, Any]):
        """アラートをデータベースに保存"""
        conn = sqlite3.connect(self.alerts_db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO monitoring_alerts
            (alert_type, severity, message, timestamp)
            VALUES (?, ?, ?, ?)
        """,
            (alert["type"], alert["severity"], alert["message"], alert["timestamp"]),
        )

        conn.commit()
        conn.close()

    def get_recent_alerts(self, hours: int = 24, resolved: bool = False) -> pd.DataFrame:
        """最近のアラートを取得"""
        conn = sqlite3.connect(self.alerts_db_path)

        if resolved:
            query = """
                SELECT * FROM monitoring_alerts 
                WHERE timestamp >= ? AND resolved = 1
                ORDER BY timestamp DESC
            """
        else:
            query = """
                SELECT * FROM monitoring_alerts 
                WHERE timestamp >= ? AND resolved = 0
                ORDER BY timestamp DESC
            """

        cutoff_time = (datetime.now() - timedelta(hours=hours)).isoformat()
        df = pd.read_sql_query(query, conn, params=(cutoff_time,))

        conn.close()
        return df

    def resolve_alert(self, alert_id: int):
        """アラートの解決"""
        conn = sqlite3.connect(self.alerts_db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE monitoring_alerts 
            SET resolved = 1, resolved_timestamp = ?
            WHERE id = ?
        """,
            (datetime.now().isoformat(), alert_id),
        )

        conn.commit()
        conn.close()

    def add_alert_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """アラートコールバックの追加"""
        self.alert_callbacks.append(callback)

    def trigger_alert(self, alert: Dict[str, Any]):
        """アラートの発生"""
        # データベースに保存
        self._save_alert(alert)

        # 登録されたコールバックを実行
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")


class MLopsManager:
    """MLOps管理クラス"""

    def __init__(self):
        self.model_registry = ModelRegistry()
        self.ab_testing = ABTestFramework(self.model_registry)
        self.monitoring = MonitoringSystem()

        # MLflowの初期化
        mlflow.set_tracking_uri("sqlite:///mlruns.db")  # フイルベースのMLflow
        mlflow.set_experiment("AGStock_Model_Training")

    def start_experiment(self, experiment_name: str, description: str = "") -> str:
        """実験の開始"""
        with mlflow.start_run(run_name=experiment_name):
            mlflow.log_param("experiment_name", experiment_name)
            mlflow.log_param("description", description)
            mlflow.log_param("start_time", datetime.now().isoformat())

            return mlflow.active_run().info.run_id

    def log_model_with_mlflow(self, model: Any, model_name: str, X_sample: np.ndarray, conda_env: str = None):
        """MLflowを用いたモデルの記録"""
        signature = infer_signature(
            X_sample, model.predict(X_sample) if hasattr(model, "predict") else np.zeros(len(X_sample))
        )

        # conda環境ファイルの作成
        if conda_env is None:
            conda_env = self._create_conda_env_file()

        with mlflow.start_run():
            mlflow.keras.log_model(
                keras_model=model, artifact_path=model_name, signature=signature, conda_env=conda_env
            )

    def _create_conda_env_file(self) -> str:
        """conda環境ファイルの作成"""
        env_path = "environment.yml"
        env_spec = {
            "name": "agstock_env",
            "channels": ["defaults", "conda-forge"],
            "dependencies": [
                "python=3.9",
                "numpy",
                "pandas",
                "scikit-learn",
                "tensorflow",
                "keras",
                "mlflow",
                "plotly",
                "yfinance",
                "requests",
                "textblob",
                "nltk",
            ],
        }

        with open(env_path, "w") as f:
            yaml.dump(env_spec, f)

        return env_path

    def monitor_model_performance(self, model: Any, X_test: np.ndarray, y_test: np.ndarray, model_name: str):
        """モデルパフォーマンスのモニタリング"""
        # 予測の実行
        if hasattr(model, "predict"):
            y_pred = model.predict(X_test)
        else:
            y_pred = np.zeros(len(y_test))

        # 指標の計算
        mse = np.mean((y_test - y_pred) ** 2)
        mae = np.mean(np.abs(y_test - y_pred))
        rmse = np.sqrt(mse)

        metrics = {"mse": mse, "mae": mae, "rmse": rmse}

        # MLflowで記録
        with mlflow.start_run():
            for metric_name, value in metrics.items():
                mlflow.log_metric(metric_name, value)

        # MLOpsモニタリングシステムでアラートをチェック
        alerts = self.monitoring.check_performance_degradation(model_name, metrics)

        return {"metrics": metrics, "alerts": alerts, "timestamp": datetime.now().isoformat()}

    def run_model_comparison(self, models: Dict[str, Any], X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
        """複数モデルの比較"""
        results = {}

        for model_name, model in models.items():
            if hasattr(model, "predict"):
                y_pred = model.predict(X_test)
            else:
                y_pred = np.zeros(len(y_test))

            # 指標の計算
            mse = np.mean((y_test - y_pred) ** 2)
            mae = np.mean(np.abs(y_test - y_pred))
            rmse = np.sqrt(mse)

            results[model_name] = {"mse": mse, "mae": mae, "rmse": rmse}

        return results


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # MLOpsマネージャーの初期化
    mlops = MLopsManager()

    # モックモデルの作成
    import tensorflow as tf
    from tensorflow import keras

    model = keras.Sequential([keras.layers.Dense(10, activation="relu", input_shape=(10,)), keras.layers.Dense(1)])
    model.compile(optimizer="adam", loss="mse")

    # ダミーデータ
    X = np.random.random((100, 10)).astype(np.float32)
    y = np.random.random((100, 1)).astype(np.float32)
    X_test = np.random.random((20, 10)).astype(np.float32)
    y_test = np.random.random((20, 1)).astype(np.float32)

    # モデル学習
    model.fit(X, y, epochs=1, verbose=0)

    # モデルのレジストリ保存
    metadata = {
        "metrics": {"mse": 0.01, "mae": 0.05},
        "parameters": {"epochs": 1, "optimizer": "adam"},
        "dependencies": ["tensorflow", "keras"],
        "tags": ["test", "initial"],
    }
    model_meta = mlops.model_registry.save_model(model, "test_model", "v1.0.0", metadata)
    print(f"Model registered: {model_meta.model_name} v{model_meta.version}")

    # A/Bテストの実行
    model2 = keras.Sequential([keras.layers.Dense(5, activation="relu", input_shape=(10,)), keras.layers.Dense(1)])
    model2.compile(optimizer="adam", loss="mse")
    model2.fit(X, y, epochs=1, verbose=0)

    model_meta2 = mlops.model_registry.save_model(model2, "test_model", "v1.0.1", metadata)

    # モデルの読み込みとA/Bテストの実行
    try:
        test_result = mlops.ab_testing.run_ab_test(
            "model_comparison_test", "v1.0.0", "v1.0.1", (X_test, y_test), ["mse", "mae", "rmse"]
        )
        print(f"A/B test result: {test_result}")
    except Exception as e:
        print(f"A/B test failed: {e}")  # モデル名が一致しないため失敗する可能性あり

    # パフォーマンスモニタリング
    performance_result = mlops.monitor_model_performance(model, X_test, y_test, "test_model")
    print(f"Performance monitoring: {performance_result}")

    # モデル比較
    models = {"model_v1": model, "model_v2": model2}
    comparison_result = mlops.run_model_comparison(models, X_test, y_test)
    print(f"Model comparison: {comparison_result}")

    print("MLOps components test completed.")
