"""
Advanced Dependency Injection Container
高度な依存性注入コンテナ
"""

import asyncio
import logging
import inspect
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

T = TypeVar("T")


class LifetimeScope(str, Enum):
    """依存性のライフタイムスコープ"""

    SINGLETON = "singleton"
    TRANSIENT = "transient"
    SCOPED = "scoped"


@dataclass
class ServiceDescriptor:
    """サービス記述子"""

    interface: Type
    implementation: Optional[Type] = None
    lifetime: LifetimeScope = LifetimeScope.TRANSIENT
    factory: Optional[Callable] = None
    dependencies: List[Type] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class Container:
    """依存性注入コンテナ"""

    def __init__(self):
        self._services: Dict[Type, ServiceDescriptor] = {}
        self._instances: Dict[Type, Any] = {}
        self._scoped_instances: Dict[str, Dict[Type, Any]] = {}
        self._factories: Dict[Type, Callable] = {}
        self._loading: Dict[Type, bool] = {}

    def register(
        self,
        interface: Type[T],
        implementation: Optional[Type[T]] = None,
        lifetime: LifetimeScope = LifetimeScope.TRANSIENT,
        factory: Optional[Callable[[], T]] = None,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
    ) -> None:
        """サービスを登録"""

        descriptor = ServiceDescriptor(
            interface=interface,
            implementation=implementation,
            lifetime=lifetime,
            factory=factory,
            tags=tags or [],
            metadata=metadata or {},
        )

        # 依存性を自動検出
        if implementation and not factory:
            descriptor.dependencies = self._get_dependencies(implementation)

        self._services[interface] = descriptor
        logger.debug(f"Registered service: {interface.__name__}")

    def register_singleton(
        self,
        interface: Type[T],
        implementation: Type[T] = None,
        factory: Callable[[], T] = None,
    ) -> None:
        """シングルトンサービスを登録"""
        self.register(
            interface=interface,
            implementation=implementation,
            lifetime=LifetimeScope.SINGLETON,
            factory=factory,
        )

    def register_transient(
        self,
        interface: Type[T],
        implementation: Type[T] = None,
        factory: Callable[[], T] = None,
    ) -> None:
        """トランジェントサービスを登録"""
        self.register(
            interface=interface,
            implementation=implementation,
            lifetime=LifetimeScope.TRANSIENT,
            factory=factory,
        )

    def register_scoped(
        self,
        interface: Type[T],
        implementation: Type[T] = None,
        factory: Callable[[], T] = None,
    ) -> None:
        """スコープドサービスを登録"""
        self.register(
            interface=interface,
            implementation=implementation,
            lifetime=LifetimeScope.SCOPED,
            factory=factory,
        )

    def get(self, interface: Type[T], scope_id: Optional[str] = None) -> T:
        """サービスインスタンスを取得"""

        if interface not in self._services:
            raise ValueError(f"Service {interface.__name__} not registered")

        # 循環依存チェック
        if self._is_circular_dependency(interface):
            raise ValueError(f"Circular dependency detected for {interface.__name__}")

        descriptor = self._services[interface]

        if descriptor.lifetime == LifetimeScope.SINGLETON:
            return self._get_singleton_instance(descriptor)
        elif descriptor.lifetime == LifetimeScope.SCOPED:
            return self._get_scoped_instance(descriptor, scope_id or "default")
        else:  # TRANSIENT
            return self._create_instance(descriptor)

    def get_all_by_tag(self, tag: str) -> List[Any]:
        """タグでサービスを取得"""

        services = []
        for interface, descriptor in self._services.items():
            if tag in descriptor.tags:
                services.append(self.get(interface))

        return services

    def create_scope(self, scope_id: str) -> "ServiceScope":
        """サービススコープを作成"""
        return ServiceScope(self, scope_id)

    @asynccontextmanager
    async def scope(self, scope_id: str = "default"):
        """非同期スコープコンテキスト"""

        scope_obj = self.create_scope(scope_id)
        try:
            yield scope_obj
        finally:
            scope_obj.dispose()

    def _get_singleton_instance(self, descriptor: ServiceDescriptor) -> Any:
        """シングルトンインスタンスを取得"""

        if descriptor.interface in self._instances:
            return self._instances[descriptor.interface]

        instance = self._create_instance(descriptor)
        self._instances[descriptor.interface] = instance
        return instance

    def _get_scoped_instance(self, descriptor: ServiceDescriptor, scope_id: str) -> Any:
        """スコープドインスタンスを取得"""

        if scope_id not in self._scoped_instances:
            self._scoped_instances[scope_id] = {}

        scoped_store = self._scoped_instances[scope_id]

        if descriptor.interface in scoped_store:
            return scoped_store[descriptor.interface]

        instance = self._create_instance(descriptor)
        scoped_store[descriptor.interface] = instance
        return instance

    def _create_instance(self, descriptor: ServiceDescriptor) -> Any:
        """インスタンスを作成"""

        if descriptor.interface in self._loading:
            # 再帰的な依存性解決中
            return None

        self._loading[descriptor.interface] = True

        try:
            # ファクトリ関数を使用
            if descriptor.factory:
                return descriptor.factory()

            # 実装クラスを直接インスタンス化
            if descriptor.implementation:
                # 依存性を注入
                return self._inject_dependencies(descriptor.implementation)

            raise ValueError(
                f"Cannot create instance for {descriptor.interface.__name__}"
            )

        finally:
            self._loading.pop(descriptor.interface, None)

    def _inject_dependencies(self, cls: Type[T]) -> T:
        """依存性を注入してインスタンスを作成"""

        # コンストラクタの依存性を取得
        dependencies = self._get_constructor_dependencies(cls)

        if not dependencies:
            return cls()

        # 依存性インスタンスを解決
        resolved_deps = {}
        for dep_type in dependencies:
            resolved_deps[dep_type] = self.get(dep_type)

        return cls(**resolved_deps)

    def _get_dependencies(self, cls: Type) -> List[Type]:
        """クラスの依存性を取得"""

        # アノテーションから依存性を取得（実装予定）
        # 現在はコンストラクタの型ヒントから取得

        return self._get_constructor_dependencies(cls)

    def _get_constructor_dependencies(self, cls: Type) -> List[Type]:
        """コンストラクタの依存性を取得"""

        try:
            signature = inspect.signature(cls.__init__)
            dependencies = []

            for param_name, param in signature.parameters.items():
                if param_name == "self":
                    continue

                # 型ヒントから依存性を取得
                if param.annotation and param.annotation != inspect.Parameter.empty:
                    dependencies.append(param.annotation)

            return dependencies

        except Exception as e:
            logger.warning(f"Failed to get dependencies for {cls.__name__}: {e}")
            return []

    def _is_circular_dependency(self, interface: Type) -> bool:
        """循環依存をチェック"""

        return interface in self._loading

    def dispose(self):
        """コンテナを破棄"""

        self._instances.clear()
        self._scoped_instances.clear()
        self._services.clear()
        self._factories.clear()
        self._loading.clear()

        logger.info("Container disposed")

    def get_registered_services(self) -> Dict[Type, ServiceDescriptor]:
        """登録済みサービスを取得"""

        return self._services.copy()


class ServiceScope:
    """サービススコープ"""

    def __init__(self, container: Container, scope_id: str):
        self.container = container
        self.scope_id = scope_id
        self.disposed = False

    def get(self, interface: Type[T]) -> T:
        """スコープ内でサービスを取得"""

        if self.disposed:
            raise ValueError("Scope has been disposed")

        return self.container.get(interface, self.scope_id)

    def dispose(self):
        """スコープを破棄"""

        if self.disposed:
            return

        # スコープインスタンスをクリア
        if self.scope_id in self.container._scoped_instances:
            del self.container._scoped_instances[self.scope_id]

        self.disposed = True


class Decorators:
    """DIデコレータ群"""

    @staticmethod
    def injectable(
        lifetime: LifetimeScope = LifetimeScope.TRANSIENT,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
    ):
        """注入可能なクラスデコレータ"""

        def decorator(cls):
            cls._lifetime = lifetime
            cls._tags = tags or []
            cls._metadata = metadata or {}
            return cls

        return decorator

    @staticmethod
    def inject(interface: Type[T]):
        """依存性注入デコレータ"""

        def decorator(func):
            def wrapper(*args, **kwargs):
                # コンテナから依存性を取得
                container = get_container()
                dependency = container.get(interface)

                # 関数に依存性を注入
                return func(dependency, *args, **kwargs)

            return wrapper

        return decorator

    @staticmethod
    def singleton(func):
        """シングルトンデコレータ"""

        instance = None

        def wrapper(*args, **kwargs):
            nonlocal instance
            if instance is None:
                instance = func(*args, **kwargs)
            return instance

        return wrapper


# グローバルコンテナインスタンス
_global_container: Optional[Container] = None


def get_container() -> Container:
    """グローバルコンテナを取得"""

    global _global_container
    if _global_container is None:
        _global_container = Container()

    return _global_container


def configure_container(container: Container = None) -> Container:
    """コンテナを設定"""

    global _global_container
    _global_container = container or Container()
    return _global_container


# サービス登録ヘルパー
class ServiceRegistry:
    """サービスレジストリ"""

    @staticmethod
    def register_trading_services(container: Container):
        """取引関連サービスを登録"""

        # 例：取引エンジン
        container.register_singleton(
            TradingEngine, implementation=FastAPITradingEngine, tags=["trading", "core"]
        )

        # 例：ポートフォリオマネージャー
        container.register_scoped(
            PortfolioManager,
            implementation=SQLPortfolioManager,
            tags=["portfolio", "core"],
        )

        # 例：市場データプロバイダー
        container.register_transient(
            MarketDataProvider,
            implementation=AlphaVantageProvider,
            tags=["market", "data"],
        )

    @staticmethod
    def register_ml_services(container: Container):
        """ML関連サービスを登録"""

        # 例：モデルレジストリ
        container.register_singleton(
            ModelRegistry, implementation=DatabaseModelRegistry, tags=["ml", "registry"]
        )

        # 例：予測エンジン
        container.register_scoped(
            PredictionEngine,
            implementation=EnsemblePredictionEngine,
            tags=["ml", "prediction"],
        )

    @staticmethod
    def register_all_services(container: Container):
        """全サービスを登録"""

        ServiceRegistry.register_trading_services(container)
        ServiceRegistry.register_ml_services(container)

        logger.info("All services registered in container")


# 抽象インターフェース定義
class TradingEngine(ABC):
    """取引エンジンインターフェース"""

    @abstractmethod
    async def execute_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """取引を実行"""
        pass


class PortfolioManager(ABC):
    """ポートフォリオマネージャーインターフェース"""

    @abstractmethod
    async def get_portfolio(self, user_id: str) -> Dict[str, Any]:
        """ポートフォリオを取得"""
        pass


class MarketDataProvider(ABC):
    """市場データプロバイダーインターフェース"""

    @abstractmethod
    async def get_quote(self, ticker: str) -> Dict[str, Any]:
        """市場価格を取得"""
        pass


class ModelRegistry(ABC):
    """モデルレジストリインターフェース"""

    @abstractmethod
    async def get_model(self, model_id: str) -> Any:
        """モデルを取得"""
        pass


class PredictionEngine(ABC):
    """予測エンジンインターフェース"""

    @abstractmethod
    async def predict(self, data: Any) -> Dict[str, Any]:
        """予測を実行"""
        pass


# 実装例（既存クラスのラッパー）
class FastAPITradingEngine(TradingEngine):
    """FastAPI取引エンジンの実装"""

    def __init__(self, actual_engine):
        self._engine = actual_engine

    async def execute_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._engine.execute_trade(trade_data)


class SQLPortfolioManager(PortfolioManager):
    """SQLポートフォリオマネージャーの実装"""

    def __init__(self, actual_manager):
        self._manager = actual_manager

    async def get_portfolio(self, user_id: str) -> Dict[str, Any]:
        return await self._manager.get_portfolio(user_id)


class AlphaVantageProvider(MarketDataProvider):
    """Alpha Vantage市場データプロバイダーの実装"""

    def __init__(self, actual_provider):
        self._provider = actual_provider

    async def get_quote(self, ticker: str) -> Dict[str, Any]:
        return await self._provider.get_quote(ticker)
