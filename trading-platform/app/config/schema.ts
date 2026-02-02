/**
 * Config Schema
 * 
 * Zodによる型安全な設定スキーマ定義
 */

import { z } from 'zod';

// Branded types for units
export type Price = number & { __brand: 'Price' };
export type Percentage = number & { __brand: 'Percentage' };
export type Timestamp = number & { __brand: 'Timestamp' };
export type Volume = number & { __brand: 'Volume' };

// Branded type constructors
export const Price = (value: number): Price => value as Price;
export const Percentage = (value: number): Percentage => value as Percentage;
export const Timestamp = (value: number): Timestamp => value as Timestamp;
export const Volume = (value: number): Volume => value as Volume;

// Environment schema
export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // API Keys
  API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000/api'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  
  // WebSocket
  WS_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3001'),
  WS_URL: z.string().url().default('ws://localhost:3001'),
  
  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  
  // Market Data
  MARKET_DATA_PROVIDER: z.enum(['yahoo', 'alpha', 'mock']).default('yahoo'),
  MARKET_DATA_CACHE_DURATION: z.string().transform(Number).pipe(z.number().int().positive()).default('300'),
  
  // Trading
  DEFAULT_RISK_PERCENT: z.string().transform(Number).pipe(z.number().min(0).max(100)).default('2'),
  MAX_POSITIONS: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),
  DEFAULT_STOP_LOSS: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  DEFAULT_TAKE_PROFIT: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  
  // ML Model
  ML_MODEL_PATH: z.string().default('./models'),
  ML_PREDICTION_THRESHOLD: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.7'),
  
  // Features
  ENABLE_REALTIME_DATA: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  ENABLE_ML_PREDICTIONS: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  ENABLE_BACKTEST_CACHE: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Feature flags schema
export const featureFlagsSchema = z.object({
  enableRealtimeData: z.boolean().default(false),
  enableMLPredictions: z.boolean().default(true),
  enableBacktestCache: z.boolean().default(true),
  enableAdvancedCharts: z.boolean().default(true),
  enablePortfolioOptimization: z.boolean().default(false),
  enableRiskManagement: z.boolean().default(true),
  enablePaperTrading: z.boolean().default(true),
  enableSocialFeatures: z.boolean().default(false),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

// Trading config schema
export const tradingConfigSchema = z.object({
  defaultRiskPercent: z.number().min(0).max(100).default(2),
  maxPositions: z.number().int().positive().default(10),
  defaultStopLoss: z.number().positive().default(5),
  defaultTakeProfit: z.number().positive().default(10),
  maxDrawdownPercent: z.number().min(0).max(100).default(20),
  minConfidenceThreshold: z.number().min(0).max(1).default(0.6),
  defaultPositionSize: z.number().positive().default(1000),
});

export type TradingConfig = z.infer<typeof tradingConfigSchema>;

// Market data config schema
export const marketDataConfigSchema = z.object({
  provider: z.enum(['yahoo', 'alpha', 'mock']).default('yahoo'),
  cacheDuration: z.number().int().positive().default(300),
  defaultInterval: z.enum(['1m', '5m', '15m', '30m', '1h', '1d', '1w', '1M']).default('1d'),
  maxHistoryDays: z.number().int().positive().default(365),
  realtimeUpdateInterval: z.number().int().positive().default(5000),
});

export type MarketDataConfig = z.infer<typeof marketDataConfigSchema>;

// API config schema
export const apiConfigSchema = z.object({
  baseURL: z.string().url().default('http://localhost:3000/api'),
  timeout: z.number().int().positive().default(10000),
  retries: z.number().int().nonnegative().default(3),
  rateLimitPerSecond: z.number().int().positive().default(10),
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;
