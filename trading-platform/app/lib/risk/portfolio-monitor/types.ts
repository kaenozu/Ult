export interface VaRResult {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  method: 'historical' | 'parametric' | 'montecarlo';
  timeHorizon: number;
}

export interface SectorExposure {
  sector: string;
  totalValue: number;
  percentOfPortfolio: number;
  positionCount: number;
  positions: {
    symbol: string;
    value: number;
    percent: number;
  }[];
}

export interface CorrelationPair {
  symbol1: string;
  symbol2: string;
  correlation: number;
  pValue: number;
}

export interface StressTestScenario {
  name: string;
  description: string;
  marketShock: number;
  volatilityMultiplier: number;
  correlationIncrease: number;
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioImpact: number;
  portfolioImpactPercent: number;
  varImpact: number;
  worstCaseLoss: number;
  positionImpacts: {
    symbol: string;
    impact: number;
    impactPercent: number;
  }[];
}

export interface RiskContribution {
  symbol: string;
  marginalVaR: number;
  componentVaR: number;
  percentOfPortfolioVaR: number;
}

export interface PortfolioRiskReport {
  dailyVar: VaRResult;
  weeklyVar: VaRResult;
  sectorExposures: SectorExposure[];
  concentrationRisk: number;
  correlationPairs: CorrelationPair[];
  avgCorrelation: number;
  maxCorrelation: number;
  riskContributions: RiskContribution[];
  stressTestResults: StressTestResult[];
  portfolioBeta: number;
  systemicRisk: number;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  warnings: string[];
  recommendations: string[];
}

export interface VaRParams {
  confidence: number;
  timeHorizon: number;
}

export interface RiskScoreParams {
  dailyVar: VaRResult;
  concentrationRisk: number;
  avgCorrelation: number;
  systemicRisk: number;
  stressTestResults: StressTestResult[];
}

export interface WarningsParams {
  dailyVar: VaRResult;
  sectorExposures: SectorExposure[];
  correlationPairs: CorrelationPair[];
  stressTestResults: StressTestResult[];
  overallRiskScore: number;
}
