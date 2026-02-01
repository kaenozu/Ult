-- Production Seed Data
-- Description: Minimal initial data for production environment
-- Author: ULT Team
-- Date: 2026-02-01
-- WARNING: Only essential data should be included here

-- ============================================================================
-- Default User Settings Template
-- ============================================================================

-- Note: User-specific data should be created through application logic
-- This is just a reference template

-- ============================================================================
-- Production Cache Cleanup
-- ============================================================================

-- Clean up any expired cache entries on startup
DELETE FROM cache_metadata WHERE expires_at < CURRENT_TIMESTAMP;

-- ============================================================================
-- System Configuration (Optional)
-- ============================================================================

-- Reserved for system-level configuration if needed in the future
-- Example: INSERT INTO system_config (key, value) VALUES ('maintenance_mode', 'false');

-- ============================================================================
-- Important Notes
-- ============================================================================

-- Production data guidelines:
-- 1. Never include test/dummy user data
-- 2. Never include sensitive information
-- 3. Keep seed data minimal - let application create most data
-- 4. Use this only for essential system defaults
-- 5. All user data should come from application registration/usage

-- ============================================================================
-- Verification Queries (Run after seed)
-- ============================================================================

-- Verify tables are empty and ready for production use
-- SELECT COUNT(*) FROM user_settings;        -- Should be 0
-- SELECT COUNT(*) FROM trade_journal;        -- Should be 0
-- SELECT COUNT(*) FROM market_data;          -- Should be 0
-- SELECT COUNT(*) FROM watchlists;           -- Should be 0
