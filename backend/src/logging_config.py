"""
Logging Configuration - 構造化ログ設定
"""

import json
import logging
import logging.handlers
from datetime import datetime
from pathlib import Path


class JSONFormatter(logging.Formatter):
    """JSON形式のログフォーマッター"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 追加情報があれば含める
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(log_level: str = "INFO", log_dir: str = "logs"):
    """ログ設定のセットアップ"""

    # ログディレクトリ作成
    Path(log_dir).mkdir(exist_ok=True)

    # ルートロガー取得
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # コンソールハンドラ（人間が読みやすい形式）
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    console_handler.setFormatter(console_formatter)

    # ファイルハンドラ（JSON形式）
    file_handler = logging.handlers.RotatingFileHandler(
        f"{log_dir}/agstock.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,  # 10MB
        encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(JSONFormatter())

    # エラーログ専用ハンドラ
    error_handler = logging.handlers.RotatingFileHandler(
        f"{log_dir}/error.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())

    # ハンドラ追加
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.addHandler(error_handler)

    return logger


# グローバルロガー
logger = setup_logging()


def get_logger(name: str) -> logging.Logger:
    """名前付きロガーを取得"""
    return logging.getLogger(name)


if __name__ == "__main__":
    # テスト
    test_logger = get_logger(__name__)

    test_logger.info("This is an info message")
    test_logger.warning("This is a warning message")
    test_logger.error("This is an error message", extra={"user_id": 123})

    try:
        1 / 0
    except Exception:
        test_logger.exception("An exception occurred")
