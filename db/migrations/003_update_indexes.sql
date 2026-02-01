-- Migration: 003_update_indexes.sql
-- Description: Performance optimization with additional indexes and constraints
-- Author: ULT Team
-- Date: 2026-02-01
-- Depends on: 002_add_user_preferences.sql

-- ============================================================================
-- Performance Indexes for Market Data
-- ============================================================================

-- Composite index for common queries
CREATE INDEX idx_market_data_symbol_date ON market_data(symbol, date DESC);

-- Index for date range queries
CREATE INDEX idx_market_data_date_range ON market_data(date DESC, symbol);

-- Partial index for recent data (last 90 days)
CREATE INDEX idx_market_data_recent ON market_data(symbol, date DESC)
    WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================
-- Performance Indexes for Trade Journal
-- ============================================================================

-- Composite index for user trade history
CREATE INDEX idx_trade_journal_symbol_timestamp ON trade_journal(symbol, timestamp DESC);

-- Index for profit analysis
CREATE INDEX idx_trade_journal_profit ON trade_journal(profit DESC) WHERE status = 'CLOSED';

-- Index for open trades
CREATE INDEX idx_trade_journal_open ON trade_journal(timestamp DESC) WHERE status = 'OPEN';

-- ============================================================================
-- Additional Constraints
-- ============================================================================

-- Add check constraints for data validity
ALTER TABLE market_data 
    ADD CONSTRAINT check_market_data_prices 
    CHECK (open > 0 AND high >= open AND high >= close AND low <= open AND low <= close AND volume >= 0);

ALTER TABLE trade_journal
    ADD CONSTRAINT check_trade_prices
    CHECK (entry_price > 0 AND (exit_price IS NULL OR exit_price > 0));

-- ============================================================================
-- Cache Cleanup Function
-- ============================================================================

-- Function to delete expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache_metadata WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View for active trades
CREATE OR REPLACE VIEW active_trades AS
SELECT 
    id,
    symbol,
    entry_price,
    timestamp,
    signal_type,
    indicator,
    notes
FROM trade_journal
WHERE status = 'OPEN'
ORDER BY timestamp DESC;

-- View for trade performance summary
CREATE OR REPLACE VIEW trade_performance_summary AS
SELECT 
    symbol,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE profit > 0) as winning_trades,
    COUNT(*) FILTER (WHERE profit <= 0) as losing_trades,
    ROUND(AVG(profit_percent), 2) as avg_profit_percent,
    ROUND(SUM(profit), 2) as total_profit,
    MAX(profit) as best_trade,
    MIN(profit) as worst_trade
FROM trade_journal
WHERE status = 'CLOSED'
GROUP BY symbol;

-- View for recent market data (last 30 days)
CREATE OR REPLACE VIEW recent_market_data AS
SELECT *
FROM market_data
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY symbol, date DESC;

-- ============================================================================
-- Record Migration
-- ============================================================================

INSERT INTO schema_migrations (version, name, checksum) 
VALUES (3, '003_update_indexes', 'c3d4e5f6g7h8');
