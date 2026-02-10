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

export const DEFAULT_KELLY_FRACTION = 0.5;
export const DEFAULT_CONCENTRATION_LIMITS: ConcentrationLimits = {
  maxSinglePosition: 0.2, // 20%
  maxSectorExposure: 0.4, // 40%
  minPositions: 5,
  maxPositions: 10,
};

export class KellyCalculator {
  private concentrationLimits: ConcentrationLimits;
  private kellyFraction: number;

  constructor(kellyFraction: number = DEFAULT_KELLY_FRACTION, limits?: Partial<ConcentrationLimits>) {
    this.kellyFraction = kellyFraction;
    this.concentrationLimits = {
      ...DEFAULT_CONCENTRATION_LIMITS,
      ...limits,
    };
  }

  getConfig() {
    return {
      concentrationLimits: this.concentrationLimits,
      kellyFraction: this.kellyFraction,
    };
  }

  setKellyFraction(fraction: number) {
    if (fraction <= 0 || fraction > 1) {
      throw new Error('Kelly fraction must be between 0 and 1');
    }
    this.kellyFraction = fraction;
  }

  setConcentrationLimits(limits: Partial<ConcentrationLimits>) {
    this.concentrationLimits = {
      ...this.concentrationLimits,
      ...limits,
    };
  }

  /**
   * Calculate Kelly percentage
   */
  calculate(params: KellyParams): KellyResult {
    const { winRate, avgWin, avgLoss, portfolioValue, kellyFraction = this.kellyFraction } = params;
    const warnings: string[] = [];

    // Validations
    if (winRate < 0 || winRate > 1) {
      warnings.push('Win rate must be between 0 and 1');
      return { kellyPercentage: 0, recommendedSize: 0, riskLevel: 'HIGH', confidence: 0, warnings };
    }
    if (avgWin <= 0) {
      warnings.push('Average win must be positive');
      return { kellyPercentage: 0, recommendedSize: 0, riskLevel: 'HIGH', confidence: 0, warnings };
    }
    if (avgLoss <= 0) {
      warnings.push('Average loss must be positive');
      return { kellyPercentage: 0, recommendedSize: 0, riskLevel: 'HIGH', confidence: 0, warnings };
    }
    if (portfolioValue <= 0) {
      warnings.push('Portfolio value must be positive');
      return { kellyPercentage: 0, recommendedSize: 0, riskLevel: 'HIGH', confidence: 0, warnings };
    }

    const b = avgWin / avgLoss;
    const kelly = winRate - (1 - winRate) / b;
    
    if (kelly <= 0) {
      warnings.push('Negative Kelly percentage - expected value is negative, do not trade');
      return { kellyPercentage: 0, recommendedSize: 0, riskLevel: 'HIGH', confidence: Math.min(1, winRate * 1.2), warnings };
    }

    let safeKelly = kelly * kellyFraction;
    
    // Cap at 20% (Max single position limit)
    if (safeKelly > 0.20) {
      safeKelly = 0.20;
    }

    const recommendedSize = portfolioValue * safeKelly;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (safeKelly > 0.15) riskLevel = 'HIGH';
    else if (safeKelly > 0.08) riskLevel = 'MEDIUM';

    if (riskLevel === 'HIGH') warnings.push('High risk position size - proceed with caution');
    if (safeKelly > 0.25) warnings.push('Extremely high risk position size recommended');
    if (safeKelly < 0.01 && safeKelly > 0) warnings.push('Very small position size - signal may not be strong enough');
    if (winRate < 0.45) warnings.push('Low win rate - exercise caution');
    if (b < 1.4) warnings.push('Low win/loss ratio - risk/reward may not be optimal');

    return {
      kellyPercentage: safeKelly,
      recommendedSize,
      riskLevel,
      confidence: Math.min(1, winRate * 1.2),
      warnings,
    };
  }

  /**
   * Adjust position size for volatility (ATR)
   */
  adjustForVolatility(baseSize: number, atr: number, targetVolatility: number = 0.02): { adjustedSize: number; adjustment: VolatilityAdjustment } {
    const actualVolatility = atr; 
    let adjustmentFactor = targetVolatility / actualVolatility;
    
    // Clamp between 0.5 and 2.0
    adjustmentFactor = Math.max(0.5, Math.min(2.0, adjustmentFactor));
    
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