"""
Performance Monitor for Backend

Provides performance monitoring utilities for measuring function execution time.
"""

import time
from functools import wraps
from typing import Callable, TypeVar, Any, Dict, List

T = TypeVar('T')


class PerformanceMonitor:
    """Monitor and measure performance of function execution"""
    
    def __init__(self):
        self._metrics: Dict[str, List[float]] = {}
        self._warnings: Dict[str, List[str]] = {}
    
    def measure(self, name: str, fn: Callable[..., T]) -> T:
        """
        Measure execution time of a function
        
        Args:
            name: Name of the metric
            fn: Function to measure
            
        Returns:
            Result of the function
        """
        start_time = time.time()
        result = fn()
        duration = time.time() - start_time
        
        if name not in self._metrics:
            self._metrics[name] = []
        self._metrics[name].append(duration)
        
        # Warning: 1 second threshold
        if duration > 1.0:
            warning = f"Performance warning: {name} took {duration:.2f}s"
            print(warning)
            if name not in self._warnings:
                self._warnings[name] = []
            self._warnings[name].append(warning)
        
        return result
    
    def get_stats(self, name: str) -> Dict[str, Any]:
        """
        Get statistics for a specific metric
        
        Args:
            name: Name of the metric
            
        Returns:
            Dictionary with statistics
        """
        metrics = self._metrics.get(name, [])
        
        if not metrics:
            return {
                'avg': 0,
                'min': 0,
                'max': 0,
                'count': 0
            }
        
        return {
            'avg': sum(metrics) / len(metrics),
            'min': min(metrics),
            'max': max(metrics),
            'count': len(metrics)
        }
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all metrics
        
        Returns:
            Dictionary mapping metric names to statistics
        """
        result = {}
        for name in self._metrics.keys():
            result[name] = self.get_stats(name)
        return result
    
    def clear(self) -> None:
        """Clear all metrics"""
        self._metrics.clear()
        self._warnings.clear()
    
    def get_warnings(self) -> Dict[str, List[str]]:
        """
        Get all warnings
        
        Returns:
            Dictionary mapping metric names to warnings
        """
        return self._warnings.copy()
    
    def has_warnings(self) -> bool:
        """
        Check if there are any warnings
        
        Returns:
            True if there are warnings, False otherwise
        """
        return len(self._warnings) > 0


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def monitor_performance(name: str):
    """
    Decorator for measuring function performance
    
    Args:
        name: Name of the metric
        
    Returns:
        Decorator function
        
    Example:
        @monitor_performance('calculate_correlation')
        def calculate_correlation(x, y):
            return x * y
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            if name not in performance_monitor._metrics:
                performance_monitor._metrics[name] = []
            performance_monitor._metrics[name].append(duration)
            
            # Warning: 1 second threshold
            if duration > 1.0:
                warning = f"Performance warning: {name} took {duration:.2f}s"
                print(warning)
                if name not in performance_monitor._warnings:
                    performance_monitor._warnings[name] = []
                performance_monitor._warnings[name].append(warning)
            
            return result
        
        return wrapper
    
    return decorator
