# Database Schema Documentation

## Overview

The ULT Trading Platform uses a hybrid database architecture:

1. **Client-side (IndexedDB)**: For browser-based caching and offline capabilities
2. **Server-side (PostgreSQL)**: For persistent storage, user data, and analytics (future implementation)

## Table of Contents

- [IndexedDB Schema](#indexeddb-schema)
- [PostgreSQL Schema](#postgresql-schema)
- [Migration Strategy](#migration-strategy)
- [Rollback Procedures](#rollback-procedures)
- [Development Guidelines](#development-guidelines)

---

## IndexedDB Schema

### Current Version: 2

IndexedDB is used for client-side data caching and offline functionality.

### Object Stores

#### 1. `ohlcv_data`
Stores OHLCV (Open, High, Low, Close, Volume) market data.

```typescript
Key: symbol (string)
Value: OHLCV[] (array of OHLCV objects)

interface OHLCV {
  date: string;      // ISO 8601 date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

**Indexes**: None (key-based lookup)

#### 2. `cache_metadata`
Tracks cache expiration and metadata.

```typescript
Key: key (string)
Value: CacheMetadata

interface CacheMetadata {
  key: string;           // Unique cache key
  symbol?: string;       // Associated symbol
  dataType: string;      // 'ohlcv' | 'indicator' | 'prediction'
  expiresAt: string;     // ISO 8601 timestamp
}
```

**Indexes**:
- `symbol` - For querying by symbol
- `dataType` - For querying by data type
- `expiresAt` - For cleanup operations

#### 3. `user_preferences`
Stores user preferences locally.

```typescript
Key: key (string)
Value: UserPreference

interface UserPreference {
  key: string;
  value: unknown;
  category: string;      // 'general' | 'chart' | 'trading'
  updatedAt: string;     // ISO 8601 timestamp
}
```

**Indexes**:
- `category` - For querying by category

#### 4. `_migrations`
Tracks applied migrations.

```typescript
Key: version (number)
Value: Migration

interface Migration {
  version: number;
  name: string;
  appliedAt: string;     // ISO 8601 timestamp
}
```

**Indexes**:
- `name` - Unique migration name
- `appliedAt` - Application timestamp

---

## PostgreSQL Schema

### Current Version: 3

PostgreSQL will be used for persistent storage, user management, and analytics.

### Tables

#### 1. `market_data`
Stores historical market data.

```sql
CREATE TABLE market_data (
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
    UNIQUE(symbol, date)
);
```

**Indexes**:
- `idx_market_data_symbol` on `symbol`
- `idx_market_data_date` on `date`
- `idx_market_data_symbol_date` on `(symbol, date DESC)`
- `idx_market_data_recent` on `(symbol, date DESC)` WHERE date >= CURRENT_DATE - 90 days

#### 2. `trade_journal`
Stores trading history and journal entries.

```sql
CREATE TABLE trade_journal (
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
```

**Enums**:
- `trade_status`: 'OPEN' | 'CLOSED' | 'CANCELLED'

**Indexes**:
- `idx_trade_journal_symbol` on `symbol`
- `idx_trade_journal_timestamp` on `timestamp`
- `idx_trade_journal_status` on `status`
- `idx_trade_journal_symbol_timestamp` on `(symbol, timestamp DESC)`
- `idx_trade_journal_profit` on `profit DESC` WHERE status = 'CLOSED'

#### 3. `supply_demand_zones`
Stores identified support and resistance zones.

```sql
CREATE TABLE supply_demand_zones (
    id VARCHAR(30) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    volume BIGINT NOT NULL,
    zone_type zone_type NOT NULL,
    strength DECIMAL(5, 4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Enums**:
- `zone_type`: 'SUPPORT' | 'RESISTANCE'

**Indexes**:
- `idx_supply_demand_zones_symbol` on `symbol`
- `idx_supply_demand_zones_type` on `zone_type`

#### 4. `breakout_events`
Stores detected breakout events.

```sql
CREATE TABLE breakout_events (
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
```

**Indexes**:
- `idx_breakout_events_symbol` on `symbol`
- `idx_breakout_events_timestamp` on `timestamp`

#### 5. `user_settings`
Stores user application settings.

```sql
CREATE TABLE user_settings (
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
```

#### 6. `watchlists` and `watchlist_items`
Stores user watchlists.

```sql
CREATE TABLE watchlists (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE watchlist_items (
    id VARCHAR(30) PRIMARY KEY,
    watchlist_id VARCHAR(30) NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(watchlist_id, symbol)
);
```

#### 7. `schema_migrations`
Tracks applied migrations.

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);
```

### Views

#### `active_trades`
Active trading positions.

```sql
CREATE VIEW active_trades AS
SELECT id, symbol, entry_price, timestamp, signal_type, indicator, notes
FROM trade_journal
WHERE status = 'OPEN'
ORDER BY timestamp DESC;
```

#### `trade_performance_summary`
Trading performance by symbol.

```sql
CREATE VIEW trade_performance_summary AS
SELECT 
    symbol,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE profit > 0) as winning_trades,
    AVG(profit_percent) as avg_profit_percent,
    SUM(profit) as total_profit,
    MAX(profit) as best_trade,
    MIN(profit) as worst_trade
FROM trade_journal
WHERE status = 'CLOSED'
GROUP BY symbol;
```

---

## Migration Strategy

### Principles

1. **Sequential Versioning**: Migrations are numbered sequentially (001, 002, 003...)
2. **Never Modify Existing Migrations**: Once applied, migrations are immutable
3. **Always Test Rollbacks**: Every migration should have a rollback procedure
4. **Document Everything**: Each migration must include clear documentation

### Adding a New Migration

#### For IndexedDB (Client-side)

1. **Edit** `trading-platform/app/lib/api/idb-migrations.ts`
2. **Add** a new migration object to the `migrations` array
3. **Increment** `DB_VERSION` constant
4. **Implement** both `up` and `down` functions
5. **Test** locally before committing

Example:
```typescript
{
  version: 3,
  name: 'add_watchlist_store',
  up: (db: IDBDatabase) => {
    const store = db.createObjectStore('watchlist', { keyPath: 'id' });
    store.createIndex('symbol', 'symbol', { unique: false });
  },
  down: (db: IDBDatabase) => {
    db.deleteObjectStore('watchlist');
  },
}
```

#### For PostgreSQL (Server-side)

1. **Create** a new SQL file in `db/migrations/`
2. **Name** it with the next sequential number: `00X_description.sql`
3. **Include** header with description, author, date, and dependencies
4. **Write** migration SQL (CREATE TABLE, ALTER TABLE, etc.)
5. **Update** `schema_migrations` table at the end
6. **Create** corresponding rollback script if needed

Example:
```sql
-- Migration: 004_add_alerts_table.sql
-- Description: Add price alerts feature
-- Depends on: 003_update_indexes.sql

CREATE TABLE price_alerts (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(18, 4) NOT NULL,
    condition VARCHAR(10) CHECK (condition IN ('above', 'below')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version, name, checksum) 
VALUES (4, '004_add_alerts_table', 'checksum_here');
```

### Migration Execution

#### Development
```bash
# IndexedDB migrations run automatically in the browser
# Just reload the application

# PostgreSQL migrations (when implemented)
npm run db:migrate
```

#### Production
```bash
# Run migrations before deployment
npm run db:migrate:production

# Verify migration status
npm run db:migrate:status
```

---

## Rollback Procedures

### IndexedDB Rollback

IndexedDB doesn't support native rollback. To revert:

1. **Clear Data**: Use browser DevTools > Application > IndexedDB > Delete Database
2. **Or Programmatically**:
```typescript
import { idbClient } from '@/app/lib/api/idb-migrations';

await idbClient.clearAllData();
// Re-initialize will start fresh
```

### PostgreSQL Rollback

Each migration should document its rollback procedure.

#### Manual Rollback
```sql
-- To rollback 003_update_indexes.sql
DROP INDEX IF EXISTS idx_market_data_symbol_date;
DROP INDEX IF EXISTS idx_market_data_date_range;
DROP INDEX IF EXISTS idx_market_data_recent;
DROP VIEW IF EXISTS active_trades;
DROP VIEW IF EXISTS trade_performance_summary;
DROP FUNCTION IF EXISTS cleanup_expired_cache();

DELETE FROM schema_migrations WHERE version = 3;
```

#### Automated Rollback (when implemented)
```bash
npm run db:rollback           # Rollback last migration
npm run db:rollback --to=2    # Rollback to specific version
```

---

## Development Guidelines

### Do's ✅

- **Always backup** before running migrations in production
- **Test migrations** in development environment first
- **Write descriptive** migration names
- **Include comments** in SQL migrations
- **Document schema changes** in this file
- **Version sequentially** - no gaps in version numbers
- **Keep migrations small** and focused on one change

### Don'ts ❌

- **Never modify** existing migration files after they've been applied
- **Never drop tables** without a backup strategy
- **Don't skip versions** in the sequence
- **Don't include sensitive data** in seed files
- **Avoid complex logic** in migrations - keep them simple
- **Don't mix concerns** - one migration = one feature/change

### Best Practices

1. **Naming Convention**:
   - IndexedDB: Descriptive names in camelCase
   - PostgreSQL: Numbers + descriptive names in snake_case
   
2. **Testing**:
   - Test migrations on a copy of production data
   - Verify data integrity after migration
   - Test rollback procedures
   
3. **Documentation**:
   - Update this DATABASE.md after each schema change
   - Include migration rationale in commit messages
   - Document any breaking changes

4. **Performance**:
   - Add indexes before tables grow large
   - Consider partitioning for time-series data
   - Monitor query performance after migrations

5. **Security**:
   - Never expose raw SQL in client code
   - Use parameterized queries
   - Validate data types and constraints

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/db-migrations.yml`:

```yaml
name: Database Migrations

on:
  pull_request:
    paths:
      - 'db/**'
      - 'trading-platform/app/lib/api/idb-migrations.ts'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate SQL syntax
        run: |
          # Add SQL linting here
      - name: Test migrations
        run: |
          npm run db:migrate:test
```

### Pre-commit Hooks

Add to `.husky/pre-commit`:

```bash
# Validate schema changes
if git diff --cached --name-only | grep -q "db/"; then
  echo "Schema changes detected, validating..."
  npm run db:validate
fi
```

---

## Future Enhancements

1. **Prisma Integration**: Full Prisma setup with automated migrations
2. **Seeding**: Automated seed data generation for testing
3. **Backup/Restore**: Automated backup before migrations
4. **Migration Validation**: Schema drift detection
5. **Performance Monitoring**: Track migration execution time
6. **Audit Logging**: Track all schema changes

---

## Support

For questions or issues related to database migrations:

1. Check this documentation first
2. Review existing migrations for examples
3. Open an issue with the `database` label
4. Contact the backend team

---

**Last Updated**: 2026-02-01  
**Schema Version**: IndexedDB v2, PostgreSQL v3  
**Maintainer**: ULT Development Team
