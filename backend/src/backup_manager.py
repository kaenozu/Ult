"""
Backup Manager - 自動バックアップシステム

機能:
    pass
- 日次自動バックアップ
- 古いバックアップの自動削除
- バックアップからの復元
"""

import logging
import os
import shutil
import sqlite3
from datetime import datetime, timedelta
from typing import List, Optional


class BackupManager:
    """データベースバックアップ管理クラス"""

    def __init__(
        self,
        source_db: str = "paper_trading.db",
        backup_dir: str = "backups",
        max_backups: int = 30,
    ):
        """
        Args:
            source_db: バックアップ対象のDBファイル
            backup_dir: バックアップ保存先ディレクトリ
            max_backups: 保持するバックアップの最大日数
        """
        self.source_db = source_db
        self.backup_dir = backup_dir
        self.max_backups = max_backups

        # バックアップディレクトリを作成
        os.makedirs(self.backup_dir, exist_ok=True)

        # ロギング設定
        self.logger = logging.getLogger(__name__)

    def auto_backup(self) -> Optional[str]:
        """
        自動バックアップを実行

        Returns:
            バックアップファイルのパス（失敗時はNone）
        """
        try:
            # ソースDBが存在しない場合はスキップ
            if not os.path.exists(self.source_db):
                self.logger.warning(f"Source database not found: {self.source_db}")
                return None

            # タイムスタンプ付きファイル名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"paper_trading_{timestamp}.db"
            backup_path = os.path.join(self.backup_dir, backup_filename)

            # DBをコピー
            shutil.copy2(self.source_db, backup_path)

            # バックアップが正常か検証
            if self._verify_backup(backup_path):
                self.logger.info(f"Backup created successfully: {backup_path}")

                # 古いバックアップを削除
                self.cleanup_old_backups()

                return backup_path
            else:
                self.logger.error(f"Backup verification failed: {backup_path}")
                # 破損したバックアップを削除
                if os.path.exists(backup_path):
                    os.remove(backup_path)
                return None

        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            return None

    def _verify_backup(self, backup_path: str) -> bool:
        """
        バックアップファイルが正常か検証

        Args:
            backup_path: バックアップファイルのパス

        Returns:
            True if valid, False otherwise
        """
        try:
            # SQLiteデータベースとして開けるか確認
            conn = sqlite3.connect(backup_path)
            cursor = conn.cursor()

            # テーブルが存在するか確認
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            conn.close()

            # テーブルが1つ以上あればOK
            return len(tables) > 0

        except Exception as e:
            self.logger.error(f"Backup verification error: {e}")
            return False

    def cleanup_old_backups(self, days: Optional[int] = None) -> int:
        """
        古いバックアップを削除

        Args:
            days: 保持する日数（Noneの場合はmax_backupsを使用）

        Returns:
            削除したファイル数
        """
        if days is None:
            days = self.max_backups

        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = 0

        try:
            # バックアップディレクトリ内のファイルをスキャン
            for filename in os.listdir(self.backup_dir):
                if not filename.startswith("paper_trading_"):
                    continue

                filepath = os.path.join(self.backup_dir, filename)

                # ファイルの更新日時を取得
                file_time = datetime.fromtimestamp(os.path.getmtime(filepath))

                # 古いファイルを削除
                if file_time < cutoff_date:
                    os.remove(filepath)
                    deleted_count += 1
                    self.logger.info(f"Deleted old backup: {filename}")

            if deleted_count > 0:
                self.logger.info(f"Cleaned up {deleted_count} old backup(s)")

        except Exception as e:
            self.logger.error(f"Cleanup failed: {e}")

        return deleted_count

    def list_backups(self) -> List[dict]:
        """
        利用可能なバックアップのリストを取得

        Returns:
            バックアップ情報のリスト
        """
        backups = []

        try:
            for filename in os.listdir(self.backup_dir):
                if not filename.startswith("paper_trading_"):
                    continue

                filepath = os.path.join(self.backup_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                file_size = os.path.getsize(filepath)

                backups.append(
                    {
                        "filename": filename,
                        "path": filepath,
                        "created": file_time,
                        "size_mb": file_size / (1024 * 1024),
                    }
                )

            # 日付順にソート（新しい順）
            backups.sort(key=lambda x: x["created"], reverse=True)

        except Exception as e:
            self.logger.error(f"Failed to list backups: {e}")

        return backups

    def restore_backup(self, backup_file: str, confirm: bool = False) -> bool:
        """
        バックアップから復元

        Args:
            backup_file: 復元するバックアップファイルのパス
            confirm: 確認フラグ（安全のため）

        Returns:
            True if successful, False otherwise
        """
        if not confirm:
            self.logger.warning("Restore cancelled: confirm=False")
            return False

        try:
            # バックアップファイルが存在するか確認
            if not os.path.exists(backup_file):
                self.logger.error(f"Backup file not found: {backup_file}")
                return False

            # バックアップファイルが正常か検証
            if not self._verify_backup(backup_file):
                self.logger.error(f"Invalid backup file: {backup_file}")
                return False

            # 現在のDBをバックアップ（復元前）
            pre_restore_backup = f"{self.source_db}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            if os.path.exists(self.source_db):
                shutil.copy2(self.source_db, pre_restore_backup)
                self.logger.info(f"Created pre-restore backup: {pre_restore_backup}")

            # バックアップから復元
            shutil.copy2(backup_file, self.source_db)

            self.logger.info(f"Successfully restored from: {backup_file}")
            return True

        except Exception as e:
            self.logger.error(f"Restore failed: {e}")
            return False

    def get_latest_backup(self) -> Optional[str]:
        """
        最新のバックアップファイルパスを取得

        Returns:
            最新バックアップのパス（存在しない場合はNone）
        """
        backups = self.list_backups()
        if not backups:
            return None

        # まず作成時刻、次にファイル名（タイムスタンプ付き）でソート
        backups.sort(key=lambda x: (x["created"], x["filename"]), reverse=True)
        return backups[0]["path"]


if __name__ == "__main__":
    # テスト実行
    logging.basicConfig(level=logging.INFO)

    bm = BackupManager()

    # バックアップ作成
    print("Creating backup...")
    backup_path = bm.auto_backup()
    if backup_path:
        print(f"✅ Backup created: {backup_path}")
    else:
        print("❌ Backup failed")

    # バックアップリスト表示
    print("\nAvailable backups:")
    for backup in bm.list_backups():
        print(f"  - {backup['filename']} ({backup['size_mb']:.2f} MB) - {backup['created']}")
