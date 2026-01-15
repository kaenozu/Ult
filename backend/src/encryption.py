"""
Encryption - データ暗号化
AES-256を使用した暗号化・復号化
"""

import base64
import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


class DataEncryption:
    """データ暗号化クラス"""

    def __init__(self, key: bytes):
        """
        Args:
            key: 32バイトの暗号化キー
        """
        if len(key) != 32:
            raise ValueError("Key must be 32 bytes for AES-256")
        self.key = key

    def encrypt(self, data: bytes) -> bytes:
        """
        データを暗号化

        Args:
            data: 暗号化するデータ

        Returns:
            暗号化されたデータ（IV + 暗号文）
        """
        # ランダムなIV生成
        iv = os.urandom(16)

        # パディング
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data) + padder.finalize()

        # 暗号化
        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()

        # IV + 暗号文を返す
        return iv + ciphertext

    def decrypt(self, encrypted_data: bytes) -> bytes:
        """
        データを復号化

        Args:
            encrypted_data: 暗号化されたデータ（IV + 暗号文）

        Returns:
            復号化されたデータ
        """
        # IVと暗号文を分離
        iv = encrypted_data[:16]
        ciphertext = encrypted_data[16:]

        # 復号化
        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()

        # パディング除去
        unpadder = padding.PKCS7(128).unpadder()
        data = unpadder.update(padded_data) + unpadder.finalize()

        return data

    def encrypt_string(self, text: str) -> str:
        """
        文字列を暗号化（Base64エンコード）

        Args:
            text: 暗号化する文字列

        Returns:
            Base64エンコードされた暗号文
        """
        encrypted = self.encrypt(text.encode("utf-8"))
        return base64.b64encode(encrypted).decode("utf-8")

    def decrypt_string(self, encrypted_text: str) -> str:
        """
        暗号化された文字列を復号化

        Args:
            encrypted_text: Base64エンコードされた暗号文

        Returns:
            復号化された文字列
        """
        encrypted = base64.b64decode(encrypted_text.encode("utf-8"))
        decrypted = self.decrypt(encrypted)
        return decrypted.decode("utf-8")


class APIKeyManager:
    """APIキー管理"""

    def __init__(self, encryption_key: bytes):
        self.encryption = DataEncryption(encryption_key)

    def encrypt_api_key(self, api_key: str) -> str:
        """APIキーを暗号化"""
        return self.encryption.encrypt_string(api_key)

    def decrypt_api_key(self, encrypted_key: str) -> str:
        """APIキーを復号化"""
        return self.encryption.decrypt_string(encrypted_key)

    def store_api_key(self, key_name: str, api_key: str, db_path: str = "api_keys.db"):
        """APIキーをデータベースに保存"""
        import sqlite3

        encrypted_key = self.encrypt_api_key(api_key)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_name TEXT UNIQUE NOT NULL,
                encrypted_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        cursor.execute(
            """
            INSERT OR REPLACE INTO api_keys (key_name, encrypted_key)
            VALUES (?, ?)
        """,
            (key_name, encrypted_key),
        )

        conn.commit()
        conn.close()

    def retrieve_api_key(self, key_name: str, db_path: str = "api_keys.db") -> str:
        """APIキーをデータベースから取得"""
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT encrypted_key FROM api_keys WHERE key_name = ?", (key_name,))
        result = cursor.fetchone()
        conn.close()

        if result:
            return self.decrypt_api_key(result[0])
        return None


if __name__ == "__main__":
    # テスト
    key = os.urandom(32)  # 32バイトのランダムキー

    # データ暗号化テスト
    encryption = DataEncryption(key)

    original = "This is sensitive data"
    encrypted = encryption.encrypt_string(original)
    decrypted = encryption.decrypt_string(encrypted)

    print(f"Original: {original}")
    print(f"Encrypted: {encrypted}")
    print(f"Decrypted: {decrypted}")
    print(f"Match: {original == decrypted}")

    # APIキー管理テスト
    api_manager = APIKeyManager(key)

    api_manager.store_api_key("openai", "sk-test-key-12345")
    retrieved = api_manager.retrieve_api_key("openai")

    print(f"\nRetrieved API key: {retrieved}")
