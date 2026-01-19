"""
AGStock ログ設定
ログローテーション対応
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "agstock.log")
LOG_LEVEL = logging.INFO


def setup_logging(
    log_level: int = logging.INFO,
    log_file: str = LOG_FILE,
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
    enable_console: bool = True,
) -> logging.Logger:
    """ログ設定初期化"""
    os.makedirs(LOG_DIR, exist_ok=True)

    logger = logging.getLogger("agstock")
    logger.setLevel(log_level)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    file_handler = RotatingFileHandler(log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    logger.addHandler(file_handler)

    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(log_level)
        logger.addHandler(console_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """ロガー取得"""
    return logging.getLogger(f"agstock.{name}")


class LoggerMixin:
    """ロガーミキシン"""

    @property
    def logger(self) -> logging.Logger:
        name = f"{self.__class__.__module__}.{self.__class__.__name__}"
        return logging.getLogger(name)


def log_performance(func):
    """パフォーマンスロガーデコレータ"""

    def wrapper(*args, **kwargs):
        import time

        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        logger = get_logger(func.__module__)
        logger.info(f"{func.__name__} completed in {duration:.3f}s")
        return result

    return wrapper
