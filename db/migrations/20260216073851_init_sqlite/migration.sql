-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "trade_journal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "symbol" TEXT NOT NULL,
    "entry_price" REAL NOT NULL,
    "exit_price" REAL,
    "profit" REAL,
    "profit_percent" REAL,
    "signal_type" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "supply_demand_zones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "volume" INTEGER NOT NULL,
    "zone_type" TEXT NOT NULL,
    "strength" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "breakout_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "volume" INTEGER NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL,
    "zone_id" TEXT,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cache_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "symbol" TEXT,
    "data_type" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "skill_bundles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "skill_bundles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bundle_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bundle_skills_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "skill_bundles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "market_data_symbol_idx" ON "market_data"("symbol");

-- CreateIndex
CREATE INDEX "market_data_date_idx" ON "market_data"("date");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_symbol_date_key" ON "market_data"("symbol", "date");

-- CreateIndex
CREATE INDEX "trade_journal_symbol_idx" ON "trade_journal"("symbol");

-- CreateIndex
CREATE INDEX "trade_journal_timestamp_idx" ON "trade_journal"("timestamp");

-- CreateIndex
CREATE INDEX "trade_journal_status_idx" ON "trade_journal"("status");

-- CreateIndex
CREATE INDEX "supply_demand_zones_symbol_idx" ON "supply_demand_zones"("symbol");

-- CreateIndex
CREATE INDEX "supply_demand_zones_zone_type_idx" ON "supply_demand_zones"("zone_type");

-- CreateIndex
CREATE INDEX "breakout_events_symbol_idx" ON "breakout_events"("symbol");

-- CreateIndex
CREATE INDEX "breakout_events_timestamp_idx" ON "breakout_events"("timestamp");

-- CreateIndex
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key_key" ON "user_preferences"("user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "cache_metadata_key_key" ON "cache_metadata"("key");

-- CreateIndex
CREATE INDEX "cache_metadata_symbol_idx" ON "cache_metadata"("symbol");

-- CreateIndex
CREATE INDEX "cache_metadata_data_type_idx" ON "cache_metadata"("data_type");

-- CreateIndex
CREATE INDEX "cache_metadata_expires_at_idx" ON "cache_metadata"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_name_key" ON "skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skill_bundles_name_key" ON "skill_bundles"("name");

-- CreateIndex
CREATE INDEX "skill_bundles_category_id_idx" ON "skill_bundles"("category_id");

-- CreateIndex
CREATE INDEX "bundle_skills_bundle_id_idx" ON "bundle_skills"("bundle_id");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_skills_name_bundle_id_key" ON "bundle_skills"("name", "bundle_id");
