import { z } from 'zod';
import { devError } from '@/app/lib/utils/dev-logger';

const DEFAULT_JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(DEFAULT_JWT_SECRET),
  
  // API Keys (Optional in demo/test mode)
  YAHOO_FINANCE_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),

  // Feature Flags
  ENABLE_REAL_TRADING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  ENABLE_ML_TRAINING: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),

  // System Config
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  ENABLE_REAL_TRADING: process.env.ENABLE_REAL_TRADING,
  ENABLE_ML_TRAINING: process.env.ENABLE_ML_TRAINING,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
};

// Parse and validate
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  devError('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // In production, we might want to throw error. In dev/test, we might allow defaults or partial failures.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment variables');
  }
} else {
  // Security Check: Ensure production uses a secure secret
  if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEFAULT_JWT_SECRET) {
    throw new Error('❌ Critical Security Error: You are running in production with the default JWT_SECRET. Please set a secure JWT_SECRET environment variable.');
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
