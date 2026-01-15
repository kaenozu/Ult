"""
Authentication Manager - 認証・認可システム
JWT トークンベースの認証
"""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

import bcrypt
import jwt


@dataclass
class User:
    """ユーザー"""

    id: Optional[int] = None
    username: str = ""
    email: str = ""
    password_hash: str = ""
    is_active: bool = True
    is_admin: bool = False
    created_at: Optional[str] = None


class AuthManager:
    """認証マネージャー"""

    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)

    def __init__(self, secret_key: str, db_path: str = "users.db"):
        self.secret_key = secret_key
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """データベース初期化"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    is_admin INTEGER DEFAULT 0,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """
            )

            # インデックス追加
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)")

            conn.commit()
        finally:
            conn.close()

    def hash_password(self, password: str) -> str:
        """パスワードをハッシュ化"""
        salt = bcrypt.gensalt(rounds=12)  # コスト係数を12に設定
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """パスワードを検証"""
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

    def check_password_strength(self, password: str) -> Tuple[bool, str]:
        """パスワード強度チェック"""
        if len(password) < 8:
            return False, "パスワードは8文字以上必要です"

        if not any(c.isupper() for c in password):
            return False, "大文字を1文字以上含める必要があります"

        if not any(c.islower() for c in password):
            return False, "小文字を1文字以上含める必要があります"

        if not any(c.isdigit() for c in password):
            return False, "数字を1文字以上含める必要があります"

        return True, "OK"

    def create_user(self, username: str, email: str, password: str, is_admin: bool = False) -> Optional[int]:
        """ユーザー作成"""
        # パスワード強度チェック
        is_strong, message = self.check_password_strength(password)
        if not is_strong:
            raise ValueError(f"パスワードが弱すぎます: {message}")

        password_hash = self.hash_password(password)

        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            """,
                (username, email, password_hash, is_admin),
            )

            user_id = cursor.lastrowid
            conn.commit()
            return user_id
        except sqlite3.IntegrityError:
            return None
        finally:
            conn.close()

    def get_user(self, username: str) -> Optional[User]:
        """ユーザー取得"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()

            if row:
                return User(
                    id=row[0],
                    username=row[1],
                    email=row[2],
                    password_hash=row[3],
                    is_active=bool(row[4]),
                    is_admin=bool(row[5]),
                    created_at=row[8],
                )
            return None
        finally:
            conn.close()

    def is_account_locked(self, username: str) -> bool:
        """アカウントがロックされているか確認"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT locked_until FROM users 
                WHERE username = ? AND locked_until > datetime('now')
            """,
                (username,),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def record_failed_login(self, username: str):
        """ログイン失敗を記録"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1
                WHERE username = ?
            """,
                (username,),
            )
            cursor.execute(
                """
                SELECT failed_login_attempts FROM users WHERE username = ?
            """,
                (username,),
            )
            result = cursor.fetchone()
            if result and result[0] >= self.MAX_LOGIN_ATTEMPTS:
                # アカウントをロック
                locked_until = datetime.utcnow() + self.LOCKOUT_DURATION
                cursor.execute(
                    """
                    UPDATE users 
                    SET locked_until = ?
                    WHERE username = ?
                """,
                    (locked_until, username),
                )
            conn.commit()
        finally:
            conn.close()

    def reset_failed_login(self, username: str):
        """ログイン失敗カウントをリセット"""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE users 
                SET failed_login_attempts = 0, locked_until = NULL
                WHERE username = ?
            """,
                (username,),
            )
            conn.commit()
        finally:
            conn.close()

    def create_token(self, user_id: int, expires_in_days: int = 7) -> str:
        """JWTトークン作成"""
        now = datetime.utcnow()
        exp = now + timedelta(days=expires_in_days)
        payload = {
            "user_id": user_id,
            "exp": exp,
            "iat": now,
        }

        token = jwt.encode(payload, self.secret_key, algorithm="HS256")

        # セッションに保存
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO sessions (user_id, token, expires_at)
                VALUES (?, ?, ?)
            """,
                (user_id, token, exp.isoformat()),
            )
            conn.commit()
        finally:
            conn.close()

        return token

    def verify_token(self, token: str) -> Optional[Dict]:
        """トークン検証"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])

            # セッション確認
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT user_id FROM sessions
                    WHERE token = ?
                """,
                    (token,),
                )
                result = cursor.fetchone()
                if result:
                    # Python側で期限チェック（SQLiteのdatetime比較の不確実性を避ける）
                    exp = payload.get("exp")
                    if exp and datetime.fromtimestamp(exp) > datetime.utcnow():
                        return payload
                return None
            finally:
                conn.close()
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def login(self, username: str, password: str) -> Optional[str]:
        """ログイン"""
        # アカウントロックチェック
        if self.is_account_locked(username):
            raise ValueError("アカウントがロックされています。15分後に再試行してください。")

        user = self.get_user(username)

        if not user or not user.is_active:
            self.record_failed_login(username)
            return None

        if self.verify_password(password, user.password_hash):
            self.reset_failed_login(username)
            return self.create_token(user.id)
        else:
            self.record_failed_login(username)
            return None

    def logout(self, token: str) -> bool:
        """ログアウト"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))

            success = cursor.rowcount > 0
            conn.commit()

            return success

    def cleanup_expired_sessions(self):
        """期限切れセッションのクリーンアップ"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                DELETE FROM sessions WHERE expires_at < datetime('now')
            """
            )

            deleted_count = cursor.rowcount
            conn.commit()

            return deleted_count

    def require_auth(self, token: str) -> Optional[int]:
        """認証が必要（デコレータ用）"""
        payload = self.verify_token(token)

        if payload:
            return payload["user_id"]
        return None


if __name__ == "__main__":
    # テスト
    auth = AuthManager("test-secret-key")

    # ユーザー作成
    user_id = auth.create_user("testuser", "test@example.com", "TestPassword123")
    print(f"Created user: {user_id}")

    # ログイン
    token = auth.login("testuser", "TestPassword123")
    print(f"Login token: {token}")

    # トークン検証
    payload = auth.verify_token(token)
    print(f"Token payload: {payload}")

    # ログアウト
    success = auth.logout(token)
    print(f"Logout: {success}")

    # セッションクリーンアップ
    cleaned = auth.cleanup_expired_sessions()
    print(f"Cleaned sessions: {cleaned}")
