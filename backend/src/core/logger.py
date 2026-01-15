"""
統一ロギングモジュール

プロジェクト全体で一貫したログ設定を提供する。
"""

import logging
import os
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

# ログディレクトリ
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# デフォルト設定
DEFAULT_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
DEFAULT_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ロガーキャッシュ
_loggers: dict = {}
_initialized = False


def setup_logging(
    level: str = DEFAULT_LOG_LEVEL,
    log_file: Optional[str] = None,
    console: bool = True,
) -> None:
    """ロギングをセットアップ"""
    global _initialized
    
    if _initialized:
        return
    
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    formatter = logging.Formatter(DEFAULT_LOG_FORMAT, DEFAULT_DATE_FORMAT)
    
    # 既存のハンドラをクリア
    root_logger.handlers.clear()
    
    # コンソールハンドラ
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    
    # ファイルハンドラ
    if log_file:
        file_path = LOG_DIR / log_file
    else:
        file_path = LOG_DIR / f"agstock_{datetime.now().strftime('%Y%m%d')}.log"
    
    file_handler = RotatingFileHandler(
        file_path,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # 外部ライブラリのログレベルを調整
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("yfinance").setLevel(logging.WARNING)
    logging.getLogger("tensorflow").setLevel(logging.WARNING)
    logging.getLogger("streamlit").setLevel(logging.WARNING)
    
    _initialized = True
    root_logger.info("Logging initialized")


def get_logger(name: str) -> logging.Logger:
    """名前付きロガーを取得"""
    if name not in _loggers:
        log_obj = logging.getLogger(name)
        _loggers[name] = log_obj
    return _loggers[name]


# デフォルトのロガーインスタンスを提供
logger = get_logger("agstock")


class LogContext:
    """コンテキスト付きロギング"""
    
    def __init__(self, logger: logging.Logger, context: str):
        self.logger = logger
        self.context = context
    
    def __enter__(self):
        self.logger.info(f"[{self.context}] Started")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.logger.error(f"[{self.context}] Failed: {exc_val}")
        else:
            self.logger.info(f"[{self.context}] Completed")
        return False