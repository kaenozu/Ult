import type { Signal } from '@/app/types/signal';
import type { BeginnerSignal, BeginnerAction, RiskLevel, BeginnerModeConfig } from '@/app/types/beginner-signal';
import type { RiskManagementSettings } from '@/app/store/riskManagementStore';
import { generateSignalReason } from './signal-reason-generator';
import { DEFAULT_BEGINNER_CONFIG } from '@/app/types/beginner-signal';

export function filterForBeginner(
  signal: Signal,
  currentPrice: number,
  config: BeginnerModeConfig = DEFAULT_BEGINNER_CONFIG,
  riskSettings?: RiskManagementSettings
): BeginnerSignal {
  const { confidenceThreshold, minIndicatorAgreement } = config;
  
  const meetsConfidence = signal.confidence >= confidenceThreshold;
  const isActionable = signal.type !== 'HOLD';
  
  // CORE: Advanced Risk & Quality Filter
  const highDrift = signal.driftRisk === 'HIGH';
  const lowEV = signal.expectedValue !== undefined && signal.expectedValue < 0.5;
  const indicatorsMatch = (signal.indicatorCount ?? 0) >= minIndicatorAgreement;

  if (meetsConfidence && isActionable && !highDrift && !lowEV && indicatorsMatch) {
    return createActionSignal(signal, currentPrice, config, riskSettings);
  }
  
  // Determine specialized wait reasons for beginner clarity
  let waitReason = '市場の方向性が不明確なため、様子見を推奨します。';
  if (highDrift) {
    waitReason = 'AIの予測精度に一時的な乱れを検知しました。安全のため取引を控えてください。';
  } else if (lowEV) {
    waitReason = '期待される利益（期待値）が低いため、今は見送りましょう。';
  } else if (!meetsConfidence) {
    waitReason = 'AIの予測自信度が低いため、次のチャンスを待ちます。';
  } else if (!indicatorsMatch) {
    waitReason = '複数の分析指標が一致していません。確実な時だけ取引しましょう。';
  }
  
  return createWaitSignal(signal, waitReason);
}

/**
 * Calculate recommended position sizing based on risk settings and stop loss distance
 */
function calculatePositionSizing(
  currentPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  riskSettings: RiskManagementSettings
) {
  const riskAmount = riskSettings.accountEquity * (riskSettings.riskPerTrade / 100);
  const stopLossDistance = Math.abs(currentPrice - stopLossPrice);
  
  if (stopLossDistance <= 0) return null;

  let shares = Math.floor(riskAmount / stopLossDistance);
  
  // Apply minimum share constraint
  if (shares < riskSettings.minShares) {
    shares = riskSettings.minShares;
  }
  
  // Apply maximum position percent constraint
  const maxShares = Math.floor((riskSettings.accountEquity * (riskSettings.maxPositionPercent / 100)) / currentPrice);
  if (shares > maxShares) {
    shares = maxShares;
  }

  return {
    recommendedShares: shares,
    expectedProfitAmount: Math.round(shares * Math.abs(takeProfitPrice - currentPrice)),
    expectedLossAmount: Math.round(shares * Math.abs(currentPrice - stopLossPrice))
  };
}

function createActionSignal(
  signal: Signal,
  currentPrice: number,
  config: BeginnerModeConfig,
  riskSettings?: RiskManagementSettings
): BeginnerSignal {
  const isBuy = signal.type === 'BUY';
  const { defaultStopLossPercent, defaultTakeProfitPercent } = config;
  
  let stopLossPrice = signal.stopLoss;
  let takeProfitPrice = signal.targetPrice;

  // Fallback to defaults if price data is invalid or missing
  if (stopLossPrice === currentPrice || !stopLossPrice) {
    stopLossPrice = isBuy
      ? Math.round(currentPrice * (1 - defaultStopLossPercent / 100) * 100) / 100
      : Math.round(currentPrice * (1 + defaultStopLossPercent / 100) * 100) / 100;
    
    takeProfitPrice = isBuy
      ? Math.round(currentPrice * (1 + defaultTakeProfitPercent / 100) * 100) / 100
      : Math.round(currentPrice * (1 - defaultTakeProfitPercent / 100) * 100) / 100;
  }

  // Calculate sizing
  const sizing = riskSettings?.enabled 
    ? calculatePositionSizing(currentPrice, stopLossPrice, takeProfitPrice, riskSettings)
    : null;

  return {
    action: signal.type as BeginnerAction,
    confidence: signal.confidence,
    reason: generateSignalReason(signal),
    riskLevel: assessRiskLevel(signal),
    rawSignal: {
      type: signal.type,
      confidence: signal.confidence,
      symbol: signal.symbol
    },
    autoRisk: {
      stopLossPrice,
      takeProfitPrice,
      stopLossPercent: Math.abs((stopLossPrice - currentPrice) / currentPrice) * 100,
      takeProfitPercent: Math.abs((takeProfitPrice - currentPrice) / currentPrice) * 100,
      ...sizing
    },
    indicatorCount: signal.indicatorCount,
    agreeingIndicators: signal.agreeingIndicators,
    historicalWinRate: signal.accuracy,
    expectedValue: signal.expectedValue
  };
}

function createWaitSignal(
  signal: Signal,
  reason: string
): BeginnerSignal {
  return {
    action: 'WAIT',
    confidence: signal.confidence,
    reason,
    riskLevel: 'medium',
    rawSignal: {
      type: signal.type,
      confidence: signal.confidence,
      symbol: signal.symbol
    }
  };
}

export function assessRiskLevel(signal: Signal): RiskLevel {
  if (signal.confidence >= 90) return 'low';
  if (signal.confidence >= 80) return 'medium';
  return 'high';
}
