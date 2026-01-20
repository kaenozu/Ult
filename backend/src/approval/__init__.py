"""
Approval System Package
承認システムパッケージのエントリーポイント
"""

from .models import (
    ApprovalStatus,
    ApprovalType,
    Priority,
    ApprovalContext,
    ApprovalRequest,
    ApprovalResponse,
    ApprovalRule,
)

from .workflow import ApprovalWorkflow
from .integrations import ExternalNotifier, ApprovalInterfaceManager

# Legacy compatibility
from .workflow import ApprovalWorkflow as ApprovalSystem

__all__ = [
    # Models
    "ApprovalStatus",
    "ApprovalType",
    "Priority",
    "ApprovalContext",
    "ApprovalRequest",
    "ApprovalResponse",
    "ApprovalRule",
    # Classes
    "ApprovalWorkflow",
    "ApprovalSystem",  # Legacy alias
    "ExternalNotifier",
    "ApprovalInterfaceManager",
]
