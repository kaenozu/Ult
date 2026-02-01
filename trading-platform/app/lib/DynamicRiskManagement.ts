/**
 * Dynamic Risk Management Configuration
 */
export interface DynamicRiskConfig {
  enableTrailingStop: boolean;
  trailingStopATRMultiple: number;
  trailingStopMinPercent: number;
  enableVolatilityAdjustment: boolean;
  volatilityMultiplier: number;
  enableDynamicPositionSizing: boolean;
  maxRiskPerTrade: number;
  minRiskRewardRatio: number;
}

/**
 * Default risk configuration
 */
export const defaultRiskConfig: DynamicRiskConfig = {
  enableTrailingStop: true,
  trailingStopATRMultiple: 2.0,
  trailingStopMinPercent: 1.0,
  enableVolatilityAdjustment: true,
  volatilityMultiplier: 1.5,
  enableDynamicPositionSizing: true,
  maxRiskPerTrade: 2.0,
  minRiskRewardRatio: 2.0,
};
