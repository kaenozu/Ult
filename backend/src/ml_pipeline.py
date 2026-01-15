import hashlib
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from src.drift_monitor import DriftMonitor
from src.walkforward_blender import WalkForwardBlender

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Manages model artifacts and metadata.
    Stores models in a local directory structure.
    """

    def __init__(self, base_dir: str = "models"):
        self.base_dir = base_dir
        self.registry_file = os.path.join(base_dir, "registry.json")
        self._ensure_dir()
        self.registry = self._load_registry()

    def _ensure_dir(self):
        if not os.path.exists(self.base_dir):
            os.makedirs(self.base_dir)

    def _load_registry(self) -> Dict[str, Any]:
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load registry: {e}")
                return {"models": {}}
        return {"models": {}}

    def _save_registry(self):
        try:
            with open(self.registry_file, "w") as f:
                json.dump(self.registry, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save registry: {e}")

    def register_model(
        self, model_name: str, model_artifact: Any, metrics: Dict[str, float], version_tag: str = None
    ) -> str:
        """
        Saves a model artifact and updates the registry.
        Returns the version ID.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_id = version_tag or f"v_{timestamp}"

        model_dir = os.path.join(self.base_dir, model_name)
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)

        artifact_path = os.path.join(model_dir, f"{version_id}.joblib")

        try:
            joblib.dump(model_artifact, artifact_path)

            if model_name not in self.registry["models"]:
                self.registry["models"][model_name] = []

            metadata = {"version": version_id, "timestamp": timestamp, "path": artifact_path, "metrics": metrics}

            self.registry["models"][model_name].append(metadata)
            self._save_registry()

            logger.info(f"Registered model {model_name} version {version_id}")
            return version_id
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            return None

    def get_latest_model(self, model_name: str) -> Optional[Tuple[Any, Dict[str, Any]]]:
        """
        Retrieves the latest version of a model and its metadata.
        """
        if model_name not in self.registry["models"] or not self.registry["models"][model_name]:
            return None

        # Sort by timestamp descending
        versions = sorted(self.registry["models"][model_name], key=lambda x: x["timestamp"], reverse=True)
        latest_meta = versions[0]

        try:
            model = joblib.load(latest_meta["path"])
            return model, latest_meta
        except Exception as e:
            logger.error(f"Failed to load model artifact: {e}")
            return None

    def get_best_model(self, model_name: str, metric: str = "accuracy") -> Optional[Tuple[Any, Dict[str, Any]]]:
        """
        Retrieves the best performing model based on a metric.
        Assumes higher is better for the metric.
        """
        if model_name not in self.registry["models"] or not self.registry["models"][model_name]:
            return None

        versions = self.registry["models"][model_name]
        # Filter versions that have the metric
        valid_versions = [v for v in versions if metric in v["metrics"]]

        if not valid_versions:
            return self.get_latest_model(model_name)

        best_meta = max(valid_versions, key=lambda x: x["metrics"][metric])

        try:
            model = joblib.load(best_meta["path"])
            return model, best_meta
        except Exception as e:
            logger.error(f"Failed to load model artifact: {e}")
            return None


class DataVersionManager:
    """
    データセットのバージョン管理と復元をシンプルに提供。
    """

    def __init__(self, base_dir: str = "models/data_versions") -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.base_dir / "registry.json"
        self.registry = self._load_registry()

    def _load_registry(self) -> Dict[str, Any]:
        if self.registry_file.exists():
            try:
                return json.loads(self.registry_file.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("Failed to load data registry: %s", exc)
        return {"versions": []}

    def _save_registry(self) -> None:
        try:
            self.registry_file.write_text(json.dumps(self.registry, indent=2), encoding="utf-8")
        except Exception as exc:
            logger.error("Failed to save data registry: %s", exc)

    def snapshot(self, df: pd.DataFrame, tag: Optional[str] = None) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version = tag or f"data_{timestamp}"
        path = self.base_dir / f"{version}.parquet"
        try:
            try:
                df.to_parquet(path, index=False)
            except Exception:
                # Parquet依存がない環境ではCSVで代替
                path = path.with_suffix(".csv")
                df.to_csv(path, index=False)
            checksum = hashlib.md5(df.to_csv(index=False).encode("utf-8")).hexdigest()
            self.registry["versions"].append({"version": version, "path": str(path), "checksum": checksum})
            self._save_registry()
            return version
        except Exception as exc:
            logger.error("Failed to snapshot data: %s", exc)
            return ""

    def restore(self, version: str) -> Optional[pd.DataFrame]:
        entry = next((v for v in self.registry.get("versions", []) if v.get("version") == version), None)
        if not entry:
            logger.warning("Data version %s not found", version)
            return None
        try:
            path = Path(entry["path"])
            if path.suffix == ".csv":
                return pd.read_csv(path)
            return pd.read_parquet(path)
        except Exception as exc:
            logger.error("Failed to restore data %s: %s", version, exc)
            return None

    def restore_latest(self) -> Optional[pd.DataFrame]:
        if not self.registry.get("versions"):
            return None
        latest = sorted(self.registry["versions"], key=lambda x: x.get("version", ""), reverse=True)[0]
        return self.restore(latest.get("version"))


class ContinuousLearner:
    """
    Orchestrates the training and evaluation of models.
    """

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self.data_registry = DataVersionManager()
        self.drift_monitor = DriftMonitor()

    def train_and_evaluate(self, model_name: str, trainer_func, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs the training function and registers the model.

        trainer_func: A function that takes data and returns (model, metrics)
        """
        logger.info(f"Starting training for {model_name}...")
        try:
            model, metrics = trainer_func(data)
            version_id = self.registry.register_model(model_name, model, metrics)

            return {"status": "success", "version": version_id, "metrics": metrics}
        except Exception as e:
            logger.error(f"Training failed for {model_name}: {e}")
            return {"status": "failed", "error": str(e)}

    def train_walkforward_blend(
        self, model_name: str, data: pd.DataFrame, target_col: str = "Close", external_features: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        LightGBM/RandomForest/Linear ブレンディングをウォークフォワード検証で学習し、モデルとデータをバージョン管理する。
        """
        logger.info("Starting walk-forward blended training for %s", model_name)
        blender = WalkForwardBlender()
        try:
            metrics = blender.fit(data, target_col=target_col, external_features=external_features)
            version_id = self.registry.register_model(model_name, blender, metrics)
            data_version = self.data_registry.snapshot(data, tag=f"{model_name}_{version_id}") if version_id else ""

            # ベースラインとしてドリフト監視に使用
            self.drift_monitor.set_reference(data.select_dtypes(include=[np.number]))

            return {
                "status": "success",
                "version": version_id,
                "metrics": metrics,
                "data_version": data_version,
            }
        except Exception as exc:
            logger.error("Walk-forward blend training failed: %s", exc)
            return {"status": "failed", "error": str(exc)}

    def retrain_if_drift(
        self,
        model_name: str,
        model_obj: Any,
        new_data: pd.DataFrame,
        target_col: str = "Close",
        external_features: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        ドリフト検知を用いた再学習のオーケストレーション。
        model_obj に needs_retrain(df) がある場合はそれを使用。
        """
        try:
            needs_retrain = False
            drift_details: Dict[str, Any] = {}

            if hasattr(model_obj, "needs_retrain"):
                needs_retrain, drift_details = model_obj.needs_retrain(
                    new_data.copy(), external_features=external_features
                )
            else:
                check = self.drift_monitor.check(new_data.select_dtypes(include=[np.number]))
                needs_retrain = check.drift_detected
                drift_details = check.details

            if not needs_retrain:
                return {"status": "ok", "retrained": False, "reason": "no drift detected"}

            logger.info("Drift detected for %s: %s", model_name, drift_details)
            return self.train_walkforward_blend(
                model_name, new_data, target_col=target_col, external_features=external_features
            )
        except Exception as exc:
            logger.error("Drift-based retrain failed: %s", exc)
            return {"status": "failed", "error": str(exc)}
