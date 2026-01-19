"""セキュリティユーティリティモジュール

このモジュールは、AGStockプロジェクトにおける機密情報の安全な取り扱い、
認証情報の管理、入力値の検証などを行うための機能を提供します。
"""

import base64
import logging
import os
import re
import secrets
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class SecurityUtils:
    """セキュリティ関連のユーティリティクラス"""

    # 機密情報と認識するキーワードのパターン
    SENSITIVE_KEY_PATTERNS = [
        re.compile(r".*key.*", re.IGNORECASE),
        re.compile(r".*token.*", re.IGNORECASE),
        re.compile(r".*secret.*", re.IGNORECASE),
        re.compile(r".*password.*", re.IGNORECASE),
        re.compile(r".*credential.*", re.IGNORECASE),
        re.compile(r".*api.*", re.IGNORECASE),
    ]

    @staticmethod
    def is_sensitive_key(key: str) -> bool:
        """指定されたキーが機密情報のキーであるかを判定する

        Args:
            key (str): キー名

        Returns:
            bool: 機密情報のキーであればTrue
        """
        return any(pattern.match(key) for pattern in SecurityUtils.SENSITIVE_KEY_PATTERNS)

    @staticmethod
    def mask_sensitive_data(data: str, show_chars: int = 2) -> str:
        """機密情報をマスクする

        Args:
            data (str): マスクするデータ
            show_chars (int): 先頭・末尾に表示する文字数

        Returns:
            str: マスクされたデータ
        """
        if not data or len(data) <= show_chars * 2:
            return "*" * len(data) if data else ""

        return data[:show_chars] + "*" * (len(data) - show_chars * 2) + data[-show_chars:]

    @staticmethod
    def validate_input(value: str, pattern: str = r"^[a-zA-Z0-9_-]+$", max_length: Optional[int] = 100) -> bool:
        """入力値の検証を行う

        Args:
            value (str): 検証する値
            pattern (str): 許可するパターン
            max_length (Optional[int]): 最大長

        Returns:
            bool: 検証が成功すればTrue
        """
        if max_length and len(value) > max_length:
            logger.warning(f"Input exceeds maximum length: {len(value)} > {max_length}")
            return False

        if not re.match(pattern, value):
            logger.warning(f"Input does not match pattern: {value}")
            return False

        return True

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """安全なトークンを生成する

        Args:
            length (int): トークンの長さ

        Returns:
            str: 生成されたトークン
        """
        return secrets.token_urlsafe(length)

    @staticmethod
    def hash_data(data: str, salt: Optional[bytes] = None) -> tuple[bytes, bytes]:
        """データをハッシュ化する

        Args:
            data (str): ハッシュ化するデータ
            salt (Optional[bytes]): ソルト（Noneの場合は新規生成）

        Returns:
            tuple[bytes, bytes]: (ハッシュ, ソルト)
        """
        if salt is None:
            salt = os.urandom(16)  # 16バイトのランダムソルト

        pwd_bytes = data.encode("utf-8")
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(pwd_bytes)
        return key, salt

    @classmethod
    def verify_hash(cls, data: str, stored_hash: bytes, salt: bytes) -> bool:
        """ハッシュの検証を行う

        Args:
            data (str): 検証するデータ
            stored_hash (bytes): 保存されたハッシュ
            salt (bytes): 保存されたソルト

        Returns:
            bool: 検証が成功すればTrue
        """
        try:
            current_hash, _ = cls.hash_data(data, salt)
            return secrets.compare_digest(current_hash, stored_hash)
        except Exception:
            return False


class SecureConfig:
    """安全な設定管理クラス"""

    def __init__(self, config_path: str = "config.json", encryption_key: Optional[bytes] = None):
        """SecureConfigの初期化

        Args:
            config_path (str): 設定ファイルのパス
            encryption_key (Optional[bytes]): 暗号化キー（Noneの場合は環境変数から取得または新規生成）
        """
        self.config_path = Path(config_path)

        # 暗号化キーの取得または生成
        if encryption_key:
            self.encryption_key = encryption_key
        else:
            # 環境変数から暗号化キーを取得するか、新規生成
            key_from_env = os.getenv("AGSTOCK_CRYPTO_KEY")
            if key_from_env:
                self.encryption_key = base64.urlsafe_b64decode(key_from_env)
            else:
                # 新しいキーを生成し、環境変数に設定（開発用）
                self.encryption_key = Fernet.generate_key()
                logger.info("New encryption key generated. Set AGSTOCK_CRYPTO_KEY environment variable for production.")

        self.cipher_suite = Fernet(self.encryption_key)

    def encrypt_value(self, value: str) -> str:
        """値を暗号化する

        Args:
            value (str): 暗号化する値

        Returns:
            str: 暗号化された値（base64エンコード）
        """
        value_bytes = value.encode("utf-8")
        encrypted_bytes = self.cipher_suite.encrypt(value_bytes)
        return base64.urlsafe_b64encode(encrypted_bytes).decode("utf-8")

    def decrypt_value(self, encrypted_value: str) -> str:
        """値を復号化する

        Args:
            encrypted_value (str): 暗号化された値（base64エンコード）

        Returns:
            str: 復号化された値
        """
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode("utf-8"))
        decrypted_bytes = self.cipher_suite.decrypt(encrypted_bytes)
        return decrypted_bytes.decode("utf-8")

    def mask_config_for_logging(self, config: dict) -> dict:
        """ロギング用に機密情報をマスクした設定を作成する

        Args:
            config (dict): 元の設定

        Returns:
            dict: マスクされた設定
        """
        masked_config = {}
        for key, value in config.items():
            if SecurityUtils.is_sensitive_key(key):
                if isinstance(value, str):
                    masked_config[key] = SecurityUtils.mask_sensitive_data(value)
                else:
                    # 非文字列の場合は型を維持しつつマスク
                    masked_config[key] = f"[{type(value).__name__}_value_masked]"
            elif isinstance(value, dict):
                # 再帰的にマスク
                masked_config[key] = self.mask_config_for_logging(value)
            else:
                masked_config[key] = value
        return masked_config


# グローバルセキュリティユーティリティ（必要に応じて）
_security_utils: Optional[SecurityUtils] = None


def get_security_utils() -> SecurityUtils:
    """グローバルセキュリティユーティリティを取得

    Returns:
        SecurityUtils: シングルトンのセキュリティユーティリティインスタンス
    """
    global _security_utils
    if _security_utils is None:
        _security_utils = SecurityUtils()
    return _security_utils
