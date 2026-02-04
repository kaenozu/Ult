/**
 * Example: Using the New Domain-Driven Architecture
 * 
 * This file demonstrates how to import and use modules from the new
 * domain-driven structure using barrel exports and path aliases.
 */

// ============================================================================
// Example 1: Prediction Domain
// ============================================================================

// OLD way (still works but discouraged)
// import { MLModelService } from '@/app/lib/services/ml-model-service';

// NEW way (recommended - using barrel export)
import { 
  MLModelService,
  TensorFlowModelService,
  AdvancedPredictionService 
} from '@/domains/prediction';

// Alternative: Direct import when you need specific control
// import { MLModelService } from '@/domains/prediction/services/ml-model-service';

// ============================================================================
// Example 2: Backtest Domain
// ============================================================================

// OLD way
// import { AdvancedBacktestEngine } from '@/app/lib/backtest/AdvancedBacktestEngine';

// NEW way
import { 
  AdvancedBacktestEngine,
  MonteCarloSimulator,
  WalkForwardAnalyzer 
} from '@/domains/backtest';

// ============================================================================
// Example 3: Market Data Domain
// ============================================================================

// OLD way
// import { DataQualityChecker } from '@/app/lib/data/quality/DataQualityChecker';

// NEW way
import {
  DataQualityChecker,
  DataCompletionPipeline,
  DataLatencyMonitor
} from '@/domains/market-data';

// ============================================================================
// Example 4: Portfolio Domain
// ============================================================================

// OLD way
// import { PortfolioOptimizer } from '@/app/lib/portfolio/PortfolioOptimizer';

// NEW way
import {
  PortfolioOptimizer,
  BlackLitterman,
  RiskParity
} from '@/domains/portfolio';

// ============================================================================
// Example 5: Infrastructure Layer
// ============================================================================

// NEW - Infrastructure services
import {
  ApiValidator,
  CacheManager,
  UnifiedApiClient
} from '@/infrastructure/api';

import {
  ConnectionMetrics
} from '@/infrastructure/websocket';

// ============================================================================
// Example 6: Shared Resources
// ============================================================================

// OLD way
// import { performanceMonitor } from '@/app/lib/utils/performanceMonitor';
// import { INTERVALS } from '@/app/lib/constants/intervals';

// NEW way
import { 
  performanceMonitor,
  singleton 
} from '@/shared/utils/performanceMonitor';

import { INTERVALS } from '@/shared/constants/intervals';

// Types
import type { 
  MarketData,
  OHLCV,
  BacktestConfig 
} from '@/shared/types';

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example function using prediction domain
 */
export async function runPrediction(symbol: string) {
  const mlService = new MLModelService();
  const prediction = await mlService.predict(symbol);
  return prediction;
}

/**
 * Example function using backtest domain
 */
export async function runBacktest(strategy: string, data: OHLCV[]) {
  const engine = new AdvancedBacktestEngine({
    initialCapital: 10000,
    commission: 0.001,
    slippage: 0.0005
  });
  
  const results = await engine.runBacktest(strategy, data);
  return results;
}

/**
 * Example function using multiple domains
 */
export async function analyzePortfolio(symbols: string[]) {
  // Use market data domain
  const qualityChecker = new DataQualityChecker();
  
  // Use prediction domain
  const predictor = new AdvancedPredictionService();
  
  // Use portfolio domain
  const optimizer = new PortfolioOptimizer();
  
  // Analyze each symbol
  const predictions = await Promise.all(
    symbols.map(symbol => predictor.predict(symbol))
  );
  
  // Optimize portfolio
  const portfolio = await optimizer.optimize(predictions);
  
  return portfolio;
}

// ============================================================================
// Key Takeaways
// ============================================================================

/**
 * 1. Use barrel exports (@/domains/prediction) for cleaner imports
 * 2. Group related imports from the same domain
 * 3. Infrastructure and shared modules are cross-cutting
 * 4. Old imports still work during transition period
 * 5. Types should be imported from @/shared/types
 * 
 * Benefits:
 * - Clear domain boundaries
 * - Easier to find related code
 * - Better code organization
 * - Improved maintainability
 */
