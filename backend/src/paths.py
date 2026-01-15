import os
from pathlib import Path

# Base directory (absolute path to AGStock)
BASE_DIR = Path(__file__).parent.parent.absolute()

# Core subdirectories
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
SCRIPTS_DIR = BASE_DIR / "scripts"
DOCS_DIR = BASE_DIR / "docs"
REPORTS_DIR = DOCS_DIR / "reports"
BIN_DIR = BASE_DIR / "bin"
MODELS_DIR = BASE_DIR / "models"
ASSETS_DIR = BASE_DIR / "assets"

# Ensure essential directories exist
for d in [DATA_DIR, LOGS_DIR, REPORTS_DIR, BIN_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Database Paths
STOCK_DATA_DB = DATA_DIR / "stock_data.db"
PAPER_TRADING_DB = DATA_DIR / "paper_trading.db"
PAPER_TRADING_TEST_DB = DATA_DIR / "paper_trading_test.db"
PERFORMANCE_DB = DATA_DIR / "performance.db"
API_KEYS_DB = DATA_DIR / "api_keys.db"
ALERTS_DB = DATA_DIR / "alerts.db"
USERS_DB = DATA_DIR / "users.db"
CACHE_DB = DATA_DIR / "cache.db"
METRICS_DB = DATA_DIR / "metrics.db"
DIGITAL_TWIN_DB = DATA_DIR / "digital_twin.db"
EARNINGS_ANALYSIS_DB = DATA_DIR / "earnings_analysis.db"
COMMITTEE_FEEDBACK_DB = DATA_DIR / "committee_feedback.db"
SENTIMENT_HISTORY_DB = DATA_DIR / "sentiment_history.db"
TEST_FEEDBACK_DB = DATA_DIR / "test_feedback.db"
MLRUNS_DB = DATA_DIR / "mlruns.db"
YFINANCE_CACHE = DATA_DIR / "yfinance_cache.sqlite"

# Log Paths
MAIN_LOG = LOGS_DIR / "app.log"
AUTO_TRADER_LOG = LOGS_DIR / "auto_trader.log"
HEADLESS_TRADER_LOG = LOGS_DIR / "headless_trader.log"

# Config Paths
CONFIG_JSON = BASE_DIR / "config.json"
CONFIG_YAML = BASE_DIR / "config.yaml"


def get_db_path(name: str) -> str:
    """Utility to get a database path by name (backwards compatibility)."""
    db_map = {
        "stock_data.db": STOCK_DATA_DB,
        "paper_trading.db": PAPER_TRADING_DB,
        "performance.db": PERFORMANCE_DB,
        "api_keys.db": API_KEYS_DB,
        "alerts.db": ALERTS_DB,
        "users.db": USERS_DB,
        "cache.db": CACHE_DB,
    }
    path = db_map.get(name, DATA_DIR / name)
    return str(path)
