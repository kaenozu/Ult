import { Portfolio } from '@/app/types';
import { SectorExposure, ConcentrationMetrics } from './types';

export type SectorMapping = { [symbol: string]: string };

export function calculateSectorExposures(
  portfolio: Portfolio,
  sectorMapping: SectorMapping
): SectorExposure[] {
  const totalValue = portfolio.totalValue;
  const sectorData = new Map<string, { value: number; positions: string[] }>();

  for (const position of portfolio.positions) {
    const sector = sectorMapping[position.symbol] || 'Unknown';
    const value = position.currentPrice * position.quantity;

    if (!sectorData.has(sector)) {
      sectorData.set(sector, { value: 0, positions: [] });
    }

    const data = sectorData.get(sector)!;
    data.value += value;
    data.positions.push(position.symbol);
  }

  const exposures: SectorExposure[] = [];

  for (const [sector, data] of sectorData.entries()) {
    const exposure = (data.value / totalValue) * 100;
    const concentration = calculateSectorHHI(portfolio, data.positions);

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (exposure > 40) risk = 'high';
    else if (exposure > 25) risk = 'medium';

    exposures.push({ sector, exposure, positions: data.positions, concentration, risk });
  }

  return exposures.sort((a, b) => b.exposure - a.exposure);
}

export function calculateSectorHHI(portfolio: Portfolio, symbols: string[]): number {
  const sectorValue = symbols.reduce((sum, symbol) => {
    const position = portfolio.positions.find(p => p.symbol === symbol);
    return sum + (position ? position.currentPrice * position.quantity : 0);
  }, 0);

  if (sectorValue === 0) return 0;

  let hhi = 0;
  for (const symbol of symbols) {
    const position = portfolio.positions.find(p => p.symbol === symbol);
    if (position) {
      const value = position.currentPrice * position.quantity;
      const weight = value / sectorValue;
      hhi += weight * weight;
    }
  }

  return hhi;
}

export function calculateConcentrationMetrics(portfolio: Portfolio): ConcentrationMetrics {
  const totalValue = portfolio.totalValue;

  if (totalValue === 0 || portfolio.positions.length === 0) {
    return { herfindahlIndex: 0, effectivePositions: 0, top3Concentration: 0 };
  }

  let hhi = 0;
  const weights: number[] = [];

  for (const position of portfolio.positions) {
    const value = position.currentPrice * position.quantity;
    const weight = value / totalValue;
    weights.push(weight);
    hhi += weight * weight;
  }

  const effectivePositions = hhi > 0 ? 1 / hhi : 0;
  const sortedWeights = [...weights].sort((a, b) => b - a);
  const top3Concentration = sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0) * 100;

  return { herfindahlIndex: hhi, effectivePositions, top3Concentration };
}

export function calculateMarketExposures(portfolio: Portfolio): Map<string, number> {
  const totalValue = portfolio.totalValue;
  const exposures = new Map<string, number>();

  for (const position of portfolio.positions) {
    const market = position.market || 'US';
    const value = position.currentPrice * position.quantity;
    const currentExposure = exposures.get(market) || 0;
    exposures.set(market, currentExposure + (value / totalValue) * 100);
  }

  return exposures;
}

export function calculateLiquidityScore(portfolio: Portfolio): number {
  if (portfolio.positions.length === 0) return 100;

  let totalScore = 0;
  let totalWeight = 0;

  for (const position of portfolio.positions) {
    const weight = (position.currentPrice * position.quantity) / portfolio.totalValue;
    totalScore += 80 * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 80;
}

export function calculateStyleExposure(portfolio: Portfolio, sectorMapping: SectorMapping): number {
  let growthWeight = 0;
  let valueWeight = 0;
  const totalValue = portfolio.totalValue;

  for (const position of portfolio.positions) {
    const sector = sectorMapping[position.symbol] || 'Unknown';
    const weight = (position.currentPrice * position.quantity) / totalValue;

    if (sector === 'Technology') growthWeight += weight;
    else valueWeight += weight;
  }

  return growthWeight - valueWeight;
}
