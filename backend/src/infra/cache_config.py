import datetime


def install_cache():
    """
    Installs a global cache for requests.
    This will cache all HTTP requests made by requests library,
    including those made by yfinance.
    """
    try:
        import requests_cache

        # Cache for 1 hour to avoid excessive API calls
        # Backend 'sqlite' is the default and works well.
        requests_cache.install_cache("yfinance_cache", backend="sqlite", expire_after=datetime.timedelta(hours=1))
        print("Global requests cache installed (expires after 1 hour).")
    except ImportError:
        print("requests_cache not installed. Skipping cache setup.")
