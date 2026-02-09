/**
 * Environment Variable Configuration with Type-Safe Access
 * 
 * Zodスキーマを使用した環境変数の型安全な管理
 * Issue #522 - 定数一元化
 */

import { z } from 'zod';

/**
 * Environment variable schema definition
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Keys
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Application Settings
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PORT: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 3000 : parsed;
  }).default('3000'),
  
  // Feature Flags
  NEXT_PUBLIC_ENABLE_ML_PREDICTIONS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  NEXT_PUBLIC_ENABLE_BACKTEST: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Parsed and validated environment variables
 */
type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * 
 * In development, missing optional values will log warnings.
 * In production, required values will throw errors if missing.
 */
function parseEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Invalid environment variables:', error);
      throw new Error('Invalid environment variables');
    }
    console.warn('⚠️ Environment validation warning:', error);
    // Return parsed with defaults for development
    return envSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
  }
}

/**
 * Type-safe environment variable accessor
 */
export const env = parseEnv();

/**
 * Environment variable accessors with defaults
 */
export const config = {
  /**
   * Application environment
   */
  get isDevelopment() {
    return env.NODE_ENV === 'development';
  },
  
  get isProduction() {
    return env.NODE_ENV === 'production';
  },
  
  get isTest() {
    return env.NODE_ENV === 'test';
  },
  
  /**
   * API Configuration
   */
  get api() {
    return {
      alphaVantageKey: env.ALPHA_VANTAGE_API_KEY,
      openaiKey: env.OPENAI_API_KEY,
      anthropicKey: env.ANTHROPIC_API_KEY,
    };
  },
  
  /**
   * Database Configuration
   */
  get database() {
    return {
      url: env.DATABASE_URL,
    };
  },
  
  /**
   * Sentry Configuration
   */
  get sentry() {
    return {
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      authToken: env.SENTRY_AUTH_TOKEN,
    };
  },
  
  /**
   * Application Configuration
   */
  get app() {
    return {
      url: env.NEXT_PUBLIC_APP_URL,
      port: env.PORT,
    };
  },
  
  /**
   * Feature Flags
   */
  get features() {
    return {
      mlPredictions: env.NEXT_PUBLIC_ENABLE_ML_PREDICTIONS,
      backtest: env.NEXT_PUBLIC_ENABLE_BACKTEST,
    };
  },
  
  /**
   * Logging Configuration
   */
  get logging() {
    return {
      level: env.LOG_LEVEL,
    };
  },
} as const;

/**
 * Type-safe environment variable getter for custom access
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key];
}

/**
 * Check if a required environment variable is set
 */
export function hasEnvVar(key: string): boolean {
  return typeof process.env[key] !== 'undefined' && process.env[key] !== '';
}

/**
 * Validate that required environment variables are set
 * Useful for runtime checks before critical operations
 */
export function validateRequiredEnvVars(keys: string[]): void {
  const missing = keys.filter((key) => !hasEnvVar(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export type { Env };
