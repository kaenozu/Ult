"""
Redis Integration for Approval Auditability
承認監査用Redis統合モジュール
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import redis

logger = logging.getLogger(__name__)


class ApprovalRedisStore:
    """承認リクエストのRedisストレージ（監査用）"""

    def __init__(
        self, redis_url: str = "redis://localhost:6379/0", prefix: str = "approval"
    ):
        """
        Redisストレージを初期化

        Args:
            redis_url: Redis接続URL
            prefix: キープレフィックス
        """
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.prefix = prefix
            self.ttl_seconds = 60  # デフォルトTTL 60秒
            self.redis_client.ping()
            logger.info(f"Redis approval store initialized: {redis_url}")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self.redis_client = None

    def _key(self, request_id: str) -> str:
        """Redisキーを生成"""
        return f"{self.prefix}:{request_id}"

    def _audit_log_key(self, request_id: str) -> str:
        """監査ログキーを生成"""
        return f"{self.prefix}:audit:{request_id}"

    def store_approval_request(
        self,
        request_id: str,
        approval_data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        承認リクエストをRedisに保存（TTL付き）

        Args:
            request_id: リクエストID
            approval_data: 承認データ
            ttl: 保存時間（秒）、指定がない場合はデフォルト60秒

        Returns:
            bool: 成功時True
        """
        if not self.redis_client:
            logger.warning("Redis client not initialized")
            return False

        try:
            key = self._key(request_id)
            ttl_seconds = ttl or self.ttl_seconds

            data = {
                **approval_data,
                "stored_at": datetime.now().isoformat(),
                "ttl": ttl_seconds,
            }

            self.redis_client.setex(key, ttl_seconds, json.dumps(data, default=str))

            logger.info(
                f"Approval request stored in Redis: {request_id}, TTL: {ttl_seconds}s"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to store approval in Redis: {e}")
            return False

    def store_audit_event(
        self,
        request_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        監査イベントをRedisに保存

        Args:
            request_id: リクエストID
            event_type: イベントタイプ（created, approved, rejected, expired, etc.）
            event_data: イベントデータ
            ttl: 保存時間（秒）

        Returns:
            bool: 成功時True
        """
        if not self.redis_client:
            return False

        try:
            key = self._audit_log_key(request_id)
            ttl_seconds = ttl or self.ttl_seconds

            event = {
                "event_type": event_type,
                "timestamp": datetime.now().isoformat(),
                "data": event_data,
            }

            # リストとして監査イベントを追加
            self.redis_client.lpush(key, json.dumps(event, default=str))
            self.redis_client.expire(key, ttl_seconds)

            logger.info(f"Audit event stored: {request_id} - {event_type}")
            return True

        except Exception as e:
            logger.error(f"Failed to store audit event: {e}")
            return False

    def get_approval_request(self, request_id: str) -> Optional[Dict[str, Any]]:
        """
        Redisから承認リクエストを取得

        Args:
            request_id: リクエストID

        Returns:
            Optional[Dict]: 承認データ、存在しない場合はNone
        """
        if not self.redis_client:
            return None

        try:
            key = self._key(request_id)
            data = self.redis_client.get(key)

            if data:
                return json.loads(data)
            return None

        except Exception as e:
            logger.error(f"Failed to get approval from Redis: {e}")
            return None

    def get_audit_events(self, request_id: str) -> List[Dict[str, Any]]:
        """
        Redisから監査イベントを取得

        Args:
            request_id: リクエストID

        Returns:
            List[Dict]: 監査イベントリスト
        """
        if not self.redis_client:
            return []

        try:
            key = self._audit_log_key(request_id)
            events = self.redis_client.lrange(key, 0, -1)

            return [json.loads(event) for event in events]

        except Exception as e:
            logger.error(f"Failed to get audit events: {e}")
            return []

    def update_approval_status(
        self,
        request_id: str,
        status: str,
        updated_by: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        承認ステータスを更新

        Args:
            request_id: リクエストID
            status: 新しいステータス
            updated_by: 更新者
            metadata: 追加メタデータ

        Returns:
            bool: 成功時True
        """
        if not self.redis_client:
            return False

        try:
            key = self._key(request_id)
            data_json = self.redis_client.get(key)

            if not data_json:
                logger.warning(f"Approval not found in Redis: {request_id}")
                return False

            data = json.loads(data_json)
            data["status"] = status
            data["updated_by"] = updated_by
            data["updated_at"] = datetime.now().isoformat()

            if metadata:
                data["metadata"] = {**(data.get("metadata", {})), **metadata}

            # TTLを維持して更新
            ttl = self.redis_client.ttl(key)
            self.redis_client.setex(key, ttl, json.dumps(data, default=str))

            # 監査イベントを記録
            self.store_audit_event(
                request_id=request_id,
                event_type=f"status_{status}",
                event_data={
                    "updated_by": updated_by,
                    "status": status,
                    **(metadata or {}),
                },
            )

            logger.info(f"Approval status updated in Redis: {request_id} -> {status}")
            return True

        except Exception as e:
            logger.error(f"Failed to update approval status: {e}")
            return False

    def delete_approval_request(self, request_id: str) -> bool:
        """
        承認リクエストを削除

        Args:
            request_id: リクエストID

        Returns:
            bool: 成功時True
        """
        if not self.redis_client:
            return False

        try:
            self.redis_client.delete(self._key(request_id))
            self.redis_client.delete(self._audit_log_key(request_id))

            logger.info(f"Approval deleted from Redis: {request_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete approval: {e}")
            return False

    def get_all_active_approvals(self) -> List[Dict[str, Any]]:
        """
        全てのアクティブな承認を取得

        Returns:
            List[Dict]: アクティブな承認リスト
        """
        if not self.redis_client:
            return []

        try:
            pattern = f"{self.prefix}:*"
            keys = self.redis_client.keys(pattern)

            approvals = []
            for key in keys:
                if ":audit:" not in key:  # 監査ログキーを除外
                    data = self.redis_client.get(key)
                    if data:
                        approvals.append(json.loads(data))

            return approvals

        except Exception as e:
            logger.error(f"Failed to get all approvals: {e}")
            return []

    def health_check(self) -> bool:
        """
        Redisヘルスチェック

        Returns:
            bool: 正常時True
        """
        if not self.redis_client:
            return False

        try:
            return bool(self.redis_client.ping())
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


# グローバルインスタンス
_redis_store: Optional[ApprovalRedisStore] = None


def get_approval_redis_store(
    redis_url: Optional[str] = None,
    prefix: str = "approval",
) -> ApprovalRedisStore:
    """
    承認Redisストアのインスタンスを取得（シングルトン）

    Args:
        redis_url: Redis接続URL（オプション）
        prefix: キープレフィックス

    Returns:
        ApprovalRedisStore: ストアインスタンス
    """
    global _redis_store

    if _redis_store is None:
        import os

        url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_store = ApprovalRedisStore(redis_url=url, prefix=prefix)

    return _redis_store
