import logging

from src.smart_notifier import SmartNotifier


class EmergencyHandler:
    """
    システムの緊急停止処理を管理します。
    """

    def __init__(
        self,
        config: dict,
        paper_trader,
        logger: logging.Logger,
        notifier: SmartNotifier,
    ):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.notifier = notifier
        self.backup_enabled = True  # FullyAutomatedTraderから引き継ぎ
        self.backup_manager = None  # FullyAutomatedTraderから引き継ぎ、必要なら初期化時に設定

    def trigger_emergency_stop(self, reason: str):
        """
        緊急停止を実行

        Args:
            reason: 緊急停止の理由
        """
        self.logger.critical(f"🚨 緊急停止: {reason}")

        # バックアップ作成
        if self.backup_enabled and self.backup_manager:
            try:
                backup_path = self.backup_manager.auto_backup()
                if backup_path:
                    self.logger.info(f"緊急バックアップ作成: {backup_path}")
            except Exception as e:
                self.logger.error(f"緊急バックアップ失敗: {e}")

        # 通知送信
        try:
            self.notifier.send_line_notify(
                f"🚨 緊急停止が発生しました\n理由: {reason}\n\n自動トレードを停止しました。",
                token=self.config.get("notifications", {}).get("line", {}).get("token"),
            )
        except Exception:
            pass  # 通知失敗しても緊急停止は継続
