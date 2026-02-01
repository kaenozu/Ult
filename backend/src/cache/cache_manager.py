"""
Cache Manager for Backend Performance Optimization

Provides in-memory caching with TTL support for frequently accessed data.
"""

import time
import hashlib
import json
from typing import Any, Callable, TypeVar, Optional
from functools import wraps

T = TypeVar('T')


class CacheManager:
    """
    In-memory cache with TTL (Time To Live) support.
    
    Features:
    - Automatic expiration based on TTL
    - LRU (Least Recently Used) eviction policy
    - Decorator support for memoization
    - Cache statistics tracking
    """
    
    def __init__(self, ttl: int = 300, max_size: int = 1000):
        """
        Initialize cache with TTL in seconds.
        
        Args:
            ttl: Time to live for cache entries in seconds (default: 300 = 5 minutes)
            max_size: Maximum number of entries in cache (default: 1000)
        """
        self.ttl = ttl
        self.max_size = max_size
        self._cache: dict[str, tuple[Any, float]] = {}
        self._access_times: dict[str, float] = {}
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if exists and not expired, None otherwise
        """
        if key not in self._cache:
            self._misses += 1
            return None
        
        value, timestamp = self._cache[key]
        
        # Check if expired
        if time.time() - timestamp > self.ttl:
            del self._cache[key]
            del self._access_times[key]
            self._misses += 1
            return None
        
        # Update access time for LRU
        self._access_times[key] = time.time()
        self._hits += 1
        
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache with current timestamp.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL for this entry (overrides default)
        """
        # Evict oldest entry if cache is full
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        self._cache[key] = (value, time.time())
        self._access_times[key] = time.time()
        
        # If custom TTL is provided, set up auto-expiry
        if ttl and ttl != self.ttl:
            # Schedule deletion
            def expire():
                if key in self._cache:
                    del self._cache[key]
                    del self._access_times[key]
            
            # Use threading.Timer for async expiry
            import threading
            timer = threading.Timer(ttl, expire)
            timer.daemon = True
            timer.start()
    
    def _evict_oldest(self) -> None:
        """
        Evict the least recently used entry from cache.
        """
        if not self._access_times:
            return
        
        # Find oldest entry by access time
        oldest_key = min(self._access_times, key=self._access_times.get)
        
        del self._cache[oldest_key]
        del self._access_times[oldest_key]
    
    def clear(self) -> None:
        """
        Clear all cached values.
        """
        self._cache.clear()
        self._access_times.clear()
        self._hits = 0
        self._misses = 0
    
    def memoize(self, func: Callable[..., T]) -> Callable[..., T]:
        """
        Decorator to memoize function results.
        
        Args:
            func: Function to memoize
            
        Returns:
            Wrapped function with caching
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = self._create_cache_key(func.__name__, args, kwargs)
            
            # Check cache
            cached = self.get(key)
            if cached is not None:
                return cached
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            self.set(key, result)
            
            return result
        
        return wrapper
    
    def _create_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """
        Create a unique cache key from function arguments.
        
        Args:
            func_name: Name of the function
            args: Positional arguments
            kwargs: Keyword arguments
            
        Returns:
            MD5 hash as cache key
        """
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get_stats(self) -> dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'total_requests': total_requests,
            'hit_rate': hit_rate,
            'ttl': self.ttl,
        }
    
    def invalidate(self, pattern: Optional[str] = None) -> int:
        """
        Invalidate cache entries matching a pattern.
        
        Args:
            pattern: Optional pattern to match keys (if None, clear all)
            
        Returns:
            Number of entries invalidated
        """
        if pattern is None:
            count = len(self._cache)
            self.clear()
            return count
        
        count = 0
        keys_to_delete = []
        
        for key in list(self._cache.keys()):
            if pattern in key:
                keys_to_delete.append(key)
                count += 1
        
        for key in keys_to_delete:
            del self._cache[key]
            if key in self._access_times:
                del self._access_times[key]
        
        return count
    
    def get_keys(self) -> list[str]:
        """
        Get all cache keys.
        
        Returns:
            List of all cache keys
        """
        return list(self._cache.keys())


# Global cache instances with different TTLs
# Short-term cache for real-time data (1 minute)
short_term_cache = CacheManager(ttl=60, max_size=500)

# Medium-term cache for frequently accessed data (5 minutes)
medium_term_cache = CacheManager(ttl=300, max_size=1000)

# Long-term cache for rarely changing data (30 minutes)
long_term_cache = CacheManager(ttl=1800, max_size=2000)

# Default cache
cache_manager = medium_term_cache


def cached(ttl: int = 300, max_size: int = 1000):
    """
    Decorator factory for creating cached functions.
    
    Args:
        ttl: Time to live in seconds
        max_size: Maximum cache size
        
    Returns:
        Decorator function
        
    Example:
        @cached(ttl=60)
        def expensive_function(x, y):
            return x * y
    """
    cache = CacheManager(ttl=ttl, max_size=max_size)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        return cache.memoize(func)
    
    return decorator
Cache Manager for Backend Performance Optimization

Provides in-memory caching with TTL support for frequently accessed data.
"""

import time
import hashlib
import json
from typing import Any, Callable, TypeVar, Optional
from functools import wraps

T = TypeVar('T')


class CacheManager:
    """
    In-memory cache with TTL (Time To Live) support.
    
    Features:
    - Automatic expiration based on TTL
    - LRU (Least Recently Used) eviction policy
    - Decorator support for memoization
    - Cache statistics tracking
    """
    
    def __init__(self, ttl: int = 300, max_size: int = 1000):
        """
        Initialize cache with TTL in seconds.
        
        Args:
            ttl: Time to live for cache entries in seconds (default: 300 = 5 minutes)
            max_size: Maximum number of entries in cache (default: 1000)
        """
        self.ttl = ttl
        self.max_size = max_size
        self._cache: dict[str, tuple[Any, float]] = {}
        self._access_times: dict[str, float] = {}
        self._hits = 0
        self._misses = 0
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if exists and not expired, None otherwise
        """
        if key not in self._cache:
            self._misses += 1
            return None
        
        value, timestamp = self._cache[key]
        
        # Check if expired
        if time.time() - timestamp > self.ttl:
            del self._cache[key]
            del self._access_times[key]
            self._misses += 1
            return None
        
        # Update access time for LRU
        self._access_times[key] = time.time()
        self._hits += 1
        
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache with current timestamp.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL for this entry (overrides default)
        """
        # Evict oldest entry if cache is full
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        self._cache[key] = (value, time.time())
        self._access_times[key] = time.time()
        
        # If custom TTL is provided, set up auto-expiry
        if ttl and ttl != self.ttl:
            # Schedule deletion
            def expire():
                if key in self._cache:
                    del self._cache[key]
                    del self._access_times[key]
            
            # Use threading.Timer for async expiry
            import threading
            timer = threading.Timer(ttl, expire)
            timer.daemon = True
            timer.start()
    
    def _evict_oldest(self) -> None:
        """
        Evict the least recently used entry from cache.
        """
        if not self._access_times:
            return
        
        # Find oldest entry by access time
        oldest_key = min(self._access_times, key=self._access_times.get)
        
        del self._cache[oldest_key]
        del self._access_times[oldest_key]
    
    def clear(self) -> None:
        """
        Clear all cached values.
        """
        self._cache.clear()
        self._access_times.clear()
        self._hits = 0
        self._misses = 0
    
    def memoize(self, func: Callable[..., T]) -> Callable[..., T]:
        """
        Decorator to memoize function results.
        
        Args:
            func: Function to memoize
            
        Returns:
            Wrapped function with caching
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = self._create_cache_key(func.__name__, args, kwargs)
            
            # Check cache
            cached = self.get(key)
            if cached is not None:
                return cached
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            self.set(key, result)
            
            return result
        
        return wrapper
    
    def _create_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """
        Create a unique cache key from function arguments.
        
        Args:
            func_name: Name of the function
            args: Positional arguments
            kwargs: Keyword arguments
            
        Returns:
            MD5 hash as cache key
        """
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get_stats(self) -> dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'total_requests': total_requests,
            'hit_rate': hit_rate,
            'ttl': self.ttl,
        }
    
    def invalidate(self, pattern: Optional[str] = None) -> int:
        """
        Invalidate cache entries matching a pattern.
        
        Args:
            pattern: Optional pattern to match keys (if None, clear all)
            
        Returns:
            Number of entries invalidated
        """
        if pattern is None:
            count = len(self._cache)
            self.clear()
            return count
        
        count = 0
        keys_to_delete = []
        
        for key in list(self._cache.keys()):
            if pattern in key:
                keys_to_delete.append(key)
                count += 1
        
        for key in keys_to_delete:
            del self._cache[key]
            if key in self._access_times:
                del self._access_times[key]
        
        return count
    
    def get_keys(self) -> list[str]:
        """
        Get all cache keys.
        
        Returns:
            List of all cache keys
        """
        return list(self._cache.keys())


# Global cache instances with different TTLs
# Short-term cache for real-time data (1 minute)
short_term_cache = CacheManager(ttl=60, max_size=500)

# Medium-term cache for frequently accessed data (5 minutes)
medium_term_cache = CacheManager(ttl=300, max_size=1000)

# Long-term cache for rarely changing data (30 minutes)
long_term_cache = CacheManager(ttl=1800, max_size=2000)

# Default cache
cache_manager = medium_term_cache


def cached(ttl: int = 300, max_size: int = 1000):
    """
    Decorator factory for creating cached functions.
    
    Args:
        ttl: Time to live in seconds
        max_size: Maximum cache size
        
    Returns:
        Decorator function
        
    Example:
        @cached(ttl=60)
        def expensive_function(x, y):
            return x * y
    """
    cache = CacheManager(ttl=ttl, max_size=max_size)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        return cache.memoize(func)
    
    return decorator

