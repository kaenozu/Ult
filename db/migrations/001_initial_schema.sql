-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for ULT Trading Platform
-- Author: ULT Team
-- Date: 2026-02-01
-- Database: PostgreSQL (compatible with MySQL with minor adjustments)

-- ============================================================================
-- Market Data Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_data (
    id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    date TIMESTAMP NOT NULL,
    open DECIMAL(18, 4) NOT NULL,
    high DECIMAL(18, 4) NOT NULL,
    low DECIMAL(18, 4) NOT NULL,
    close DECIMAL(18, 4) NOT NULL,
    volume BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_symbol_date UNIQUE (symbol, date)
);

CREATE INDEX idx_market_data_symbol ON market_data(symbol);
CREATE INDEX idx_market_data_date ON market_data(date);

-- ============================================================================
-- Trade Journal Tables
-- ============================================================================

CREATE TYPE trade_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS trade_journal (
    id VARCHAR(30) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    entry_price DECIMAL(18, 4) NOT NULL,
    exit_price DECIMAL(18, 4),
    profit DECIMAL(18, 4),
    profit_percent DECIMAL(8, 4),
    signal_type VARCHAR(50) NOT NULL,
    indicator VARCHAR(50) NOT NULL,
    status trade_status DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_journal_symbol ON trade_journal(symbol);
CREATE INDEX idx_trade_journal_timestamp ON trade_journal(timestamp);
CREATE INDEX idx_trade_journal_status ON trade_journal(status);

-- ============================================================================
-- Supply/Demand Zone Tables
-- ============================================================================

CREATE TYPE zone_type AS ENUM ('SUPPORT', 'RESISTANCE');

CREATE TABLE IF NOT EXISTS supply_demand_zones (
    id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    volume BIGINT NOT NULL,
    zone_type zone_type NOT NULL,
    strength DECIMAL(5, 4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supply_demand_zones_symbol ON supply_demand_zones(symbol);
CREATE INDEX idx_supply_demand_zones_type ON supply_demand_zones(zone_type);

CREATE TABLE IF NOT EXISTS breakout_events (
    id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('bullish', 'bearish')),
    price DECIMAL(18, 4) NOT NULL,
    volume BIGINT NOT NULL,
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    zone_id VARCHAR(30),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_breakout_events_symbol ON breakout_events(symbol);
CREATE INDEX idx_breakout_events_timestamp ON breakout_events(timestamp);

-- ============================================================================
-- User Preferences Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_key UNIQUE (user_id, key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- Cache Metadata Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_metadata (
    id VARCHAR(30) PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    symbol VARCHAR(20),
    data_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_metadata_symbol ON cache_metadata(symbol);
CREATE INDEX idx_cache_metadata_data_type ON cache_metadata(data_type);
CREATE INDEX idx_cache_metadata_expires_at ON cache_metadata(expires_at);

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);

-- Record this migration
INSERT INTO schema_migrations (version, name, checksum) 
VALUES (1, '001_initial_schema', 'a1b2c3d4e5f6');

-- ============================================================================
-- Update Triggers (PostgreSQL)
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_market_data_updated_at BEFORE UPDATE ON market_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_journal_updated_at BEFORE UPDATE ON trade_journal 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supply_demand_zones_updated_at BEFORE UPDATE ON supply_demand_zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breakout_events_updated_at BEFORE UPDATE ON breakout_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cache_metadata_updated_at BEFORE UPDATE ON cache_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
