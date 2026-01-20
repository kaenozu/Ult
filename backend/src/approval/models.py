"""
Approval System Data Models and Enums
承認システムのデータモデルと列挙型
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from dataclasses import dataclass


class ApprovalStatus(str, Enum):
    """承認ステータス"""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApprovalType(str, Enum):
    """承認タイプ"""

    TRADE_EXECUTION = "trade_execution"
    STRATEGY_CHANGE = "strategy_change"
    CONFIG_UPDATE = "config_update"
    RISK_LIMIT_CHANGE = "risk_limit_change"
    MANUAL_INTERVENTION = "manual_intervention"
    CIRCUIT_BREAKER_RESET = "circuit_breaker_reset"
    EMERGENCY_ACTION = "emergency_action"


class Priority(str, Enum):
    """優先度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ApprovalContext:
    """承認コンテキスト情報"""

    ticker: Optional[str] = None
    action: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    strategy: Optional[str] = None
    confidence: Optional[float] = None
    risk_level: Optional[str] = None


@dataclass
class ApprovalRequest:
    """承認リクエスト"""

    request_id: str
    type: ApprovalType
    priority: Priority
    context: ApprovalContext
    title: str
    description: str
    requested_by: str
    requested_at: datetime
    expires_at: Optional[datetime] = None
    status: ApprovalStatus = ApprovalStatus.PENDING


@dataclass
class ApprovalResponse:
    """承認レスポンス"""

    request_id: str
    responder: str
    status: ApprovalStatus
    reason: Optional[str] = None
    responded_at: datetime


@dataclass
class ApprovalRule:
    """承認ルール"""

    rule_id: str
    name: str
    approval_type: ApprovalType
    priority_threshold: Priority
    auto_approve: bool = False
    max_wait_time_minutes: int = 60
    required_approvers: int = 1
    conditions: dict = None
