from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple


@dataclass
class ColorTokens:
    tokens: Dict[str, str] = field(default_factory=dict)
    state_map: Dict[str, str] = field(default_factory=dict)

    @classmethod
    def default(cls) -> "ColorTokens":
        tokens = {
            "success": "#0FA3B1",
            "warning": "#F2C14E",
            "error": "#F25F5C",
            "info": "#3366CC",
        }
        state_map = {
            "success": "success",
            "warning": "warning",
            "error": "error",
            "info": "info",
        }
        return cls(tokens=tokens, state_map=state_map)

    def add_state(self, state: str, token_key: str, color: str) -> None:
        self.tokens[token_key] = color
        self.state_map[state] = token_key

    def resolve_color(self, state: str) -> str:
        token_key = self.state_map[state]
        if token_key not in self.tokens:
            raise KeyError(f"Token '{token_key}' is not defined for state '{state}'")
        return self.tokens[token_key]

    def validate_required(self, required_states: Set[str]) -> bool:
        missing = required_states - set(self.state_map.keys())
        if missing:
            raise KeyError(f"Missing states: {', '.join(sorted(missing))}")

        undefined_tokens = [state for state, token in self.state_map.items() if token not in self.tokens]
        if undefined_tokens:
            raise KeyError(f"Undefined tokens for states: {', '.join(sorted(undefined_tokens))}")
        return True


class PerformanceFilter:
    @dataclass(frozen=True)
    class Point:
        date: date
        value: Optional[float]

    @staticmethod
    def _start_date_for_period(period: str, now: date) -> date:
        buffer = 1  # 休日を含むためのバッファ
        if period == "1W":
            return now - timedelta(days=7 + buffer)
        if period == "1M":
            return now - timedelta(days=30 + buffer)
        if period == "3M":
            return now - timedelta(days=90 + buffer)
        if period == "YTD":
            return date(year=now.year, month=1, day=1)
        raise ValueError(f"Unsupported period: {period}")

    @classmethod
    def filter_points(
        cls,
        series: Iterable["PerformanceFilter.Point"],
        period: str,
        now: Optional[date] = None,
        custom_range: Optional[Tuple[date, date]] = None,
    ) -> List["PerformanceFilter.Point"]:
        if now is None:
            now = date.today()

        if period == "custom":
            if not custom_range:
                raise ValueError("custom_range is required for custom period")
            start, end = custom_range
        else:
            start, end = cls._start_date_for_period(period, now), now

        filtered = [point for point in series if point.value is not None and start <= point.date <= end]
        return sorted(filtered, key=lambda p: p.date)


class HeatmapDataBuilder:
    def __init__(self, performance_threshold: float = 0.05) -> None:
        self.performance_threshold = performance_threshold

    def _legend_for_performance(self, performance: float) -> str:
        if performance >= self.performance_threshold:
            return "outperform"
        if performance <= -self.performance_threshold:
            return "underperform"
        return "neutral"

    def build(self, entries: Sequence[Dict[str, float]]) -> List[Dict[str, float]]:
        total_weight = sum(entry.get("weight", 0) for entry in entries)
        if total_weight <= 0:
            raise ValueError("Total weight must be positive")

        normalized_entries = []
        for entry in entries:
            weight = entry.get("weight", 0)
            performance = entry.get("performance", 0.0)
            normalized_entries.append(
                {
                    "sector": entry.get("sector", "unknown"),
                    "performance": performance,
                    "weight": weight,
                    "normalized_weight": weight / total_weight,
                    "legend": self._legend_for_performance(performance),
                }
            )
        return normalized_entries


class OrderHistoryQuery:
    @staticmethod
    def apply_filters(
        orders: Sequence[Dict[str, object]],
        filters: Optional[Dict[str, object]] = None,
    ) -> List[Dict[str, object]]:
        filters = filters or {}
        result = []
        for order in orders:
            ticker = filters.get("ticker")
            statuses = filters.get("status")
            if ticker and order.get("ticker") != ticker:
                continue
            if statuses and order.get("status") not in statuses:
                continue
            result.append(order)
        return sorted(result, key=lambda item: item.get("timestamp"), reverse=True)

    @staticmethod
    def paginate(items: Sequence[Dict[str, object]], page: int, page_size: int) -> Dict[str, object]:
        offset = max(page - 1, 0) * page_size
        return {
            "offset": offset,
            "items": list(items)[offset : offset + page_size],
            "page_size": page_size,
        }


class AlertState(str, Enum):
    CREATED = "created"
    TRIGGERED = "triggered"
    SNOOZED = "snoozed"
    RESOLVED = "resolved"


class AlertStateMachine:
    def __init__(self) -> None:
        self.transitions: Dict[Tuple[AlertState, str], AlertState] = {
            (AlertState.CREATED, "trigger"): AlertState.TRIGGERED,
            (AlertState.TRIGGERED, "snooze"): AlertState.SNOOZED,
            (AlertState.TRIGGERED, "resolve"): AlertState.RESOLVED,
            (AlertState.SNOOZED, "trigger"): AlertState.TRIGGERED,
            (AlertState.SNOOZED, "resolve"): AlertState.RESOLVED,
        }

    def transition(self, state: AlertState, event: str) -> AlertState:
        key = (state, event)
        if key not in self.transitions:
            raise ValueError(f"Invalid transition from {state} on '{event}'")
        return self.transitions[key]


class RetryPolicy:
    def __init__(self, max_attempts: int, base_delay: int, max_delay: Optional[int] = None) -> None:
        if max_attempts <= 0:
            raise ValueError("max_attempts must be positive")
        if base_delay <= 0:
            raise ValueError("base_delay must be positive")
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay

    def backoff_schedule(self) -> List[int]:
        schedule: List[int] = []
        delay = self.base_delay
        for _ in range(self.max_attempts):
            capped = min(delay, self.max_delay) if self.max_delay else delay
            schedule.append(capped)
            delay = min(delay * 2, self.max_delay) if self.max_delay else delay * 2
        return schedule

    def should_retry(self, attempt_index: int) -> bool:
        return attempt_index < self.max_attempts


@dataclass
class ShortcutManager:
    shortcuts: Dict[str, str]
    focus_order: List[str]

    def validate(self) -> None:
        seen_combos: Set[str] = set()
        for action, combo in self.shortcuts.items():
            if combo in seen_combos:
                raise ValueError(f"Duplicate shortcut combo detected: {combo}")
            seen_combos.add(combo)
            if not action:
                raise ValueError("Action name must be non-empty")

        if len(set(self.focus_order)) != len(self.focus_order):
            raise ValueError("focus_order contains duplicates")

    def next_focus(self, current_action: str) -> str:
        if current_action not in self.focus_order:
            return self.focus_order[0]
        index = self.focus_order.index(current_action)
        next_index = (index + 1) % len(self.focus_order)
        return self.focus_order[next_index]


class OnboardingTour:
    def __init__(self, steps: Sequence[str]) -> None:
        if not steps:
            raise ValueError("OnboardingTour requires at least one step")
        self.steps = list(steps)
        self._current_index = 0
        self._skipped_index: Optional[int] = None

    @property
    def current_step(self) -> str:
        return self.steps[self._current_index]

    def advance(self) -> None:
        if self._current_index < len(self.steps) - 1:
            self._current_index += 1

    def skip(self) -> None:
        if self._current_index < len(self.steps) - 1:
            self._skipped_index = self._current_index
            self._current_index = len(self.steps) - 1

    def resume(self) -> None:
        if self._skipped_index is not None:
            self._current_index = self._skipped_index
            self._skipped_index = None


class AuditLogView:
    def __init__(self, entries: Sequence[Dict[str, object]]) -> None:
        self.entries = list(entries)

    def filter(self, **filters: object) -> List[Dict[str, object]]:
        result = []
        for entry in self.entries:
            skip = False
            for key, value in filters.items():
                if entry.get(key) != value:
                    skip = True
                    break
            if not skip:
                result.append(entry)
        return result

    def sort(self, entries: Sequence[Dict[str, object]]) -> List[Dict[str, object]]:
        return sorted(
            entries,
            key=lambda item: (item.get("timestamp"), item.get("id")),
        )


class MetricTooltipCatalog:
    def __init__(self, metrics: Dict[str, Dict[str, object]]) -> None:
        self.metrics = metrics

    @classmethod
    def default(cls) -> "MetricTooltipCatalog":
        metrics = {
            "cagr": {
                "formula": "(終値 / 期首価格) ** (1/年数) - 1",
                "period": "3Y",
                "precision": 2,
                "unit": "percent",
            },
            "sharpe": {
                "formula": "(リターン平均 - 無リスク利子率) / リターン標準偏差",
                "period": "1Y",
                "precision": 3,
                "unit": "ratio",
            },
            "max_drawdown": {
                "formula": "累積損失の最大値",
                "period": "全期間",
                "precision": 3,
                "unit": "percent",
            },
        }
        return cls(metrics)

    def validate(self) -> None:
        allowed_units = {"percent", "ratio", "absolute"}
        for name, config in self.metrics.items():
            if "formula" not in config or "period" not in config or "precision" not in config or "unit" not in config:
                raise ValueError(f"Metric '{name}' is missing required fields")
            if not isinstance(config["precision"], int) or config["precision"] < 0:
                raise ValueError(f"Metric '{name}' precision must be int")
            if config["unit"] not in allowed_units:
                raise ValueError(f"Metric '{name}' has invalid unit '{config['unit']}'")

    def get(self, metric: str) -> str:
        if metric not in self.metrics:
            raise KeyError(f"Metric '{metric}' not found")
        config = self.metrics[metric]
        unit_label = {
            "percent": "％",
            "ratio": "比率",
            "absolute": "絶対値",
        }.get(config["unit"], "")
        return (
            f"式: {config['formula']} / 期間: {config['period']} / "
            f"単位: {unit_label} / 精度: {config['precision']}桁"
        )

    def update(
        self,
        metric: str,
        *,
        formula: str,
        period: str,
        precision: int,
        unit: str | None = None,
    ) -> None:
        selected_unit = unit
        if selected_unit is None:
            selected_unit = self.metrics.get(metric, {}).get("unit", "ratio")
        self.metrics[metric] = {
            "formula": formula,
            "period": period,
            "precision": precision,
            "unit": selected_unit,
        }

    def render_value(self, metric: str, value: float | None) -> str:
        if metric not in self.metrics:
            raise KeyError(f"Metric '{metric}' not found")
        if value is None:
            return "N/A"
        config = self.metrics[metric]
        precision = config.get("precision", 2)
        unit = config.get("unit", "ratio")

        if unit == "percent":
            scaled = value * 100
            return f"{scaled:.{precision}f}%"
        if unit == "absolute" or unit == "ratio":
            return f"{value:.{precision}f}"
        raise ValueError(f"Unknown unit '{unit}' for metric '{metric}'")
