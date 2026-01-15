"""Lightweight health checks for runtime environment."""

import logging
import os
import shutil
import time
from typing import Dict, Iterable, Tuple

logger = logging.getLogger(__name__)


def quick_health_check(
    disk_threshold_gb: float = 1.0,
    mem_threshold_gb: float = 1.0,
    endpoints: Iterable[str] | None = None,
    max_latency_ms: float = 1500.0,
) -> Dict[str, bool | float]:
    """
    Returns dict flags for disk/memory/API health.
    Falls back gracefully if psutil or requests is unavailable.
    """
    status: Dict[str, bool | float] = {
        "disk_ok": True,
        "memory_ok": True,
        "api_ok": True,
        "api_latency_ms": 0.0,
    }

    # Disk
    try:
        total, used, free = shutil.disk_usage(os.getcwd())
        free_gb = free / (1024**3)
        if free_gb < disk_threshold_gb:
            status["disk_ok"] = False
            logger.warning("Low disk space: %.2f GB free (< %.2f GB)", free_gb, disk_threshold_gb)
    except Exception as exc:
        logger.debug("Disk check failed: %s", exc)

    # Memory
    try:
        import psutil  # type: ignore

        avail_gb = psutil.virtual_memory().available / (1024**3)
        if avail_gb < mem_threshold_gb:
            status["memory_ok"] = False
            logger.warning("Low memory: %.2f GB available (< %.2f GB)", avail_gb, mem_threshold_gb)
    except Exception as exc:
        # psutil not installed or failed; skip
        logger.debug("Memory check skipped: %s", exc)

    # API latency check (best-effort)
    if endpoints:
        api_ok, latency = _check_api_latency(endpoints, max_latency_ms=max_latency_ms)
        status["api_ok"] = api_ok
        status["api_latency_ms"] = latency
        if not api_ok:
            logger.warning("API latency degraded: %.0f ms (limit %.0f ms)", latency, max_latency_ms)

    return status


def _check_api_latency(endpoints: Iterable[str], max_latency_ms: float = 1500.0) -> Tuple[bool, float]:
    """
    Best-effort latency/response check for HTTP APIs.
    Returns (ok, last_latency_ms). Does not raise.
    """
    try:
        import requests
    except Exception:
        # If requests isn't available, don't fail trading
        return True, 0.0

    last_latency_ms = 0.0
    for url in endpoints:
        start = time.perf_counter()
        try:
            resp = requests.get(url, timeout=max_latency_ms / 1000.0)
            last_latency_ms = (time.perf_counter() - start) * 1000.0
            if resp.status_code >= 500 or last_latency_ms > max_latency_ms:
                return False, last_latency_ms
        except Exception as exc:
            logger.debug("API health check failed for %s: %s", url, exc)
            return False, last_latency_ms
    return True, last_latency_ms
