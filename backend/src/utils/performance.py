"""
Performance Optimization Utilities
Provides caching, lazy loading, and performance monitoring tools to ensure
the system remains responsive under heavy data loads.
"""

import time
import logging
from functools import wraps
from typing import Callable, Dict, List
import streamlit as st
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Tracks execution time of critical functions."""

    def __init__(self):
        self.metrics: Dict[str, List[float]] = {}

    def time_function(self, func_name: str) -> Callable:
        """Decorator to instrument a specific function."""

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    elapsed = time.time() - start_time

                    # Store metric
                    if func_name not in self.metrics:
                        self.metrics[func_name] = []
                    self.metrics[func_name].append(elapsed)

                    # Log if slow (threshold: 1.0s)
                    if elapsed > 1.0:
                        logger.warning(f"⏱️ Slow function: {func_name} took {elapsed:.2f}s")

                    return result
                except Exception as e:
                    elapsed = time.time() - start_time
                    logger.error(f"❌ {func_name} failed after {elapsed:.2f}s: {e}")
                    raise

            return wrapper

        return decorator

    def get_stats(self, func_name: str) -> Dict[str, float]:
        """Returns performance statistics for a tracked function."""
        if func_name not in self.metrics or not self.metrics[func_name]:
            return {}

        times = self.metrics[func_name]
        return {
            "count": len(times),
            "total_time": sum(times),
            "avg_time": sum(times) / len(times),
            "min_time": min(times),
            "max_time": max(times),
        }


# Global performance monitor instance
perf_monitor = PerformanceMonitor()


def cached_data_loader(ttl_seconds: int = 300):
    """Custom caching decorator for non-Streamlit contexts."""
    cache = {}
    cache_time = {}

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a simple cache key from arguments
            # Note: args/kwargs must be hashable or stringifiable
            key = str(args) + str(kwargs)
            current_time = time.time()

            # Check if cached and not expired
            if key in cache and (current_time - cache_time.get(key, 0)) < ttl_seconds:
                logger.debug(f"📦 Cache hit: {func.__name__}")
                return cache[key]

            # Load fresh data
            logger.debug(f"🔄 Cache miss: {func.__name__}")
            result = func(*args, **kwargs)

            # Update cache
            cache[key] = result
            cache_time[key] = current_time
            return result

        return wrapper

    return decorator


@st.cache_data(ttl=600, show_spinner=False)
def cached_market_data(ticker: str, period: str):
    """Streamlit-cached market data loader."""
    import yfinance as yf

    try:
        return yf.download(ticker, period=period, progress=False)
    except Exception as e:
        logger.error(f"Failed to download market data: {e}")
        return pd.DataFrame()


@st.cache_resource(show_spinner=False)
def get_singleton_model(model_name: str):
    """Singleton provider for heavy AI models."""
    logger.info(f"🔧 Initializing singleton: {model_name}")
    # Placeholder for actual model loading logic if needed centralized
    return None


class LazyLoader:
    """Lazy load heavy modules only when needed to improve startup time."""

    def __init__(self, module_name: str):
        self.module_name = module_name
        self._module = None

    def __getattr__(self, name: str):
        if self._module is None:
            logger.info(f"📥 Lazy loading: {self.module_name}")
            import importlib

            self._module = importlib.import_module(self.module_name)
        return getattr(self._module, name)


# Lazy loaders for heavy dependencies
torch_lazy = LazyLoader("torch")
transformers_lazy = LazyLoader("transformers")
lightgbm_lazy = LazyLoader("lightgbm")


def batch_process(items: list, batch_size: int = 10, show_progress: bool = True):
    """Generator that yields batches of items, optionally updating a Streamlit progress bar."""
    total_items = len(items)
    if total_items == 0:
        return

    progress_bar = None
    status_text = None

    if show_progress:
        progress_bar = st.progress(0)
        status_text = st.empty()

    for i in range(0, total_items, batch_size):
        batch = items[i : i + batch_size]

        if show_progress:
            progress = min((i + batch_size) / total_items, 1.0)
            progress_bar.progress(progress)
            status_text.text(f"Processing: {min(i + batch_size, total_items)}/{total_items}")

        yield batch

    if show_progress:
        progress_bar.empty()
        status_text.empty()


def optimize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Downcasts numeric columns to smallest possible types to save memory."""
    for col in df.columns:
        col_type = df[col].dtype

        if col_type is not object and not pd.api.types.is_datetime64_any_dtype(col_type):
            c_min = df[col].min()
            c_max = df[col].max()

            if pd.api.types.is_integer_dtype(col_type):
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
            else:
                if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                    df[col] = df[col].astype(np.float32)

    return df


class ProgressTracker:
    """Track and display progress for long-running operations in UI."""

    def __init__(self, total_steps: int, description: str = "Processing"):
        self.total_steps = total_steps
        self.current_step = 0
        self.description = description
        self.progress_bar = st.progress(0)
        self.status_text = st.empty()

    def update(self, step: int = 1, message: str = ""):
        self.current_step += step
        progress = min(self.current_step / self.total_steps, 1.0) if self.total_steps > 0 else 0
        self.progress_bar.progress(progress)

        status_msg = f"{self.description}: {self.current_step}/{self.total_steps}"
        if message:
            status_msg += f" - {message}"
        self.status_text.text(status_msg)

    def complete(self, message: str = "Complete"):
        self.progress_bar.progress(1.0)
        self.status_text.success(f"✅ {message}")
        time.sleep(0.5)
        self.progress_bar.empty()
        self.status_text.empty()
