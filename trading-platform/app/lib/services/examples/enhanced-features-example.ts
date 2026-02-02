/**
 * Example Usage: Enhanced Feature Engineering
 * 
 * This example demonstrates how to use the enhanced feature engineering system
 * to calculate 51-dimensional feature vectors for ML predictions.
 */

import { featureCalculationService } from '@/app/lib/services/feature-calculation-service';
import { OHLCV } from '@/app/types';

/**
 * Example: Calculate enhanced features for a stock
 */
export function calculateStockFeatures() {
  // Sample historical data (in real usage, fetch from API)
  const historicalData: OHLCV[] = [
    {
      date: '2024-01-01',
      open: 1000,
      high: 1010,
      low: 990,
      close: 1005,
      volume: 1000000
    },
    {
      date: '2024-01-02',
      open: 1005,
      high: 1020,
      low: 1000,
      close: 1015,
      volume: 1200000
    },
    // ... more data points (minimum 20 recommended)
  ];

  // Sample technical indicators (in real usage, calculate from TechnicalAnalysisService)
  const indicators = {
    rsi: [50, 55, 60],
    sma5: [995, 1000, 1005],
    sma20: [990, 995, 1000],
    sma50: [985, 990, 995],
    macd: {
      macd: [2, 3, 4],
      signal: [1, 2, 3],
      histogram: [1, 1, 1]
    },
    bollingerBands: {
      upper: [1020, 1025, 1030],
      middle: [1000, 1005, 1010],
      lower: [980, 985, 990]
    },
    atr: [15, 16, 17]
  };

  // Calculate enhanced features (51 dimensions)
  const features = featureCalculationService.calculateEnhancedFeatures(
    historicalData,
    indicators
  );

  return features;
}

/**
 * Example: Generate trading signals from features
 */
export function generateTradingSignal(features: ReturnType<typeof calculateStockFeatures>): 'BUY' | 'SELL' | 'HOLD' {
  let bullishSignals = 0;
  let bearishSignals = 0;

  // Candlestick patterns
  if (features.candlestickPatterns.isHammer === 1) bullishSignals++;
  if (features.candlestickPatterns.isShootingStar === 1) bearishSignals++;
  if (features.candlestickPatterns.isEngulfing === 1) bullishSignals += 2;
  if (features.candlestickPatterns.isEngulfing === -1) bearishSignals += 2;

  // Price trajectory
  if (features.priceTrajectory.zigzagTrend === 1) bullishSignals++;
  if (features.priceTrajectory.zigzagTrend === -1) bearishSignals++;
  if (features.priceTrajectory.breakoutPotential > 0.7) bullishSignals++;

  // Volume confirmation
  if (features.volumeProfile.volumeSurge === 1 && features.priceTrajectory.zigzagTrend === 1) {
    bullishSignals += 2; // Strong volume confirmation
  }

  // Volatility regime
  if (features.volatilityRegime.volatilityRegime === 'EXTREME') {
    // Reduce signal strength in extreme volatility
    bullishSignals = Math.floor(bullishSignals * 0.5);
    bearishSignals = Math.floor(bearishSignals * 0.5);
  }

  // Decision
  const signalStrength = bullishSignals - bearishSignals;
  
  if (signalStrength >= 3) return 'BUY';
  if (signalStrength <= -3) return 'SELL';
  return 'HOLD';
}
