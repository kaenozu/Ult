"""
MLOps Data Models and Enums
MLOpsのデータモデルと列挙型
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


class ModelStatus(str, Enum):
    """モデルステータス"""

    TRAINING = "training"
    READY = "ready"
    DEPLOYED = "deployed"
    FAILED = "failed"
    ARCHIVED = "archived"
    TESTING = "testing"


class ExperimentStatus(str, Enum):
    """実験ステータス"""

    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SCHEDULED = "scheduled"


class DeploymentStatus(str, Enum):
    """デプロイメントステータス"""

    PENDING = "pending"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    FAILED = "failed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"


class MetricType(str, Enum):
    """メトリックタイプ"""

    ACCURACY = "accuracy"
    PRECISION = "precision"
    RECALL = "recall"
    F1_SCORE = "f1_score"
    LOSS = "loss"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"


@dataclass
class ModelMetadata:
    """モデルメタデータ"""

    model_id: str
    name: str
    version: str
    created_at: datetime
    updated_at: datetime
    status: ModelStatus
    framework: str  # tensorflow, pytorch, sklearn, etc.
    model_type: str  # classification, regression, etc.
    description: str = ""
    tags: List[str] = field(default_factory=list)
    hyperparameters: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, float] = field(default_factory=dict)
    file_path: str = ""
    file_size: int = 0
    checksum: str = ""
    training_data_hash: str = ""
    author: str = ""
    environment: Dict[str, str] = field(default_factory=dict)


@dataclass
class ExperimentConfig:
    """実験設定"""

    experiment_id: str
    name: str
    description: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    model_config: Dict[str, Any] = field(default_factory=dict)
    data_config: Dict[str, Any] = field(default_factory=dict)
    training_config: Dict[str, Any] = field(default_factory=dict)
    evaluation_config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    status: ExperimentStatus = ExperimentStatus.SCHEDULED


@dataclass
class ExperimentRun:
    """実験実行"""

    run_id: str
    experiment_id: str
    status: ExperimentStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration: Optional[float] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    artifacts: Dict[str, str] = field(default_factory=dict)
    parameters: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    logs: List[str] = field(default_factory=list)


@dataclass
class DeploymentConfig:
    """デプロイメント設定"""

    deployment_id: str
    model_id: str
    environment: str  # development, staging, production
    endpoint_url: str
    replicas: int = 1
    resources: Dict[str, Any] = field(default_factory=dict)
    health_check_url: str = ""
    auto_scale: bool = False
    canary_deployment: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    status: DeploymentStatus = DeploymentStatus.PENDING


@dataclass
class MonitoringMetric:
    """監視メトリック"""

    metric_id: str
    model_id: str
    metric_type: MetricType
    value: float
    timestamp: datetime
    context: Dict[str, Any] = field(default_factory=dict)
    threshold: Optional[float] = None
    alert_triggered: bool = False


@dataclass
class ModelPerformance:
    """モデルパフォーマンス"""

    model_id: str
    timestamp: datetime
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    latency_ms: Optional[float] = None
    throughput_qps: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    error_rate: Optional[float] = None
    custom_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class ABTestConfig:
    """A/Bテスト設定"""

    test_id: str
    name: str
    description: str = ""
    model_a_id: str
    model_b_id: str
    traffic_split: float = 0.5  # model_aへのトラフィック割合
    start_time: datetime
    end_time: Optional[datetime] = None
    success_metric: str = "accuracy"
    min_sample_size: int = 1000
    statistical_significance: float = 0.95
    status: str = "planned"
    results: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AlertRule:
    """アラートルール"""

    rule_id: str
    name: str
    description: str = ""
    model_id: Optional[str] = None
    metric_type: MetricType
    condition: str  # >, <, >=, <=, ==, !=
    threshold: float
    severity: str = "medium"  # low, medium, high, critical
    enabled: bool = True
    cooldown_minutes: int = 5
    notification_channels: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_triggered: Optional[datetime] = None


@dataclass
class Alert:
    """アラート"""

    alert_id: str
    rule_id: str
    model_id: Optional[str] = None
    metric_type: MetricType
    current_value: float
    threshold: float
    severity: str
    message: str
    triggered_at: datetime
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
