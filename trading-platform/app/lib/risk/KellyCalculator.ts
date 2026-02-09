/**
 * Kelly Criterion and Position Sizing Calculator
 * 
 * Provides dynamic position sizing based on:
 * 1. Kelly Criterion (Win Rate and Win/Loss Ratio)
 * 2. Volatility Adjustment (ATR)
 * 3. Concentration Limits (Single position and Sector)
 */

import { 
  KellyParams, 
  KellyResult, 
  PositionSizeRecommendation, 
  VolatilityAdjustment,
  ConcentrationLimits
} from '@/app/types/risk';

export class KellyCalculator {
  private concentrationLimits: ConcentrationLimits;

  constructor(limits?: Partial<ConcentrationLimits>) {
    this.concentrationLimits = {
      maxSinglePosition: limits?.maxSinglePosition ?? 0.2, // 20%
      maxSectorExposure: limits?.maxSectorExposure ?? 0.4, // 40%
      minPositions: limits?.minPositions ?? 5,
      maxPositions: limits?.maxPositions ?? 10,
    };
  }

  /**
   * Calculate Kelly percentage
   */
  calculate(params: KellyParams): KellyResult {
    const { winRate, avgWin, avgLoss, portfolioValue, kellyFraction = 0.5 } = params;

    if (avgLoss <= 0) {
      return {
        kellyPercentage: 0,
        recommendedSize: 0,
        riskLevel: 'LOW',
        confidence: 0,
        warnings: ['Invalid average loss value'],
      };
    }

    const b = avgWin / avgLoss;
    const kelly = winRate - (1 - winRate) / b;
    const safeKelly = Math.max(0, kelly * kellyFraction);
    const recommendedSize = portfolioValue * safeKelly;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (safeKelly > 0.15) riskLevel = 'HIGH';
    else if (safeKelly > 0.08) riskLevel = 'MEDIUM';

    return {
      kellyPercentage: safeKelly,
      recommendedSize,
      riskLevel,
      confidence: Math.min(1, params.winRate * 1.2), // Simplified confidence
      warnings: safeKelly > 0.25 ? ['Extremely high risk position size recommended'] : [],
    };
  }

  /**
   * Adjust position size for volatility (ATR)
   */
  adjustForVolatility(baseSize: number, atr: number, targetVolatility: number = 0.02): { adjustedSize: number; adjustment: VolatilityAdjustment } {
    // ATR percentage of current price
    // Assume prices are normalized or handled by caller for this example
    // In real implementation, price is needed to calculate adjustment
    const actualVolatility = atr; // Simplified
    const adjustmentFactor = Math.min(1.0, targetVolatility / actualVolatility);
    
    return {
      adjustedSize: baseSize * adjustmentFactor,
      adjustment: {
        actualVolatility,
        targetVolatility,
        adjustmentFactor,
      },
    };
  }

  /**
   * 集中度制限を適用
   */
  applyConcentrationLimits(
    symbol: string,
    adjustedSize: number,
    portfolioValue: number,
    currentPositions?: { symbol: string; value: number; sector?: string }[]
  ): Omit<PositionSizeRecommendation, 'volatilityAdjustment' | 'kellyResult'> {
    const appliedLimits: string[] = [];
    let finalSize = adjustedSize;

    const maxSingleSize = portfolioValue * this.concentrationLimits.maxSinglePosition;
    if (finalSize > maxSingleSize) {
      finalSize = maxSingleSize;
      appliedLimits.push(`Single position limit: ${this.concentrationLimits.maxSinglePosition * 100}%`);
    }

    if (currentPositions && currentPositions.length > 0) {
      const currentExposure = currentPositions.reduce((sum, pos) => sum + pos.value, 0);
      const maxSectorSize = portfolioValue * this.concentrationLimits.maxSectorExposure;
      
      if (currentExposure + finalSize > maxSectorSize) {
        finalSize = Math.max(0, maxSectorSize - currentExposure);
        appliedLimits.push(`Sector limit: ${this.concentrationLimits.maxSectorExposure * 100}%`);
      }
    }

    const positionPercentage = finalSize / portfolioValue;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (positionPercentage > 0.15) riskLevel = 'HIGH';
    else if (positionPercentage > 0.08) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    return {
      symbol,
      baseSize: adjustedSize,
      adjustedSize,
      finalSize,
      riskLevel,
      constraints: {
        singlePositionLimit: this.concentrationLimits.maxSinglePosition * 100,
        sectorLimit: this.concentrationLimits.maxSectorExposure * 100,
        appliedLimits,
      },
    };
  }

  /**
   * 完全な推奨計算（Kelly + Volatility + Concentration）
   */
  getRecommendation(
    params: KellyParams,
    symbol: string,
    atr?: number,
    currentPositions?: { symbol: string; value: number; sector?: string }[]
  ): PositionSizeRecommendation {
    const kellyResult = this.calculate(params);
    let currentSize = kellyResult.recommendedSize;

    let volatilityAdjustment: VolatilityAdjustment | undefined;
    if (atr !== undefined && atr > 0) {
      const adjusted = this.adjustForVolatility(currentSize, atr);
      currentSize = adjusted.adjustedSize;
      volatilityAdjustment = adjusted.adjustment;
    }

    const recommendation = this.applyConcentrationLimits(
      symbol,
      currentSize,
      params.portfolioValue,
      currentPositions
    );

    return {
      ...recommendation,
      volatilityAdjustment,
      kellyResult,
    };
  }
}

export const kellyCalculator = new KellyCalculator();
export default kellyCalculator;
