-- Development Seed Data
-- Description: Test data for development environment
-- Author: ULT Team
-- Date: 2026-02-01

-- ============================================================================
-- Sample User Settings
-- ============================================================================

INSERT INTO user_settings (id, user_id, theme, language, timezone, notifications_enabled, email_alerts)
VALUES 
    ('usr_dev_001', 'dev-user-1', 'dark', 'ja', 'Asia/Tokyo', TRUE, FALSE),
    ('usr_dev_002', 'dev-user-2', 'light', 'en', 'America/New_York', TRUE, TRUE);

-- ============================================================================
-- Sample Chart Preferences
-- ============================================================================

INSERT INTO chart_preferences (id, user_id, chart_type, indicators, timeframe, overlay_volume)
VALUES
    ('chrt_dev_001', 'dev-user-1', 'candlestick', ARRAY['RSI', 'MACD', 'SMA'], '1d', TRUE),
    ('chrt_dev_002', 'dev-user-2', 'line', ARRAY['RSI', 'EMA'], '1h', FALSE);

-- ============================================================================
-- Sample Watchlists
-- ============================================================================

INSERT INTO watchlists (id, user_id, name, description, is_default)
VALUES
    ('wl_dev_001', 'dev-user-1', 'Japanese Stocks', 'My favorite Japanese stocks', TRUE),
    ('wl_dev_002', 'dev-user-1', 'US Tech', 'US Technology stocks', FALSE),
    ('wl_dev_003', 'dev-user-2', 'Default', 'Default watchlist', TRUE);

INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order, notes)
VALUES
    ('wli_dev_001', 'wl_dev_001', '^N225', 1, 'Nikkei 225 Index'),
    ('wli_dev_002', 'wl_dev_001', '7203.T', 2, 'Toyota Motor Corporation'),
    ('wli_dev_003', 'wl_dev_001', '9984.T', 3, 'SoftBank Group Corp'),
    ('wli_dev_004', 'wl_dev_002', 'AAPL', 1, 'Apple Inc.'),
    ('wli_dev_005', 'wl_dev_002', 'GOOGL', 2, 'Alphabet Inc.'),
    ('wli_dev_006', 'wl_dev_002', 'MSFT', 3, 'Microsoft Corporation'),
    ('wli_dev_007', 'wl_dev_003', '^GSPC', 1, 'S&P 500 Index');

-- ============================================================================
-- Sample Market Data (^N225 - Last 7 days)
-- ============================================================================

INSERT INTO market_data (id, symbol, date, open, high, low, close, volume)
VALUES
    ('md_dev_001', '^N225', CURRENT_DATE - INTERVAL '7 days', 38000.00, 38500.00, 37800.00, 38300.00, 250000000),
    ('md_dev_002', '^N225', CURRENT_DATE - INTERVAL '6 days', 38300.00, 38800.00, 38100.00, 38600.00, 270000000),
    ('md_dev_003', '^N225', CURRENT_DATE - INTERVAL '5 days', 38600.00, 39000.00, 38400.00, 38700.00, 280000000),
    ('md_dev_004', '^N225', CURRENT_DATE - INTERVAL '4 days', 38700.00, 38900.00, 38300.00, 38500.00, 260000000),
    ('md_dev_005', '^N225', CURRENT_DATE - INTERVAL '3 days', 38500.00, 38700.00, 38100.00, 38200.00, 240000000),
    ('md_dev_006', '^N225', CURRENT_DATE - INTERVAL '2 days', 38200.00, 38600.00, 38000.00, 38400.00, 255000000),
    ('md_dev_007', '^N225', CURRENT_DATE - INTERVAL '1 days', 38400.00, 38900.00, 38300.00, 38750.00, 265000000);

-- ============================================================================
-- Sample Trade Journal Entries
-- ============================================================================

INSERT INTO trade_journal (id, timestamp, symbol, entry_price, exit_price, profit, profit_percent, signal_type, indicator, status, notes)
VALUES
    ('tj_dev_001', CURRENT_DATE - INTERVAL '10 days', '^N225', 37500.00, 38000.00, 500.00, 1.33, 'LONG', 'RSI', 'CLOSED', 'Good uptrend signal'),
    ('tj_dev_002', CURRENT_DATE - INTERVAL '8 days', '7203.T', 2800.00, 2750.00, -50.00, -1.79, 'LONG', 'MACD', 'CLOSED', 'False breakout'),
    ('tj_dev_003', CURRENT_DATE - INTERVAL '5 days', 'AAPL', 185.00, NULL, NULL, NULL, 'LONG', 'SMA', 'OPEN', 'Waiting for target'),
    ('tj_dev_004', CURRENT_DATE - INTERVAL '3 days', '^N225', 38600.00, 38200.00, -400.00, -1.04, 'SHORT', 'RSI', 'CLOSED', 'Overbought signal'),
    ('tj_dev_005', CURRENT_DATE - INTERVAL '1 days', 'MSFT', 420.00, NULL, NULL, NULL, 'LONG', 'BOLLINGER', 'OPEN', 'Bounce from lower band');

-- ============================================================================
-- Sample Supply/Demand Zones
-- ============================================================================

INSERT INTO supply_demand_zones (id, symbol, price, volume, zone_type, strength)
VALUES
    ('sdz_dev_001', '^N225', 38000.00, 300000000, 'SUPPORT', 0.85),
    ('sdz_dev_002', '^N225', 39000.00, 280000000, 'RESISTANCE', 0.75),
    ('sdz_dev_003', '^N225', 37500.00, 320000000, 'SUPPORT', 0.90),
    ('sdz_dev_004', 'AAPL', 180.00, 50000000, 'SUPPORT', 0.80),
    ('sdz_dev_005', 'AAPL', 195.00, 48000000, 'RESISTANCE', 0.70);

-- ============================================================================
-- Sample Breakout Events
-- ============================================================================

INSERT INTO breakout_events (id, symbol, direction, price, volume, is_confirmed, zone_id, timestamp)
VALUES
    ('be_dev_001', '^N225', 'bullish', 38500.00, 280000000, TRUE, 'sdz_dev_001', CURRENT_DATE - INTERVAL '6 days'),
    ('be_dev_002', '^N225', 'bearish', 38900.00, 260000000, FALSE, 'sdz_dev_002', CURRENT_DATE - INTERVAL '4 days'),
    ('be_dev_003', 'AAPL', 'bullish', 185.00, 52000000, TRUE, 'sdz_dev_004', CURRENT_DATE - INTERVAL '5 days');

-- ============================================================================
-- Sample User Preferences
-- ============================================================================

INSERT INTO user_preferences (id, user_id, key, value)
VALUES
    ('up_dev_001', 'dev-user-1', 'default_symbol', '^N225'),
    ('up_dev_002', 'dev-user-1', 'risk_tolerance', 'medium'),
    ('up_dev_003', 'dev-user-1', 'default_timeframe', '1d'),
    ('up_dev_004', 'dev-user-2', 'default_symbol', 'AAPL'),
    ('up_dev_005', 'dev-user-2', 'risk_tolerance', 'high'),
    ('up_dev_006', 'dev-user-2', 'default_timeframe', '1h');

-- ============================================================================
-- Sample Cache Metadata
-- ============================================================================

INSERT INTO cache_metadata (id, key, symbol, data_type, expires_at)
VALUES
    ('cm_dev_001', 'ohlcv_^N225_1d', '^N225', 'ohlcv', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    ('cm_dev_002', 'indicator_AAPL_RSI', 'AAPL', 'indicator', CURRENT_TIMESTAMP + INTERVAL '30 minutes'),
    ('cm_dev_003', 'prediction_^N225', '^N225', 'prediction', CURRENT_TIMESTAMP + INTERVAL '2 hours');
