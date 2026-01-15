"""
Base Classes and Interfaces for AGStock

This module provides common base classes and interfaces used throughout the application.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

import pandas as pd

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass
class TradeSignal:
    """取引シグナル"""

    ticker: str
    action: str  # 'BUY' or 'SELL'
    quantity: float
    price: float
    confidence: float
    timestamp: datetime
    reason: str
    metadata: Dict[str, Any] = None


@dataclass
class RiskMetrics:
    """リスク指標"""

    volatility: float
    max_drawdown: float
    sharpe_ratio: float
    var_95: float  # Value at Risk (95%)
    beta: float
    timestamp: datetime


class BaseManager(ABC):
    """全マネージャークラスの基底クラス"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.logger = logging.getLogger(self.__class__.__name__)
        self._initialize()

    @abstractmethod
    def _initialize(self):
        """初期化処理（サブクラスで実装）"""

    def validate_config(self, required_keys: List[str]) -> bool:
        """設定の検証"""
        missing_keys = [key for key in required_keys if key not in self.config]
        if missing_keys:
            self.logger.error(f"Missing configuration keys: {missing_keys}")
            return False
        return True


class BaseStrategy(ABC):
    """全戦略クラスの基底クラス"""

    def __init__(self, name: str, parameters: Optional[Dict[str, Any]] = None):
        self.name = name
        self.parameters = parameters or {}
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{name}")

    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> List[TradeSignal]:
        """シグナル生成（サブクラスで実装）"""

    def validate_data(self, data: pd.DataFrame, required_columns: List[str]) -> bool:
        """データの検証"""
        missing_columns = [col for col in required_columns if col not in data.columns]
        if missing_columns:
            self.logger.error(f"Missing required columns: {missing_columns}")
            return False
        return True


class BaseRiskManager(ABC):
    """全リスク管理クラスの基底クラス"""

    def __init__(self, max_risk: float = 0.02):
        self.max_risk = max_risk
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    def calculate_position_size(self, account_balance: float, signal: TradeSignal) -> float:
        """ポジションサイズ計算（サブクラスで実装）"""

    @abstractmethod
    def get_risk_metrics(self) -> RiskMetrics:
        """リスク指標取得（サブクラスで実装）"""

    def validate_signal(self, signal: TradeSignal) -> bool:
        """シグナルの検証"""
        if signal.confidence < 0 or signal.confidence > 1:
            self.logger.warning(f"Invalid confidence: {signal.confidence}")
            return False

        if signal.action not in ["BUY", "SELL"]:
            self.logger.warning(f"Invalid action: {signal.action}")
            return False

        return True


class Repository(Generic[T], ABC):
    """データリポジトリの基底クラス"""

    @abstractmethod
    def get(self, id: str) -> Optional[T]:
        """IDでデータ取得"""

    @abstractmethod
    def save(self, entity: T) -> bool:
        """データ保存"""

    @abstractmethod
    def delete(self, id: str) -> bool:
        """データ削除"""

    @abstractmethod
    def list(self, filters: Optional[Dict[str, Any]] = None) -> List[T]:
        """データ一覧取得"""


class CacheManager(ABC):
    """キャッシュ管理の基底クラス"""

    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """キャッシュ取得"""

    @abstractmethod
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """キャッシュ設定"""

    @abstractmethod
    def delete(self, key: str) -> bool:
        """キャッシュ削除"""

    @abstractmethod
    def clear(self) -> bool:
        """全キャッシュクリア"""


class EventBus:
    """イベントバス（Pub/Sub パターン）"""

    def __init__(self):
        self._subscribers: Dict[str, List[callable]] = {}
        self.logger = logging.getLogger(self.__class__.__name__)

    def subscribe(self, event_type: str, callback: callable):
        """イベント購読"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)
        self.logger.debug(f"Subscribed to {event_type}")

    def publish(self, event_type: str, data: Any):
        """イベント発行"""
        if event_type in self._subscribers:
            for callback in self._subscribers[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    self.logger.error(f"Error in event callback: {e}")
        self.logger.debug(f"Published {event_type}")

    def unsubscribe(self, event_type: str, callback: callable):
        """イベント購読解除"""
        if event_type in self._subscribers:
            self._subscribers[event_type].remove(callback)
            self.logger.debug(f"Unsubscribed from {event_type}")


# グローバルイベントバス
event_bus = EventBus()
