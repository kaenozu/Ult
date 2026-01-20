"""プラットフォーム対応ユーティリティモジュール

このモジュールは、AGStockプロジェクトが異なるOS（Windows、macOS、Linux）で
正しく動作するように、ファイルパス、設定ファイルの位置、環境固有の動作の
違いを抽象化し、一貫性のあるインターフェースを提供します。
"""

import os
import platform
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Union


@dataclass
class PlatformInfo:
    """プラットフォーム情報を保持するデータクラス"""

    os_name: str  # 'windows', 'linux', 'darwin' (macOS)
    architecture: str  # 'x86', 'x64', 'arm', 'arm64' など
    is_windows: bool
    is_linux: bool
    is_macos: bool
    home_dir: Path
    temp_dir: Path
    config_dir: Path
    data_dir: Path
    cache_dir: Path


class PlatformAdapter:
    """プラットフォーム固有の差異を抽象化するクラス"""

    def __init__(self):
        self.platform_info = self._get_platform_info()

    def _get_platform_info(self) -> PlatformInfo:
        """現在のプラットフォーム情報を取得"""
        os_name = platform.system().lower()
        architecture = platform.machine().lower()

        # ホームディレクトリ取得
        home_dir = Path.home()

        # 一時ディレクトリ
        temp_dir = Path(tempfile.gettempdir())

        # 各OSに応じた設定、データ、キャッシュディレクトリを決定
        if os_name == "windows":
            config_dir = home_dir / "AppData" / "Roaming" / "AGStock"
            data_dir = home_dir / "AppData" / "Local" / "AGStock"
            cache_dir = home_dir / "AppData" / "Local" / "AGStock" / "cache"
        elif os_name == "darwin":  # macOS
            config_dir = home_dir / "Library" / "Application Support" / "AGStock"
            data_dir = home_dir / "Library" / "Application Support" / "AGStock" / "Data"
            cache_dir = home_dir / "Library" / "Caches" / "AGStock"
        else:  # Linux および他のUnix系OS
            xdg_config_home = os.environ.get("XDG_CONFIG_HOME", home_dir / ".config")
            xdg_data_home = os.environ.get("XDG_DATA_HOME", home_dir / ".local" / "share")
            xdg_cache_home = os.environ.get("XDG_CACHE_HOME", home_dir / ".cache")

            config_dir = Path(xdg_config_home) / "AGStock"
            data_dir = Path(xdg_data_home) / "AGStock"
            cache_dir = Path(xdg_cache_home) / "AGStock"

        return PlatformInfo(
            os_name=os_name,
            architecture=architecture,
            is_windows=(os_name == "windows"),
            is_linux=(os_name == "linux"),
            is_macos=(os_name == "darwin"),
            home_dir=home_dir,
            temp_dir=temp_dir,
            config_dir=config_dir,
            data_dir=data_dir,
            cache_dir=cache_dir,
        )

    def normalize_path(self, path: Union[str, Path]) -> Path:
        """パスを現在のOSに合わせて正規化"""
        normalized_path = Path(path)

        # Windowsではパス区切り文字を調整
        if self.platform_info.is_windows:
            # UNCパスやドライブ区切り文字を適切に処理
            if ":" in str(normalized_path) and str(normalized_path)[1:2] == ":":
                # ドライブ名 (例: C:\) の場合はそのまま
                return normalized_path.resolve()
            else:
                return normalized_path.as_posix().replace("/", "\\")
        else:
            # Unix系OSではスラッシュで統一
            return Path(normalized_path.as_posix())

    def ensure_directory_exists(self, directory: Union[str, Path]) -> Path:
        """指定されたディレクトリが存在することを保証"""
        dir_path = Path(directory)
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path

    def get_config_file_path(self, filename: str = "config.json") -> Path:
        """設定ファイルのパスを取得"""
        config_dir = self.ensure_directory_exists(self.platform_info.config_dir)
        return config_dir / filename

    def get_data_file_path(self, filename: str, subdirectory: Optional[str] = None) -> Path:
        """データファイルのパスを取得"""
        if subdirectory:
            data_dir = self.ensure_directory_exists(self.platform_info.data_dir / subdirectory)
        else:
            data_dir = self.ensure_directory_exists(self.platform_info.data_dir)
        return data_dir / filename

    def get_cache_file_path(self, filename: str, subdirectory: Optional[str] = None) -> Path:
        """キャッシュファイルのパスを取得"""
        if subdirectory:
            cache_dir = self.ensure_directory_exists(self.platform_info.cache_dir / subdirectory)
        else:
            cache_dir = self.ensure_directory_exists(self.platform_info.cache_dir)
        return cache_dir / filename

    def get_temp_file_path(self, prefix: str = "agstock", suffix: str = ".tmp") -> Path:
        """一時ファイルのパスを取得"""
        return Path(tempfile.mktemp(prefix=prefix, suffix=suffix, dir=self.platform_info.temp_dir))

    def is_executable(self, path: Union[str, Path]) -> bool:
        """ファイルが実行可能か確認"""
        return os.access(str(path), os.X_OK)

    def get_separator(self) -> str:
        """OSに適したパスセパレータを取得"""
        return os.sep

    def get_path_separator(self) -> str:
        """PATH環境変数のセパレータを取得"""
        return os.pathsep

    def expand_user_path(self, path: Union[str, Path]) -> Path:
        """ユーザーホームディレクトリのショートカット(~)を展開"""
        return Path(path).expanduser()


# グローバルプラットフォームアダプター（必要に応じて）
_global_platform_adapter: Optional[PlatformAdapter] = None


def get_platform_adapter() -> PlatformAdapter:
    """グローバルプラットフォームアダプターを取得

    Returns:
        PlatformAdapter: シングルトンのプラットフォームアダプターインスタンス
    """
    global _global_platform_adapter
    if _global_platform_adapter is None:
        _global_platform_adapter = PlatformAdapter()
    return _global_platform_adapter


def get_platform_info() -> PlatformInfo:
    """現在のプラットフォーム情報を取得

    Returns:
        PlatformInfo: 現在のプラットフォーム情報
    """
    adapter = get_platform_adapter()
    return adapter.platform_info


def normalize_path(path: Union[str, Path]) -> Path:
    """パスを現在のOSに合わせて正規化

    Args:
        path (Union[str, Path]): 正規化するパス

    Returns:
        Path: 正規化されたパス
    """
    adapter = get_platform_adapter()
    return adapter.normalize_path(path)


def ensure_directory_exists(directory: Union[str, Path]) -> Path:
    """指定されたディレクトリが存在することを保証

    Args:
        directory (Union[str, Path]): 確保するディレクトリ

    Returns:
        Path: 確保されたディレクトリのパス
    """
    adapter = get_platform_adapter()
    return adapter.ensure_directory_exists(directory)


def get_config_path(filename: str = "config.json") -> Path:
    """設定ファイルのパスを取得

    Args:
        filename (str): 設定ファイル名

    Returns:
        Path: 設定ファイルのパス
    """
    adapter = get_platform_adapter()
    return adapter.get_config_file_path(filename)


def get_data_path(filename: str, subdirectory: Optional[str] = None) -> Path:
    """データファイルのパスを取得

    Args:
        filename (str): データファイル名
        subdirectory (Optional[str]): サブディレクトリ名

    Returns:
        Path: データファイルのパス
    """
    adapter = get_platform_adapter()
    return adapter.get_data_file_path(filename, subdirectory)


def get_cache_path(filename: str, subdirectory: Optional[str] = None) -> Path:
    """キャッシュファイルのパスを取得

    Args:
        filename (str): キャッシュファイル名
        subdirectory (Optional[str]): サブディレクトリ名

    Returns:
        Path: キャッシュファイルのパス
    """
    adapter = get_platform_adapter()
    return adapter.get_cache_file_path(filename, subdirectory)
