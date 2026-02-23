import { RiskMetrics } from '@/app/types/risk';

export interface SectorExposure {
  sector: string;
  exposure: number;
  positions: string[];
  concentration: number;
  risk: 'low' | 'medium' | 'high';
}

export interface EnhancedRiskMetrics extends RiskMetrics {
  sectorExposures: SectorExposure[];
  marketExposures: Map<string, number>;
  liquidity: number;
  correlationMatrix: Map<string, Map<string, number>>;
  concentration: {
    herfindahlIndex: number;
    effectivePositions: number;
    top3Concentration: number;
  };
  realTimeVaR: {
    var95: number;
    var99: number;
    lastUpdate: Date;
    confidence: number;
  };
  enhancedBeta: {
    market: number;
    sector: number;
    style: number;
  };
}

export interface RiskAlert {
  type: 'sector_concentration' | 'var_breach' | 'beta_drift' | 'liquidity' | 'correlation_breakdown';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

export interface SectorMapping {
  [symbol: string]: string;
}

export interface VaRResult {
  var95: number;
  var99: number;
  lastUpdate: Date;
  confidence: number;
}

export interface EnhancedBetaResult {
  market: number;
  sector: number;
  style: number;
}

export interface ConcentrationMetrics {
  herfindahlIndex: number;
  effectivePositions: number;
  top3Concentration: number;
}

export interface RiskLimits {
  maxSectorExposure?: number;
  maxVaR95?: number;
  maxBeta?: number;
  minLiquidity?: number;
}

export interface CorrelationBreakdownResult {
  severity: number;
  recommendation: string;
}

export const DEFAULT_SECTOR_MAPPING: SectorMapping = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'AMZN': 'Consumer Cyclical',
  'TSLA': 'Consumer Cyclical',
  'JPM': 'Financial',
  'BAC': 'Financial',
  'JNJ': 'Healthcare',
  'PFE': 'Healthcare',
  'XOM': 'Energy',
  'CVX': 'Energy',
};
