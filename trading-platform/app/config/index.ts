/**
 * Config Index
 * 
 * 検証済み設定オブジェクトのエクスポート
 * process.envへのアクセスを一元管理
 */

import { 
  envSchema, 
  featureFlagsSchema, 
  tradingConfigSchema, 
  marketDataConfigSchema,
  apiConfigSchema,
  type EnvConfig,
  type FeatureFlags,
  type TradingConfig,
  type MarketDataConfig,
  type ApiConfig,
} from './schema';

// Validate and parse environment variables
function parseEnv(): EnvConfig {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    API_KEY: process.env.API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    MARKET_DATA_PROVIDER: process.env.MARKET_DATA_PROVIDER,
    MARKET_DATA_CACHE_DURATION: process.env.MARKET_DATA_CACHE_DURATION,
    DEFAULT_RISK_PERCENT: process.env.DEFAULT_RISK_PERCENT,
    MAX_POSITIONS: process.env.MAX_POSITIONS,
    DEFAULT_STOP_LOSS: process.env.DEFAULT_STOP_LOSS,
    DEFAULT_TAKE_PROFIT: process.env.DEFAULT_TAKE_PROFIT,
    ML_MODEL_PATH: process.env.ML_MODEL_PATH,
    ML_PREDICTION_THRESHOLD: process.env.ML_PREDICTION_THRESHOLD,
    ENABLE_REALTIME_DATA: process.env.ENABLE_REALTIME_DATA,
    ENABLE_ML_PREDICTIONS: process.env.ENABLE_ML_PREDICTIONS,
    ENABLE_BACKTEST_CACHE: process.env.ENABLE_BACKTEST_CACHE,
  };

  return envSchema.parse(env);
}

// Parse feature flags from environment
function parseFeatureFlags(env: EnvConfig): FeatureFlags {
  return featureFlagsSchema.parse({
    enableRealtimeData: env.ENABLE_REALTIME_DATA,
    enableMLPredictions: env.ENABLE_ML_PREDICTIONS,
    enableBacktestCache: env.ENABLE_BACKTEST_CACHE,
  });
}

// Parse trading config from environment
function parseTradingConfig(env: EnvConfig): TradingConfig {
  return tradingConfigSchema.parse({
    defaultRiskPercent: env.DEFAULT_RISK_PERCENT,
    maxPositions: env.MAX_POSITIONS,
    defaultStopLoss: env.DEFAULT_STOP_LOSS,
    defaultTakeProfit: env.DEFAULT_TAKE_PROFIT,
  });
}

// Parse market data config from environment
function parseMarketDataConfig(env: EnvConfig): MarketDataConfig {
  return marketDataConfigSchema.parse({
    provider: env.MARKET_DATA_PROVIDER,
    cacheDuration: env.MARKET_DATA_CACHE_DURATION,
  });
}

// Parse API config from environment
function parseApiConfig(env: EnvConfig): ApiConfig {
  return apiConfigSchema.parse({
    baseURL: env.NEXT_PUBLIC_API_URL,
  });
}

// Lazy-loaded config to avoid issues with SSR
let _env: EnvConfig | null = null;
let _features: FeatureFlags | null = null;
let _trading: TradingConfig | null = null;
let _marketData: MarketDataConfig | null = null;
let _api: ApiConfig | null = null;

// Getters that lazily initialize
export const config = {
  get env(): EnvConfig {
    if (!_env) _env = parseEnv();
    return _env;
  },
  
  get features(): FeatureFlags {
    if (!_features) _features = parseFeatureFlags(this.env);
    return _features;
  },
  
  get trading(): TradingConfig {
    if (!_trading) _trading = parseTradingConfig(this.env);
    return _trading;
  },
  
  get marketData(): MarketDataConfig {
    if (!_marketData) _marketData = parseMarketDataConfig(this.env);
    return _marketData;
  },
  
  get api(): ApiConfig {
    if (!_api) _api = parseApiConfig(this.env);
    return _api;
  },
  
  // Reset all cached configs (useful for testing)
  reset(): void {
    _env = null;
    _features = null;
    _trading = null;
    _marketData = null;
    _api = null;
  },
};

// Re-export types and schemas
export * from './schema';
export { config as default };
