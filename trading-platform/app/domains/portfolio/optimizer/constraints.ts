import { AssetData, OptimizationConstraints } from './types';

export class ConstraintHandler {
  applyConstraints(
    weights: Map<string, number>,
    assets: AssetData[],
    constraints: OptimizationConstraints
  ): Map<string, number> {
    const result = new Map<string, number>();

    for (const asset of assets) {
      const currentWeight = weights.get(asset.symbol) || 0;
      const newWeight = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, currentWeight));
      result.set(asset.symbol, newWeight);
      totalWeight += newWeight;
    }

    if (constraints.sectorLimits && constraints.sectorLimits.size > 0) {
      this.applySectorLimits(result, assets, constraints);
    }

    let newTotal = 0;
    result.forEach(w => newTotal += w);

    if (newTotal > 0) {
      result.forEach((w, s) => result.set(s, w / newTotal));
    } else {
      const equalWeight = 1 / assets.length;
      assets.forEach(a => result.set(a.symbol, equalWeight));
    }

    return result;
  }

  private applySectorLimits(
    weights: Map<string, number>,
    assets: AssetData[],
    constraints: OptimizationConstraints
  ): void {
    const sectorWeights = this.aggregateBySector(assets, weights);

    sectorWeights.forEach((weight, sector) => {
      const limit = constraints.sectorLimits!.get(sector);
      if (limit && weight > limit) {
        const excessRatio = limit / weight;
        assets.filter(a => a.sector === sector).forEach(asset => {
          const currentW = weights.get(asset.symbol) || 0;
          weights.set(asset.symbol, currentW * excessRatio);
        });
      }
    });
  }

  aggregateBySector(assets: AssetData[], weights: Map<string, number>): Map<string, number> {
    const sectorWeights = new Map<string, number>();

    for (const asset of assets) {
      const sector = asset.sector || 'Unknown';
      const weight = weights.get(asset.symbol) || 0;
      sectorWeights.set(sector, (sectorWeights.get(sector) || 0) + weight);
    }

    return sectorWeights;
  }

  determineOptimizationType(constraints: OptimizationConstraints): 'MAX_SHARPE' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'TARGET_RETURN' {
    if (constraints.targetReturn !== undefined) {
      return 'TARGET_RETURN';
    }
    if (constraints.maxRisk !== undefined) {
      return 'TARGET_RETURN';
    }
    return 'MAX_SHARPE';
  }
}
