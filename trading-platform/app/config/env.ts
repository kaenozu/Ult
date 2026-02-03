/**
 * Type-Safe Environment Variable Loading
 * 
 * Uses Zod to validate environment variables at runtime
 * and provides typed access throughout the application.
 */

import { z } from 'zod';

/**
 * Environment Variable Schema
 */
const EnvSchema = z.object({
  // Security
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRATION: z.string().default('24h'),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // WebSocket
  NEXT_PUBLIC_WS_URL: z.string().url().default('ws://localhost:3001/ws'),
  WS_AUTH_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  WS_PORT: z.coerce.number().int().positive().default(3001),
  WS_HOST: z.string().default('0.0.0.0'),
  WS_MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(5),
  WS_MAX_MESSAGE_SIZE: z.coerce.number().int().positive().default(1048576),
  WS_RATE_LIMIT_MAX_MESSAGES: z.coerce.number().int().positive().default(100),

  // External APIs
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  BACKEND_API_URL: z.string().url().default('http://localhost:8000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Data Fetching
  DATA_FETCH_INTERVAL: z.coerce.number().int().positive().default(60000),
  DATA_FETCH_TIMEOUT: z.coerce.number().int().positive().default(30000),

  // Cache
  CACHE_TTL: z.coerce.number().int().positive().default(300000),
  CACHE_MAX_SIZE: z.coerce.number().int().positive().default(1000),

  // Rate Limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REQUESTS_PER_HOUR: z.coerce.number().int().positive().default(500),

  // Risk Management
  DEFAULT_RISK_PERCENTAGE: z.coerce.number().min(0).max(1).default(0.02),
  DEFAULT_STOP_LOSS_PERCENTAGE: z.coerce.number().min(0).max(1).default(0.05),
  DEFAULT_TAKE_PROFIT_PERCENTAGE: z.coerce.number().min(0).max(1).default(0.10),

  // Technical Indicators
  RSI_PERIOD: z.coerce.number().int().positive().default(14),
  MACD_FAST_PERIOD: z.coerce.number().int().positive().default(12),
  MACD_SLOW_PERIOD: z.coerce.number().int().positive().default(26),
  MACD_SIGNAL_PERIOD: z.coerce.number().int().positive().default(9),
  BOLLINGER_BANDS_PERIOD: z.coerce.number().int().positive().default(20),
  BOLLINGER_BANDS_STD_DEV: z.coerce.number().positive().default(2),
  ATR_PERIOD: z.coerce.number().int().positive().default(14),

  // AI Prediction
  ENABLE_AI_PREDICTION: z.coerce.boolean().default(true),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(100).default(80),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_LOGGING: z.coerce.boolean().default(true),

  // Debug
  DEBUG_MODE: z.coerce.boolean().default(false),

  // Security and Rate Limiting
  ENABLE_API_KEY_VALIDATION: z.coerce.boolean().default(true),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // UI
  DEFAULT_THEME: z.enum(['light', 'dark']).default('dark'),
  DEFAULT_MARKET: z.enum(['japan', 'usa']).default('japan'),

  // Analytics and Monitoring
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),

  // Notifications
  ENABLE_NOTIFICATIONS: z.coerce.boolean().default(true),
  NOTIFICATION_TYPE: z.enum(['email', 'browser', 'webhook']).default('browser'),

  // Backtest
  ENABLE_BACKTEST: z.coerce.boolean().default(true),
  BACKTEST_INITIAL_CAPITAL: z.coerce.number().positive().default(1000000),

  // Development Tools
  NEXT_PUBLIC_ENABLE_HOT_RELOAD: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_SOURCE_MAP: z.coerce.boolean().default(false),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().default('development'),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1.0),
  NEXT_PUBLIC_ENABLE_WEB_VITALS: z.coerce.boolean().default(true),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Parsed and validated environment variables
 */
let env: z.infer<typeof EnvSchema> | null = null;

/**
 * Load and validate environment variables
 */
export const loadEnv = (): z.infer<typeof EnvSchema> => {
  if (env) {
    return env;
  }

  try {
    env = EnvSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment validation failed');
    }
    throw error;
  }
};

/**
 * Get environment variable value with type safety
 */
export const getEnv = () => {
  if (!env) {
    return loadEnv();
  }
  return env;
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getEnv().NODE_ENV === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return getEnv().NODE_ENV === 'development';
};

/**
 * Check if running in test mode
 */
export const isTest = (): boolean => {
  return getEnv().NODE_ENV === 'test';
};

/**
 * Export type for environment variables
 */
export type Env = z.infer<typeof EnvSchema>;
