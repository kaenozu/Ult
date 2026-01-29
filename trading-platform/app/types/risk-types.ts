
// ============================================================================
// Risk Management Types
// ============================================================================

export type PositionSizingMethod = 'fixed_ratio' | 'kelly_criterion' | 'fixed_amount' | 'volatility_based';

export type StopLossType = 'percentage' | 'price' | 'atr' | 'trailing';

export interface RiskManagementSettings {
  sizingMethod: PositionSizingMethod;
  fixedRatio?: number; // 資本に対するリスク許容率 (例: 0.02 = 2%)
  maxPositionPercent?: number; // 1ポジションあたりの最大資本比率
  kellyFraction?: number; // ケリー基準の適用割合 (例: 0.5 = ハーフケリー)

  stopLoss: {
    enabled: boolean;
    type: StopLossType;
    value: number; // %, price, or ATR multiplier
    trailing: boolean;
  };

  takeProfit: {
    enabled: boolean;
    type: 'percentage' | 'price' | 'risk_reward_ratio';
    value: number;
    partials: boolean; // 分割決済
  };

  maxLossPercent?: number; // 口座全体の最大ドローダウン許容率
  maxLossPerTrade?: number; // 1トレードあたりの最大損失額
  dailyLossLimit?: number; // 1日の最大損失率

  useATR?: boolean;
  atrPeriod?: number;
  atrMultiplier?: number;

  maxPositions?: number; // 同時保有最大ポジション数
  maxCorrelation?: number; // 許容する最大相関係数
}

export interface RiskCalculationResult {
  positionSize: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskAmount: number;
  riskPercent: number;
  positionRiskPercent: number;
  maxPositionSize: number;
}
