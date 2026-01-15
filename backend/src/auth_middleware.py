"""
JWT認証ミドルウェア
API認証・セキュリティ管理
"""

import jwt
import logging
import time
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class JWTAuthenticator:
    """JWT認証管理クラス"""

    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.blacklisted_tokens = set()

    def generate_token(self, user_id: str, expires_in_hours: int = 24) -> str:
        """JWTトークン生成"""
        expire = datetime.utcnow() + timedelta(hours=expires_in_hours)
        payload = {
            "user_id": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """JWTトークン検証"""
        try:
            if token in self.blacklisted_tokens:
                return None

            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None

    def revoke_token(self, token: str) -> bool:
        """トークン失効"""
        try:
            self.blacklisted_tokens.add(token)
            return True
        except Exception as e:
            logger.error(f"Token revocation error: {e}")
            return False


# グローバル認証インスタンス
jwt_auth = None


def init_jwt_auth(secret_key: str):
    """JWT認証初期化"""
    global jwt_auth
    jwt_auth = JWTAuthenticator(secret_key)
    return jwt_auth


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = None):
    """現在のユーザー取得"""
    if not jwt_auth:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not initialized",
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = jwt_auth.verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_auth(func):
    """認証必須デコレータ"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not jwt_auth:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not initialized",
            )
        return func(*args, **kwargs)

    return wrapper


def rate_limit(max_requests: int = 60, window_seconds: int = 60):
    """レート制限デコレータ"""
    from collections import defaultdict

    request_counts = defaultdict(list)

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_time = time.time()
            client_ip = "unknown"

            request_counts[client_ip] = [
                req_time for req_time in request_counts[client_ip] if current_time - req_time < window_seconds
            ]

            if len(request_counts[client_ip]) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(window_seconds)},
                )

            request_counts[client_ip].append(current_time)
            return func(*args, **kwargs)

        return wrapper

    return decorator


def check_permissions(required_permissions: list):
    """権限チェックデコレータ"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_permissions = get_user_permissions(get_current_user())

            if not any(perm in required_permissions for perm in user_permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions",
                )

            return func(*args, **kwargs)

        return wrapper

    return decorator


def get_user_permissions(user_payload: Dict[str, Any]) -> list:
    """ユーザー権限取得"""
    # デモ実装 - 実際にはデータベースから取得
    default_permissions = ["read", "write"]
    return default_permissions


def log_access(func):
    """アクセスログデコレータ"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        logger.info(f"Access to {func.__name__}")
        result = func(*args, **kwargs)
        logger.info(f"Completed {func.__name__}")
        return result

    return wrapper


# セキュリティヘルパー関数
def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """機密データマスキング"""
    sensitive_fields = ["password", "api_key", "secret", "token"]
    masked_data = data.copy()

    for field in sensitive_fields:
        if field in masked_data:
            masked_data[field] = "***REDACTED***"

    return masked_data


def validate_input(data: Dict[str, Any], required_fields: list) -> bool:
    """入力バリデーション"""
    for field in required_fields:
        if field not in data or data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required field: {field}",
            )
    return True


def sanitize_string(input_string: str) -> str:
    """文字列サニタイズ"""
    import re

    # XSS防止の簡単なサニタイズ
    sanitized = re.sub(r'[<>"\']', "", input_string)
    return sanitized.strip()


# APIキー管理
class APIKeyManager:
    """APIキー管理"""

    def __init__(self):
        self.api_keys = {}

    def generate_api_key(self, user_id: str) -> str:
        """APIキー生成"""
        import secrets

        api_key = secrets.token_urlsafe(32)
        self.api_keys[api_key] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "active": True,
        }
        return api_key

    def validate_api_key(self, api_key: str) -> bool:
        """APIキー検証"""
        key_data = self.api_keys.get(api_key)
        return key_data is not None and key_data["active"]

    def revoke_api_key(self, api_key: str) -> bool:
        """APIキー失効"""
        if api_key in self.api_keys:
            self.api_keys[api_key]["active"] = False
            return True
        return False


api_key_manager = APIKeyManager()
