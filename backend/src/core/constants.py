"""Project-wide constants (trimmed to essential values for tests and defaults)."""

# Force Reload


from datetime import timedelta

# Realtime / caching defaults
DEFAULT_REALTIME_TTL_SECONDS = 30
DEFAULT_REALTIME_BACKOFF_SECONDS = 1
DEFAULT_PAPER_TRADER_REFRESH_INTERVAL = 300
PAPER_TRADER_REALTIME_FALLBACK_DEFAULT = False
STALE_DATA_MAX_AGE = timedelta(days=2)
MINIMUM_DATA_POINTS = 200   # Increased to ensure LightGBM has enough training data
MARKET_SUMMARY_CACHE_KEY = "market_summary_snapshot"
MARKET_SUMMARY_TTL = 1800
FUNDAMENTAL_CACHE_TTL = 86400

# Volatility symbols
DEFAULT_VOLATILITY_SYMBOL = "^VIX"
FALLBACK_VOLATILITY_SYMBOLS = ["^VIX", "^VXO"]

# Curated stock universe - AI/Semiconductor focus for 2026
NIKKEI_225_TICKERS = [
    "6857.T",   # アドバンテスト - 半導体検査装置世界大手
    "8035.T",   # 東京エレクトロン - 半導体製造装置
    "6920.T",   # レーザーテック - 最先端半導体検査
    "4062.T",   # イビデン - ICパッケージ基板
    "6758.T",   # ソニーG - イメージセンサー
    "7203.T",   # トヨタ自動車 - EV/自動運転
    "9984.T",   # ソフトバンクG - AI投資
    "6501.T",   # 日立製作所 - デジタル/インフラ
    "6954.T",   # ファナック - 産業用ロボット
    "6471.T",   # 日本精工 - ロボティクス部品
]
JP_STOCKS = NIKKEI_225_TICKERS
SP500_TICKERS = ["AAPL", "MSFT", "AMZN"]
STOXX50_TICKERS = ["ASML.AS", "SAP.DE", "TTE.PA"]

# Name mapping (must align 1:1 with NIKKEI_225_TICKERS for tests)
TICKER_NAMES = {
    "6857.T": "アドバンテスト",
    "8035.T": "東京エレクトロン",
    "6920.T": "レーザーテック",
    "4062.T": "イビデン",
    "6758.T": "ソニーG",
    "7203.T": "トヨタ自動車",
    "9984.T": "ソフトバンクG",
    "6501.T": "日立製作所",
    "6954.T": "ファナック",
    "6471.T": "日本精工",
}

# Crypto / FX pairs (minimal)
CRYPTO_PAIRS = ["BTC-USD", "ETH-USD"]
FX_PAIRS = ["USDJPY", "EURUSD"]

# Basic market labels used in UI tabs (dict形式でマーケット→ティッカーリスト)
MARKETS = {
    "Japan": NIKKEI_225_TICKERS,
    "US": SP500_TICKERS,
    "Europe": STOXX50_TICKERS,
    "Crypto": CRYPTO_PAIRS,
    "FX": FX_PAIRS,
}

# Backtest defaults
BACKTEST_DEFAULT_INITIAL_CAPITAL = 1_000_000
BACKTEST_DEFAULT_POSITION_SIZE = 0.1
BACKTEST_DEFAULT_COMMISSION_RATE = 0.0005
BACKTEST_DEFAULT_SLIPPAGE_RATE = 0.0005
BACKTEST_DEFAULT_STOP_LOSS_PCT = 0.05
BACKTEST_DEFAULT_TAKE_PROFIT_PCT = 0.10
BACKTEST_MIN_TRAINING_PERIOD_DAYS = 252
BACKTEST_RETRAIN_PERIOD_DAYS = 30

# Sector rotation mappings (minimal set)
SECTOR_ETFS = {
    "XLK": "Technology",
    "XLE": "Energy",
    "XLU": "Utilities",
    "XLV": "Healthcare",
    "XLF": "Financials",
    "XLI": "Industrials",
    "XLY": "Consumer Discretionary",
    "XLP": "Consumer Staples",
}

SECTOR_NAMES_JA = {
    "XLK": "情報技術",
    "XLE": "エネルギー",
    "XLU": "公益事業",
    "XLV": "ヘルスケア",
    "XLF": "金融",
    "XLI": "資本財",
    "XLY": "一般消費財",
    "XLP": "生活必需品",
}

CYCLE_SECTOR_MAP = {
    "early_recovery": ["XLF", "XLK", "XLI"],
    "expansion": ["XLK", "XLI", "XLY"],
    "early_recession": ["XLP", "XLU", "XLV"],
    "recession": ["XLU", "XLV", "XLE"],
}

# Simple market index map (used lightly)

