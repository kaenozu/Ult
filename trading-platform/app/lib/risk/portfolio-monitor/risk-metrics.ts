import { Portfolio } from '@/app/types';
import {
  VaRResult,
  SectorExposure,
  CorrelationPair,
  StressTestScenario,
  StressTestResult,
  RiskContribution,
} from './types';
import {
  SECTOR_MAP,
  STRESS_TEST_SCENARIOS,
  DEFAULT_VOLATILITY,
} from './thresholds';
import { calculateCorrelation, calculatePValue } from './calculations';

export function calculateSectorExposure(portfolio: Portfolio, sectorMap: Map<string, string>): SectorExposure[] {
  const sectorData = new Map<string, SectorExposure>();
  const totalValue = portfolio.totalValue + portfolio.cash;

  for (const position of portfolio.positions) {
    const sector = sectorMap.get(position.symbol) || 'Other';

    if (!sectorData.has(sector)) {
      sectorData.set(sector, {
        sector,
        totalValue: 0,
        percentOfPortfolio: 0,
        positionCount: 0,
        positions: [],
      });
    }

    const exposure = sectorData.get(sector)!;
    const positionValue = position.currentPrice * position.quantity;

    exposure.totalValue += positionValue;
    exposure.positionCount++;
    exposure.positions.push({
      symbol: position.symbol,
      value: positionValue,
      percent: (positionValue / totalValue) * 100,
    });
  }

  if (portfolio.cash > 0) {
    sectorData.set('Cash', {
      sector: 'Cash',
      totalValue: portfolio.cash,
      percentOfPortfolio: (portfolio.cash / totalValue) * 100,
      positionCount: 0,
      positions: [],
    });
  }

  const exposures = Array.from(sectorData.values());
  for (const exposure of exposures) {
    exposure.percentOfPortfolio = (exposure.totalValue / totalValue) * 100;
  }

  return exposures.sort((a, b) => b.totalValue - a.totalValue);
}

export function calculateConcentrationRisk(sectorExposures: SectorExposure[]): number {
  if (sectorExposures.length === 0) return 0;

  let hhi = 0;
  for (const exposure of sectorExposures) {
    const weight = exposure.percentOfPortfolio / 100;
    hhi += weight * weight;
  }

  const n = sectorExposures.length;
  const minHHI = 1 / n;

  return n > 1 ? (hhi - minHHI) / (1 - minHHI) : 1;
}

export function calculateCorrelationPairs(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>
): CorrelationPair[] {
  const pairs: CorrelationPair[] = [];
  const positions = portfolio.positions;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const symbol1 = positions[i].symbol;
      const symbol2 = positions[j].symbol;

      const returns1 = returnsHistory.get(symbol1) || [];
      const returns2 = returnsHistory.get(symbol2) || [];

      if (returns1.length > 20 && returns2.length > 20) {
        const correlation = calculateCorrelation(returns1, returns2);
        const pValue = calculatePValue(correlation, returns1.length);

        pairs.push({ symbol1, symbol2, correlation, pValue });
      }
    }
  }

  return pairs;
}

export function calculateAverageCorrelation(pairs: CorrelationPair[]): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((total, pair) => total + Math.abs(pair.correlation), 0);
  return sum / pairs.length;
}

export function calculateMaxCorrelation(pairs: CorrelationPair[]): number {
  if (pairs.length === 0) return 0;
  return Math.max(...pairs.map(pair => Math.abs(pair.correlation)));
}

export function calculateRiskContributions(
  portfolio: Portfolio,
  varResult: VaRResult,
  returnsHistory: Map<string, number[]>
): RiskContribution[] {
  const contributions: RiskContribution[] = [];
  const totalValue = portfolio.totalValue + portfolio.cash;

  for (const position of portfolio.positions) {
    const positionValue = position.currentPrice * position.quantity;
    const positionWeight = positionValue / totalValue;

    const returns = returnsHistory.get(position.symbol) || [];
    const volatility = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
      : DEFAULT_VOLATILITY;

    const marginalVaR = varResult.var95 * positionWeight * volatility / DEFAULT_VOLATILITY;
    const componentVaR = marginalVaR * positionWeight;

    contributions.push({
      symbol: position.symbol,
      marginalVaR,
      componentVaR,
      percentOfPortfolioVaR: varResult.var95 > 0 ? (componentVaR / varResult.var95) * 100 : 0,
    });
  }

  return contributions;
}

export function applyStressTest(
  portfolio: Portfolio,
  scenario: StressTestScenario,
  returnsHistory: Map<string, number[]>
): StressTestResult {
  const totalValue = portfolio.totalValue + portfolio.cash;
  const positionImpacts: StressTestResult['positionImpacts'] = [];
  let totalImpact = 0;

  for (const position of portfolio.positions) {
    const positionValue = position.currentPrice * position.quantity;

    const returns = returnsHistory.get(position.symbol) || [];
    const volatility = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
      : DEFAULT_VOLATILITY;

    const adjustedVolatility = volatility * scenario.volatilityMultiplier;
    const impact = positionValue * (scenario.marketShock / 100 + adjustedVolatility);

    totalImpact += impact;

    positionImpacts.push({
      symbol: position.symbol,
      impact,
      impactPercent: (impact / positionValue) * 100,
    });
  }

  return {
    scenario,
    portfolioImpact: totalImpact,
    portfolioImpactPercent: (totalImpact / totalValue) * 100,
    varImpact: Math.abs(totalImpact) * 1.645,
    worstCaseLoss: Math.abs(totalImpact),
    positionImpacts,
  };
}

export function runStressTests(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>
): StressTestResult[] {
  return STRESS_TEST_SCENARIOS.map(scenario => applyStressTest(portfolio, scenario, returnsHistory));
}

export function calculatePortfolioBeta(
  portfolio: Portfolio,
  returnsHistory: Map<string, number[]>
): number {
  const totalValue = portfolio.totalValue + portfolio.cash;
  let portfolioBeta = 0;

  for (const position of portfolio.positions) {
    const positionWeight = (position.currentPrice * position.quantity) / totalValue;

    const returns = returnsHistory.get(position.symbol) || [];
    const volatility = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length)
      : DEFAULT_VOLATILITY;

    const beta = Math.min(2, Math.max(0.5, volatility / 0.015));
    portfolioBeta += positionWeight * beta;
  }

  return portfolioBeta;
}

export function calculateSystemicRisk(correlationPairs: CorrelationPair[]): number {
  if (correlationPairs.length === 0) return 0;
  const avgCorrelation = calculateAverageCorrelation(correlationPairs);
  return Math.min(1, avgCorrelation);
}

export function calculateOverallRiskScore(params: {
  dailyVar: VaRResult;
  concentrationRisk: number;
  avgCorrelation: number;
  systemicRisk: number;
  stressTestResults: StressTestResult[];
}): number {
  let score = 0;

  const varPercent = (params.dailyVar.var95 / (params.dailyVar.var95 + 10000)) * 40;
  score += varPercent;

  score += params.concentrationRisk * 20;
  score += params.avgCorrelation * 20;

  const worstStressTest = Math.max(...params.stressTestResults.map(r => Math.abs(r.portfolioImpactPercent)));
  const stressScore = Math.min(20, worstStressTest / 2);
  score += stressScore;

  return Math.min(100, score);
}

export function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'extreme';
}

export function generateWarningsAndRecommendations(params: {
  dailyVar: VaRResult;
  sectorExposures: SectorExposure[];
  correlationPairs: CorrelationPair[];
  stressTestResults: StressTestResult[];
  overallRiskScore: number;
}): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (params.dailyVar.var95 > params.dailyVar.cvar95 * 0.8) {
    warnings.push('VaRがCVaRに近接 - テールリスクが高い可能性');
  }

  const maxSectorExposure = Math.max(...params.sectorExposures.map(s => s.percentOfPortfolio));
  if (maxSectorExposure > 30) {
    warnings.push(`セクター集中度が高い (${maxSectorExposure.toFixed(1)}%)`);
    recommendations.push('セクターの分散を検討してください');
  }

  const highCorrelations = params.correlationPairs.filter(p => Math.abs(p.correlation) > 0.8);
  if (highCorrelations.length > 0) {
    warnings.push(`高相関ペアが${highCorrelations.length}組存在`);
    recommendations.push('逆相関または低相関の資産を追加してください');
  }

  const severeScenarios = params.stressTestResults.filter(r => r.portfolioImpactPercent < -20);
  if (severeScenarios.length > 0) {
    warnings.push('深刻な市場ストレスシナリオで大きな損失の可能性');
    recommendations.push('ヘッジ戦略の導入を検討してください');
  }

  if (params.overallRiskScore > 70) {
    warnings.push('総合リスクスコアが高い');
    recommendations.push('ポジションサイズの縮小を検討してください');
  }

  return { warnings, recommendations };
}

export function createSectorMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [symbol, sector] of Object.entries(SECTOR_MAP)) {
    map.set(symbol, sector);
  }
  return map;
}
