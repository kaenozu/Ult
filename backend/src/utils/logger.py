import logging
import os

_loggers = {}


def setup_logger(
    name: str,
    log_dir: str = "logs",
    log_file_name: str = "app.log",
    level: str = "INFO",
) -> logging.Logger:
    """
    指定された名前でロガーをセットアップし、ファイルハンドラとコンソールハンドラを追加します。
    既にセットアップ済みの場合は既存のロガーを返します。
    """
    if name in _loggers:
        return _loggers[name]

    os.makedirs(log_dir, exist_ok=True)
    log_file_path = os.path.join(log_dir, log_file_name)

    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False  # 他のロガーへの伝播を停止

    formatter = logging.Formatter("[{asctime}] [{levelname}] {message}", style="{")

    # ファイルハンドラ
    file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # コンソールハンドラ (Windowsのcp932対応)
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)

    # Windowsのコンソールがcp932エンコーディングの場合にUnicodeEncodeErrorを避けるためのラッパー
    if os.name == "nt":

        class SafeStreamHandler(logging.StreamHandler):
            def emit(self, record):
                try:
                    super().emit(record)
                except UnicodeEncodeError:
                    record.msg = record.msg.encode("cp932", errors="ignore").decode("cp932")
                    super().emit(record)

        stream_handler = SafeStreamHandler()
        stream_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)

    _loggers[name] = logger
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    既にセットアップ済みのロガーを取得します。
    セットアップされていない場合はエラーを発生させます。
    """
    if name not in _loggers:
        raise ValueError(f"Logger '{name}' has not been set up. Call setup_logger first.")
    return _loggers[name]


# 例: アプリケーション全体のデフォルトロガー
# setup_logger("app", log_file_name="app.log")
