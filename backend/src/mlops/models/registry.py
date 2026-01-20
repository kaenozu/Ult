"""
Model Registry and Version Management
モデルレジストリとバージョン管理
"""

import hashlib
import json
import logging
import pickle
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

from .models import ModelMetadata, ModelStatus

logger = logging.getLogger(__name__)


class ModelRegistry:
    """モデルレジストリ"""

    def __init__(self, registry_path: str = "models/registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)
        self.db_path = self.registry_path / "models.db"
        self._init_database()

    def _init_database(self):
        """データベースを初期化"""
        import sqlite3

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS models (
                model_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT NOT NULL,
                framework TEXT,
                model_type TEXT,
                description TEXT,
                tags TEXT,
                hyperparameters TEXT,
                metrics TEXT,
                file_path TEXT,
                file_size INTEGER,
                checksum TEXT,
                training_data_hash TEXT,
                author TEXT,
                environment TEXT
            )
        """)

        conn.commit()
        conn.close()

    def register_model(
        self,
        name: str,
        version: str,
        model_object: Any,
        framework: str,
        model_type: str,
        description: str = "",
        tags: List[str] = None,
        hyperparameters: Dict[str, Any] = None,
        metrics: Dict[str, float] = None,
        author: str = "",
        environment: Dict[str, str] = None,
    ) -> str:
        """モデルを登録"""

        model_id = f"{name}_{version}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # モデルファイルを保存
        model_dir = self.registry_path / model_id
        model_dir.mkdir(exist_ok=True)
        model_file_path = model_dir / "model.pkl"

        try:
            with open(model_file_path, "wb") as f:
                pickle.dump(model_object, f)

            # チェックサムを計算
            checksum = self._calculate_checksum(model_file_path)
            file_size = model_file_path.stat().st_size

            # メタデータを作成
            metadata = ModelMetadata(
                model_id=model_id,
                name=name,
                version=version,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                status=ModelStatus.READY,
                framework=framework,
                model_type=model_type,
                description=description,
                tags=tags or [],
                hyperparameters=hyperparameters or {},
                metrics=metrics or {},
                file_path=str(model_file_path),
                file_size=file_size,
                checksum=checksum,
                author=author,
                environment=environment or {},
            )

            # データベースに保存
            self._save_metadata(metadata)

            logger.info(f"Model registered: {model_id}")
            return model_id

        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            # エラーの場合は作成したディレクトリを削除
            if model_dir.exists():
                shutil.rmtree(model_dir)
            raise

    def get_model(self, model_id: str) -> Any:
        """モデルを取得"""

        metadata = self.get_metadata(model_id)
        if not metadata:
            raise ValueError(f"Model not found: {model_id}")

        try:
            with open(metadata.file_path, "rb") as f:
                model = pickle.load(f)

            logger.info(f"Model loaded: {model_id}")
            return model

        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise

    def get_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        """モデルメタデータを取得"""

        import sqlite3

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM models WHERE model_id = ?", (model_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return self._row_to_metadata(row)

    def list_models(
        self,
        name: Optional[str] = None,
        framework: Optional[str] = None,
        status: Optional[ModelStatus] = None,
        limit: int = 100,
    ) -> List[ModelMetadata]:
        """モデル一覧を取得"""

        import sqlite3

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = "SELECT * FROM models WHERE 1=1"
        params = []

        if name:
            query += " AND name = ?"
            params.append(name)

        if framework:
            query += " AND framework = ?"
            params.append(framework)

        if status:
            query += " AND status = ?"
            params.append(status.value)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        conn.close()

        return [self._row_to_metadata(row) for row in rows]

    def update_model_status(self, model_id: str, status: ModelStatus) -> bool:
        """モデルステータスを更新"""

        import sqlite3

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE models SET status = ?, updated_at = ? WHERE model_id = ?",
            (status.value, datetime.now().isoformat(), model_id),
        )

        success = cursor.rowcount > 0
        conn.commit()
        conn.close()

        if success:
            logger.info(f"Model status updated: {model_id} -> {status.value}")

        return success

    def delete_model(self, model_id: str) -> bool:
        """モデルを削除"""

        metadata = self.get_metadata(model_id)
        if not metadata:
            return False

        try:
            # ファイルを削除
            model_dir = Path(metadata.file_path).parent
            if model_dir.exists():
                shutil.rmtree(model_dir)

            # データベースから削除
            import sqlite3

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("DELETE FROM models WHERE model_id = ?", (model_id,))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()

            if success:
                logger.info(f"Model deleted: {model_id}")

            return success

        except Exception as e:
            logger.error(f"Failed to delete model {model_id}: {e}")
            return False

    def promote_model(
        self, model_id: str, target_status: ModelStatus = ModelStatus.DEPLOYED
    ) -> bool:
        """モデルをプロモート"""

        metadata = self.get_metadata(model_id)
        if not metadata:
            return False

        # ステータスチェック
        if metadata.status != ModelStatus.READY:
            logger.warning(
                f"Cannot promote model {model_id} from status {metadata.status}"
            )
            return False

        return self.update_model_status(model_id, target_status)

    def get_model_versions(self, name: str) -> List[ModelMetadata]:
        """モデルの全バージョンを取得"""

        return self.list_models(name=name, limit=50)

    def get_latest_model(self, name: str) -> Optional[ModelMetadata]:
        """最新のモデルを取得"""

        models = self.get_model_versions(name)
        return models[0] if models else None

    def _save_metadata(self, metadata: ModelMetadata):
        """メタデータを保存"""

        import sqlite3

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO models (
                model_id, name, version, created_at, updated_at, status,
                framework, model_type, description, tags, hyperparameters,
                metrics, file_path, file_size, checksum, training_data_hash,
                author, environment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                metadata.model_id,
                metadata.name,
                metadata.version,
                metadata.created_at.isoformat(),
                metadata.updated_at.isoformat(),
                metadata.status.value,
                metadata.framework,
                metadata.model_type,
                metadata.description,
                json.dumps(metadata.tags),
                json.dumps(metadata.hyperparameters),
                json.dumps(metadata.metrics),
                metadata.file_path,
                metadata.file_size,
                metadata.checksum,
                metadata.training_data_hash,
                metadata.author,
                json.dumps(metadata.environment),
            ),
        )

        conn.commit()
        conn.close()

    def _row_to_metadata(self, row: sqlite3.Row) -> ModelMetadata:
        """DB行をメタデータに変換"""

        return ModelMetadata(
            model_id=row["model_id"],
            name=row["name"],
            version=row["version"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            status=ModelStatus(row["status"]),
            framework=row["framework"],
            model_type=row["model_type"],
            description=row["description"] or "",
            tags=json.loads(row["tags"]) if row["tags"] else [],
            hyperparameters=json.loads(row["hyperparameters"])
            if row["hyperparameters"]
            else {},
            metrics=json.loads(row["metrics"]) if row["metrics"] else {},
            file_path=row["file_path"] or "",
            file_size=row["file_size"] or 0,
            checksum=row["checksum"] or "",
            training_data_hash=row["training_data_hash"] or "",
            author=row["author"] or "",
            environment=json.loads(row["environment"]) if row["environment"] else {},
        )

    def _calculate_checksum(self, file_path: Path) -> str:
        """ファイルのチェックサムを計算"""

        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)

        return hash_md5.hexdigest()

    def validate_model(self, model_id: str) -> bool:
        """モデルの整合性を検証"""

        metadata = self.get_metadata(model_id)
        if not metadata:
            return False

        try:
            # ファイル存在チェック
            if not Path(metadata.file_path).exists():
                return False

            # チェックサム検証
            current_checksum = self._calculate_checksum(Path(metadata.file_path))
            if current_checksum != metadata.checksum:
                logger.warning(f"Model checksum mismatch: {model_id}")
                return False

            # モデル読み込みテスト
            self.get_model(model_id)

            return True

        except Exception as e:
            logger.error(f"Model validation failed for {model_id}: {e}")
            return False
