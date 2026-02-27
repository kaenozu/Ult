import { z } from 'zod';

const DEFAULT_JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

/**
 * Environment Variable Schema
 *
 * Zod schema for validating environment variables at runtime.
 * Merges configurations from previous env.ts, config/schema.ts, and config/env.ts.
 */
const EnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(DEFAULT_JWT_SECRET),
  JWT_EXPIRATION: z.string().default('24h'),

  // API Keys (Optional in demo/test mode)
  YAHOO_FINANCE_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  API_KEY: z.string().optional(), // From config/schema.ts

  // Feature Flags
  ENABLE_REAL_TRADING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_ML_TRAINING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_DEFAULT_ADMIN: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_AI_PREDICTION: z.coerce.boolean().default(true),
  ENABLE_LOGGING: z.coerce.boolean().default(true),
  ENABLE_REALTIME_DATA: z.coerce.boolean().default(false),
  ENABLE_ML_PREDICTIONS: z.coerce.boolean().default(true),
  ENABLE_BACKTEST_CACHE: z.coerce.boolean().default(true),
  NEXT_PUBLIC_AUTO_INIT_BROKER: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),

  // Initial Admin Config (Only if enabled)
  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default('admin123'),

  // System Config
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database & Services
  DATABASE_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),

  // Market Data Configuration
  MARKET_DATA_PROVIDER: z.enum(['yahoo', 'alpha', 'mock']).default('yahoo'),
  MARKET_DATA_CACHE_DURATION: z.coerce.number().int().positive().default(300),

  // Trading Configuration
  DEFAULT_RISK_PERCENT: z.coerce.number().min(0).max(100).default(2),
  MAX_POSITIONS: z.coerce.number().int().positive().default(10),
  DEFAULT_STOP_LOSS: z.coerce.number().positive().default(5),
  DEFAULT_TAKE_PROFIT: z.coerce.number().positive().default(10),

  // ML Model Configuration
  ML_MODEL_PATH: z.string().default('./models'),
  ML_PREDICTION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});

// Process environment variables
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION,
  YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  API_KEY: process.env.API_KEY,
  ENABLE_REAL_TRADING: process.env.ENABLE_REAL_TRADING,
  ENABLE_ML_TRAINING: process.env.ENABLE_ML_TRAINING,
  ENABLE_DEFAULT_ADMIN: process.env.ENABLE_DEFAULT_ADMIN,
  ENABLE_AI_PREDICTION: process.env.ENABLE_AI_PREDICTION,
  ENABLE_LOGGING: process.env.ENABLE_LOGGING,
  ENABLE_REALTIME_DATA: process.env.ENABLE_REALTIME_DATA,
  ENABLE_ML_PREDICTIONS: process.env.ENABLE_ML_PREDICTIONS,
  ENABLE_BACKTEST_CACHE: process.env.ENABLE_BACKTEST_CACHE,
  NEXT_PUBLIC_AUTO_INIT_BROKER: process.env.NEXT_PUBLIC_AUTO_INIT_BROKER,
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
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
};

// Parse and validate
const parsed = EnvSchema.safeParse(processEnv);

if (!parsed.success) {
  // Use console.error directly to avoid circular dependency
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // In production, we throw an error to prevent starting with invalid config
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment variables');
  }
} else {
  // Security Check: Ensure production uses a secure secret
  if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('CRITICAL SECURITY ERROR: You are running in production with the default JWT_SECRET. Please set a secure JWT_SECRET environment variable.');
  }
}

// Export the validated environment configuration
// In development/test with errors, we fall back to default values (parsed.data might be undefined if !success)
// Using parse({}) allows defaults to kick in for missing values if validation failed but we proceed (dev/test)
export const env = parsed.success ? parsed.data : EnvSchema.parse({});

// Type export
export type Env = z.infer<typeof EnvSchema>;

// Helper functions
export const isProduction = () => env.NODE_ENV === 'production';
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isTest = () => env.NODE_ENV === 'test';
