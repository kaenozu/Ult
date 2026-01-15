import diskcache
import functools
import logging
import time
from src.paths import DATA_DIR

logger = logging.getLogger(__name__)

# Persistent disk cache
_cache_dir = DATA_DIR / "disk_cache"
_cache_dir.mkdir(parents=True, exist_ok=True)
_cache = diskcache.Cache(str(_cache_dir))


def persistent_cache(expire: int = 86400):
    """Decorator for persistent disk caching."""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create unique key based on func name and arguments
            key = f"{func.__name__}:{args}:{kwargs}"
            result = _cache.get(key)

            if result is not None:
                return result

            # Compute and store
            result = func(*args, **kwargs)
            _cache.set(key, result, expire=expire)
            return result

        return wrapper

    return decorator


def get_cache():
    return _cache
