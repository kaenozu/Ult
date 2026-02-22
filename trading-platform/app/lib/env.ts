import { z } from 'zod';
import { devError, devWarn } from '@/app/lib/utils/dev-logger';

const DEFAULT_JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

/**
 * Environment variable schema definition
 * Merges configurations from app/lib/env.ts and app/lib/config/env.ts
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(DEFAULT_JWT_SECRET),

  // API Keys (Trading)
  YAHOO_FINANCE_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),

  // API Keys (AI/LLM)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Application Settings
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'), // Restored from original env.ts

  PORT: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 3000 : parsed;
  }).optional(),

  // Feature Flags (Server-side control)
  ENABLE_REAL_TRADING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_ML_TRAINING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_DEFAULT_ADMIN: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),

  // Feature Flags (Client-side exposed via NEXT_PUBLIC)
  NEXT_PUBLIC_ENABLE_ML_PREDICTIONS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_BACKTEST: z.string().default('true').transform((val) => val === 'true'),

  // Initial Admin Config (Only if enabled)
  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default('admin123'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Explicitly construct the processEnv object to ensure Next.js build-time replacement works correctly
// and to provide a single source of truth for values before Zod validation.
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  PORT: process.env.PORT,
  ENABLE_REAL_TRADING: process.env.ENABLE_REAL_TRADING,
  ENABLE_ML_TRAINING: process.env.ENABLE_ML_TRAINING,
  ENABLE_DEFAULT_ADMIN: process.env.ENABLE_DEFAULT_ADMIN,
  NEXT_PUBLIC_ENABLE_ML_PREDICTIONS: process.env.NEXT_PUBLIC_ENABLE_ML_PREDICTIONS,
  NEXT_PUBLIC_ENABLE_BACKTEST: process.env.NEXT_PUBLIC_ENABLE_BACKTEST,
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
  LOG_LEVEL: process.env.LOG_LEVEL,
};

// Parse and validate
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  devError('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // In production, we throw error. In dev/test, we fallback to defaults if possible (though unsafe for required fields).
  // However, Zod defaults handle many cases. If parsing fails, it's usually a type mismatch or missing required field without default.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment variables');
  } else {
      devWarn('⚠️ Environment validation warning: Using default/partial env due to validation failure.');
  }
} else {
  // Security Check: Ensure production uses a secure secret
  if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('CRITICAL SECURITY ERROR: You are running in production with the default JWT_SECRET. Please set a secure JWT_SECRET environment variable.');
  }
}

/**
 * Validated environment variables
 */
export const env = parsed.success ? parsed.data : envSchema.parse({});

export type Env = z.infer<typeof envSchema>;

/**
 * Environment variable accessors with defaults (Consolidated from config/env.ts)
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
      yahooKey: env.YAHOO_FINANCE_API_KEY,
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
      realTrading: env.ENABLE_REAL_TRADING,
      mlTraining: env.ENABLE_ML_TRAINING,
      defaultAdmin: env.ENABLE_DEFAULT_ADMIN,
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

  /**
   * Admin Configuration
   */
  get admin() {
      return {
          email: env.DEFAULT_ADMIN_EMAIL,
          password: env.DEFAULT_ADMIN_PASSWORD,
      };
  }
} as const;

/**
 * Type-safe environment variable getter for custom access
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key];
}

/**
 * Check if a required environment variable is set (and strictly not empty string)
 * Note: Zod default values might mask missing env vars if checked against `env` object.
 * This checks against the raw process.env for existence if needed, or simply checks the parsed value.
 * Implementation here checks if the value is truthy in the parsed env (which handles defaults).
 */
export function hasEnvVar(key: keyof Env): boolean {
  const val = env[key];
  return val !== undefined && val !== '' && val !== null;
}

/**
 * Validate that required environment variables are set
 * Useful for runtime checks before critical operations
 */
export function validateRequiredEnvVars(keys: (keyof Env)[]): void {
  const missing = keys.filter((key) => !hasEnvVar(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
