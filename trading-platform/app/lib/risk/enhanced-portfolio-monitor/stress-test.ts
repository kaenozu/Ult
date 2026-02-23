import { RiskAlert, RiskLimits, CorrelationBreakdownResult, SectorMapping } from './types';

export function detectCorrelationBreakdown(
  correlationMatrix: Map<string, Map<string, number>>,
  sectorMapping: SectorMapping
): CorrelationBreakdownResult | null {
  const symbols = Array.from(correlationMatrix.keys());

  if (symbols.length < 2) return null;

  let breakdownCount = 0;
  let perfectCorrelationCount = 0;
  let inverseCorrelationCount = 0;

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      const correlation = correlationMatrix.get(symbol1)?.get(symbol2) || 0;

      if (correlation > 0.95) {
        perfectCorrelationCount++;
      }

      const sector1 = sectorMapping[symbol1];
      const sector2 = sectorMapping[symbol2];

      if (sector1 && sector2 && sector1 === sector2 && correlation < -0.3) {
        inverseCorrelationCount++;
        breakdownCount++;
      }

      if (Math.abs(correlation) > 0.9 || (sector1 === sector2 && correlation < 0)) {
        breakdownCount++;
      }
    }
  }

  let severity = 0;
  let recommendation = '';

  if (perfectCorrelationCount > 0) {
    severity = Math.min(100, 30 + perfectCorrelationCount * 20);
    recommendation = `市場ストレス検出: ${perfectCorrelationCount}組の銘柄が完全相関しています。リスク分散が効いていない可能性があります。`;
  } else if (breakdownCount > 0) {
    severity = Math.min(100, 20 + breakdownCount * 15);
    recommendation = `相関ブレークダウン検出: ${breakdownCount}組の銘柄で異常な相関パターンが見られます。ポジションを見直してください。`;
  } else if (inverseCorrelationCount > 0) {
    severity = 20;
    recommendation = `逆相関検出: 同じセクターの銘柄間で逆相関が見られます。異常な市場動向の可能性があります。`;
  }

  return severity > 0 ? { severity, recommendation } : null;
}

export function generateSectorConcentrationAlerts(
  sectorExposures: Array<{ sector: string; exposure: number; risk: 'low' | 'medium' | 'high' }>,
  maxSectorExposure: number
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  for (const sector of sectorExposures) {
    if (sector.exposure > maxSectorExposure) {
      alerts.push({
        type: 'sector_concentration',
        severity: sector.risk === 'high' ? 'critical' : 'warning',
        message: `${sector.sector}セクターの暴露が制限を超えています`,
        metric: 'sector_exposure',
        currentValue: sector.exposure,
        threshold: maxSectorExposure,
        recommendation: `${sector.sector}セクターのポジションを削減してください。現在の暴露: ${sector.exposure.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
  }

  return alerts;
}

export function generateVaRAlert(
  var95: number,
  maxVaR95: number
): RiskAlert | null {
  if (var95 > maxVaR95) {
    return {
      type: 'var_breach',
      severity: 'critical',
      message: 'VaR (95%)が制限を超えています',
      metric: 'var95',
      currentValue: var95,
      threshold: maxVaR95,
      recommendation: 'ポジションサイズを削減するか、ヘッジを検討してください',
      timestamp: new Date()
    };
  }
  return null;
}

export function generateBetaAlert(
  beta: number,
  maxBeta: number
): RiskAlert | null {
  if (Math.abs(beta) > maxBeta) {
    return {
      type: 'beta_drift',
      severity: 'warning',
      message: 'ポートフォリオベータが目標範囲を外れています',
      metric: 'beta',
      currentValue: beta,
      threshold: maxBeta,
      recommendation: 'ベータを調整するために低ベータ資産を追加してください',
      timestamp: new Date()
    };
  }
  return null;
}

export function generateLiquidityAlert(
  liquidity: number,
  minLiquidity: number
): RiskAlert | null {
  if (liquidity < minLiquidity) {
    return {
      type: 'liquidity',
      severity: 'warning',
      message: 'ポートフォリオの流動性が低下しています',
      metric: 'liquidity',
      currentValue: liquidity,
      threshold: minLiquidity,
      recommendation: '流動性の高い銘柄への配分を増やしてください',
      timestamp: new Date()
    };
  }
  return null;
}

export function generateAllRiskAlerts(
  metrics: {
    sectorExposures: Array<{ sector: string; exposure: number; risk: 'low' | 'medium' | 'high' }>;
    realTimeVaR: { var95: number };
    enhancedBeta: { market: number };
    liquidity: number;
    correlationMatrix: Map<string, Map<string, number>>;
  },
  limits: RiskLimits,
  sectorMapping: SectorMapping
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  if (limits.maxSectorExposure) {
    alerts.push(...generateSectorConcentrationAlerts(
      metrics.sectorExposures,
      limits.maxSectorExposure
    ));
  }

  if (limits.maxVaR95) {
    const varAlert = generateVaRAlert(metrics.realTimeVaR.var95, limits.maxVaR95);
    if (varAlert) alerts.push(varAlert);
  }

  if (limits.maxBeta) {
    const betaAlert = generateBetaAlert(metrics.enhancedBeta.market, limits.maxBeta);
    if (betaAlert) alerts.push(betaAlert);
  }

  if (limits.minLiquidity) {
    const liquidityAlert = generateLiquidityAlert(metrics.liquidity, limits.minLiquidity);
    if (liquidityAlert) alerts.push(liquidityAlert);
  }

  const correlationIssue = detectCorrelationBreakdown(metrics.correlationMatrix, sectorMapping);
  if (correlationIssue) {
    alerts.push({
      type: 'correlation_breakdown',
      severity: 'critical',
      message: '相関構造に異常が検出されました',
      metric: 'correlation',
      currentValue: correlationIssue.severity,
      threshold: 0.5,
      recommendation: correlationIssue.recommendation,
      timestamp: new Date()
    });
  }

  return alerts;
}
