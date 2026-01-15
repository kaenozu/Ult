"""メトリクスとモニタリングモジュール

このモジュールは、AGStockプロジェクトのパフォーマンス、状態、ビジネス指標を
収集・追跡・監視するための機能を提供します。
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional, Union

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """メトリクスの種類"""

    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class Metric:
    """メトリクスの基本情報"""

    name: str
    type: MetricType
    description: str
    labels: Dict[str, str] = field(default_factory=dict)
    value: Union[int, float] = 0
    timestamp: datetime = field(default_factory=datetime.now)


class MetricsCollector:
    """メトリクス収集クラス"""

    def __init__(self):
        self._metrics: Dict[str, Metric] = {}
        self._business_metrics: Dict[str, Any] = {}

    def increment_counter(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None,
        value: Union[int, float] = 1,
        description: str = "",
    ):
        """カウンターを増加

        Args:
            name (str): メトリクス名
            labels (Optional[Dict[str, str]]): ラベル
            value (Union[int, float]): 増加値
            description (str): 説明
        """
        labels = labels or {}
        key = f"{name}_{str(sorted(labels.items()))}"

        if key in self._metrics:
            self._metrics[key].value += value
        else:
            self._metrics[key] = Metric(
                name=name,
                type=MetricType.COUNTER,
                description=description,
                labels=labels,
                value=value,
            )

        logger.debug(f"Counter {name} incremented by {value}")

    def set_gauge(
        self,
        name: str,
        value: Union[int, float],
        labels: Optional[Dict[str, str]] = None,
        description: str = "",
    ):
        """ゲージを設定

        Args:
            name (str): メトリクス名
            value (Union[int, float]): 値
            labels (Optional[Dict[str, str]]): ラベル
            description (str): 説明
        """
        labels = labels or {}
        key = f"{name}_{str(sorted(labels.items()))}"

        self._metrics[key] = Metric(
            name=name,
            type=MetricType.GAUGE,
            description=description,
            labels=labels,
            value=value,
        )

        logger.debug(f"Gauge {name} set to {value}")

    def observe_histogram(
        self,
        name: str,
        value: Union[int, float],
        labels: Optional[Dict[str, str]] = None,
        description: str = "",
    ):
        """ヒストグラムに値を追加

        Args:
            name (str): メトリクス名
            value (Union[int, float]): 値
            labels (Optional[Dict[str, str]]): ラベル
            description (str): 説明
        """
        labels = labels or {}
        key = f"{name}_{str(sorted(labels.items()))}"

        # 既存のヒストグラムデータがある場合は追加
        if key in self._metrics:
            if isinstance(self._metrics[key].value, list):
                self._metrics[key].value.append(value)
            else:
                self._metrics[key].value = [self._metrics[key].value, value]
        else:
            self._metrics[key] = Metric(
                name=name,
                type=MetricType.HISTOGRAM,
                description=description,
                labels=labels,
                value=[value],
            )

        logger.debug(f"Histogram {name} observed value {value}")

    def record_business_metric(
        self,
        name: str,
        value: Any,
        labels: Optional[Dict[str, str]] = None,
        description: str = "",
    ):
        """ビジネス指標を記録

        Args:
            name (str): メトリクス名
            value (Any): 値
            labels (Optional[Dict[str, str]]): ラベル
            description (str): 説明
        """
        labels = labels or {}
        self._business_metrics[name] = {
            "value": value,
            "labels": labels,
            "description": description,
            "timestamp": datetime.now(),
        }

        logger.debug(f"Business metric {name} recorded with value {value}")

    def get_metric(self, name: str, labels: Optional[Dict[str, str]] = None) -> Optional[Metric]:
        """メトリクスを取得

        Args:
            name (str): メトリクス名
            labels (Optional[Dict[str, str]]): ラベル

        Returns:
            Optional[Metric]: メトリクス。存在しない場合はNone
        """
        labels = labels or {}
        key = f"{name}_{str(sorted(labels.items()))}"
        return self._metrics.get(key)

    def get_business_metric(self, name: str) -> Optional[Dict[str, Any]]:
        """ビジネス指標を取得

        Args:
            name (str): メトリクス名

        Returns:
            Optional[Dict[str, Any]]: ビジネス指標。存在しない場合はNone
        """
        return self._business_metrics.get(name)

    def get_all_metrics(self) -> Dict[str, Metric]:
        """すべてのメトリクスを取得

        Returns:
            Dict[str, Metric]: メトリクスの辞書
        """
        return self._metrics.copy()

    def get_all_business_metrics(self) -> Dict[str, Dict[str, Any]]:
        """すべてのビジネス指標を取得

        Returns:
            Dict[str, Dict[str, Any]]: ビジネス指標の辞書
        """
        return self._business_metrics.copy()

    def reset_metrics(self):
        """すべてのメトリクスをリセット"""
        self._metrics.clear()
        self._business_metrics.clear()


# グローバルメトリクスコレクター（必要に応じて）
_global_metrics_collector: Optional[MetricsCollector] = None


def get_global_metrics_collector() -> MetricsCollector:
    """グローバルメトリクスコレクターを取得

    Returns:
        MetricsCollector: シングルトンのメトリクスコレクターインスタンス
    """
    global _global_metrics_collector
    if _global_metrics_collector is None:
        _global_metrics_collector = MetricsCollector()
    return _global_metrics_collector


def increment_counter(
    name: str,
    labels: Optional[Dict[str, str]] = None,
    value: Union[int, float] = 1,
    description: str = "",
) -> None:
    """グローバルメトリクスコレクターでカウンターを増加

    Args:
        name (str): メトリクス名
        labels (Optional[Dict[str, str]]): ラベル
        value (Union[int, float]): 増加値
        description (str): 説明
    """
    collector = get_global_metrics_collector()
    collector.increment_counter(name, labels, value, description)


def set_gauge(
    name: str,
    value: Union[int, float],
    labels: Optional[Dict[str, str]] = None,
    description: str = "",
) -> None:
    """グローバルメトリクスコレクターでゲージを設定

    Args:
        name (str): メトリクス名
        value (Union[int, float]): 値
        labels (Optional[Dict[str, str]]): ラベル
        description (str): 説明
    """
    collector = get_global_metrics_collector()
    collector.set_gauge(name, value, labels, description)


def observe_histogram(
    name: str,
    value: Union[int, float],
    labels: Optional[Dict[str, str]] = None,
    description: str = "",
) -> None:
    """グローバルメトリクスコレクターでヒストグラムに値を追加

    Args:
        name (str): メトリクス名
        value (Union[int, float]): 値
        labels (Optional[Dict[str, str]]): ラベル
        description (str): 説明
    """
    collector = get_global_metrics_collector()
    collector.observe_histogram(name, value, labels, description)


def record_business_metric(
    name: str,
    value: Any,
    labels: Optional[Dict[str, str]] = None,
    description: str = "",
) -> None:
    """グローバルメトリクスコレクターでビジネス指標を記録

    Args:
        name (str): メトリクス名
        value (Any): 値
        labels (Optional[Dict[str, str]]): ラベル
        description (str): 説明
    """
    collector = get_global_metrics_collector()
    collector.record_business_metric(name, value, labels, description)


def get_metric_value(name: str, labels: Optional[Dict[str, str]] = None) -> Optional[Union[int, float, list]]:
    """グローバルメトリクスコレクターからメトリクスの値を取得

    Args:
        name (str): メトリクス名
        labels (Optional[Dict[str, str]]): ラベル

    Returns:
        Optional[Union[int, float, list]]: メトリクスの値。存在しない場合はNone
    """
    collector = get_global_metrics_collector()
    metric = collector.get_metric(name, labels)
    return metric.value if metric else None


def time_execution(metric_name: str, labels: Optional[Dict[str, str]] = None, description: str = ""):
    """実行時間を計測するデコレーター

    Args:
        metric_name (str): メトリクス名
        labels (Optional[Dict[str, str]]): ラベル
        description (str): 説明
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                observe_histogram(
                    metric_name,
                    execution_time,
                    labels,
                    f"{description} (Execution Time in seconds)",
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                observe_histogram(
                    f"{metric_name}_error",
                    execution_time,
                    labels,
                    f"{description} (Execution Time in seconds on error)",
                )
                raise e

        return wrapper

    return decorator
