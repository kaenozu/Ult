-- Migration: 002_add_user_preferences.sql
-- Description: Extended user preferences and settings management
-- Author: ULT Team
-- Date: 2026-02-01
-- Depends on: 001_initial_schema.sql

-- ============================================================================
-- Extended User Settings
-- ============================================================================

-- Add user settings table for theme, language, notification preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_alerts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Auto-update trigger for user_settings
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Chart Preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS chart_preferences (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    chart_type VARCHAR(20) DEFAULT 'candlestick' CHECK (chart_type IN ('candlestick', 'line', 'area')),
    indicators TEXT[], -- Array of enabled indicators
    timeframe VARCHAR(10) DEFAULT '1d' CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w', '1mo')),
    overlay_volume BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_chart_prefs UNIQUE (user_id)
);

CREATE INDEX idx_chart_preferences_user_id ON chart_preferences(user_id);

-- Auto-update trigger for chart_preferences
CREATE TRIGGER update_chart_preferences_updated_at BEFORE UPDATE ON chart_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Watchlist Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS watchlists (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id VARCHAR(30) PRIMARY KEY,
    watchlist_id VARCHAR(30) NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    CONSTRAINT unique_watchlist_symbol UNIQUE (watchlist_id, symbol)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items(symbol);

-- Auto-update triggers
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Record Migration
-- ============================================================================

INSERT INTO schema_migrations (version, name, checksum) 
VALUES (2, '002_add_user_preferences', 'b2c3d4e5f6g7');
