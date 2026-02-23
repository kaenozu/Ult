import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '../../TechnicalIndicatorService';
import { WinRateOptimization, TradeScenario, OptimizationConfig, DEFAULT_OPTIMIZATION_CONFIG } from './types';

export class WinRateMaximizerCore {
  protected config: OptimizationConfig;
  protected scenarios: TradeScenario[] = [];

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }

  learnFromHistory(scenarios: TradeScenario[]): void {
    this.scenarios = scenarios;
  }

  protected calculateTrendStrength(closes: number[]): number {
    if (closes.length < 20) return 0;
    const recent = closes.slice(-20);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = ((last - first) / first) * 100;
    let sumSquaredDiff = 0;
    for (let i = 1; i < recent.length; i++) { const diff = recent[i] - recent[i - 1]; sumSquaredDiff += diff * diff; }
    const volatility = Math.sqrt(sumSquaredDiff / (recent.length - 1));
    const strength = Math.abs(change) / (volatility / first * 100);
    return Math.min(100, strength * 10);
  }

  protected analyzeCurrentConditions(data: OHLCV[]): TradeScenario['marketConditions'] & TradeScenario['indicators'] {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const rsi = technicalIndicatorService.calculateRSI(closes, 14);
    const macd = technicalIndicatorService.calculateMACD(closes);
    const trendStrength = this.calculateTrendStrength(closes);
    const bb = technicalIndicatorService.calculateBollingerBands(closes, 20, 2);
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const sma50 = technicalIndicatorService.calculateSMA(closes, 50);

    const currentPrice = closes[closes.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    const trend = sma20 > sma50 ? 'UP' : sma20 < sma50 ? 'DOWN' : 'SIDEWAYS';
    const priceRange = Math.max(...closes) - Math.min(...closes);
    const volatility = priceRange / currentPrice > 0.05 ? 'HIGH' : priceRange / currentPrice > 0.02 ? 'MEDIUM' : 'LOW';
    const volume = currentVolume > avgVolume * 1.5 ? 'HIGH' : currentVolume > avgVolume * 0.8 ? 'MEDIUM' : 'LOW';
    const momentum = ((currentPrice - closes[Math.max(0, closes.length - 20)]) / closes[Math.max(0, closes.length - 20)]) * 100;

    const bbUpper = bb.upper[bb.upper.length - 1];
    const bbLower = bb.lower[bb.lower.length - 1];
    const bbPosition = (currentPrice - bbLower) / (bbUpper - bbLower) * 2 - 1;
    const smaAlignment = sma20 > sma50;

    return {
      trend, volatility, volume, momentum,
      rsi: rsi[rsi.length - 1] || 50,
      macd: macd.histogram[macd.histogram.length - 1] || 0,
      adx: trendStrength, bbPosition, smaAlignment,
    };
  }

  protected findSimilarScenarios(currentConditions: ReturnType<typeof this.analyzeCurrentConditions>): TradeScenario[] {
    if (this.scenarios.length < this.config.minScenariosRequired) return [];

    return this.scenarios.filter(scenario => {
      let similarity = 0, totalWeight = 0;
      if (scenario.marketConditions.trend === currentConditions.trend) similarity += 0.3;
      totalWeight += 0.3;

      const rsiDiff = Math.abs(scenario.indicators.rsi - currentConditions.rsi);
      similarity += (1 - rsiDiff / 100) * 0.2;
      totalWeight += 0.2;

      const macdDiff = Math.abs(scenario.indicators.macd - currentConditions.macd);
      similarity += Math.max(0, 1 - macdDiff / 10) * 0.15;
      totalWeight += 0.15;

      const adxDiff = Math.abs(scenario.indicators.adx - currentConditions.adx);
      similarity += (1 - adxDiff / 100) * 0.15;
      totalWeight += 0.15;

      if (scenario.marketConditions.volatility === currentConditions.volatility) similarity += 0.1;
      totalWeight += 0.1;

      if (scenario.marketConditions.volume === currentConditions.volume) similarity += 0.1;
      totalWeight += 0.1;

      return (similarity / totalWeight) >= this.config.scenarioSimilarityThreshold;
    });
  }

  protected calculateWinRate(scenarios: TradeScenario[]): number {
    if (scenarios.length === 0) return 50;
    const wins = scenarios.filter(s => s.outcome.won).length;
    return (wins / scenarios.length) * 100;
  }

  protected determineAction(winRate: number, conditions: ReturnType<typeof this.analyzeCurrentConditions>, scenarios: TradeScenario[]): 'BUY' | 'SELL' | 'HOLD' | 'WAIT' {
    if (scenarios.length < this.config.minScenariosRequired) return 'WAIT';
    if (winRate < this.config.minWinRateForTrade) return 'HOLD';
    if (conditions.trend === 'UP' && conditions.rsi < 70 && conditions.smaAlignment) return 'BUY';
    if (conditions.trend === 'DOWN' && conditions.rsi > 30) return 'SELL';

    const buyCount = scenarios.filter(s => s.outcome.action === 'BUY').length;
    const sellCount = scenarios.filter(s => s.outcome.action === 'SELL').length;
    if (buyCount > sellCount && winRate >= this.config.minWinRateForTrade) return 'BUY';
    else if (sellCount > buyCount && winRate >= this.config.minWinRateForTrade) return 'SELL';
    return 'HOLD';
  }

  protected calculateOptimalEntry(data: OHLCV[], scenarios: TradeScenario[]): WinRateOptimization['optimalEntry'] {
    const currentPrice = data[data.length - 1].close;
    if (scenarios.length === 0) return { price: currentPrice, timing: 'IMMEDIATE' };

    const successfulScenarios = scenarios.filter(s => s.outcome.won);
    if (successfulScenarios.length === 0) return { price: currentPrice, timing: 'WAIT_FOR_PULLBACK', waitCondition: '勝率の高いシナリオが出現するまで待機' };

    const avgEntryRSI = successfulScenarios.reduce((sum, s) => sum + s.indicators.rsi, 0) / successfulScenarios.length;
    const closes = data.map(d => d.close);
    const currentRSIArray = technicalIndicatorService.calculateRSI(closes, 14);
    const currentRSI = currentRSIArray[currentRSIArray.length - 1] || 50;
    const rsiDiff = Math.abs(currentRSI - avgEntryRSI);

    if (rsiDiff < 5) return { price: currentPrice, timing: 'IMMEDIATE' };
    else if (currentRSI < avgEntryRSI) return { price: currentPrice * 0.98, timing: 'WAIT_FOR_PULLBACK', waitCondition: `RSIが${avgEntryRSI.toFixed(1)}付近になるまで待機`, expectedDelay: 15 };
    else return { price: currentPrice * 1.02, timing: 'WAIT_FOR_BREAKOUT', waitCondition: `ブレイクアウトを待機`, expectedDelay: 30 };
  }

  protected calculateOptimalExit(data: OHLCV[], scenarios: TradeScenario[]): WinRateOptimization['optimalExit'] {
    const currentPrice = data[data.length - 1].close;
    if (scenarios.length === 0) return { takeProfit: currentPrice * (1 + this.config.defaultTakeProfitPercent / 100), stopLoss: currentPrice * (1 - this.config.defaultStopLossPercent / 100), trailingStop: false, targetReached: false };

    const successfulScenarios = scenarios.filter(s => s.outcome.won);
    const avgProfit = successfulScenarios.length > 0 ? successfulScenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / successfulScenarios.length : this.config.defaultTakeProfitPercent;

    const failedScenarios = scenarios.filter(s => !s.outcome.won);
    const avgLoss = failedScenarios.length > 0 ? Math.abs(failedScenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / failedScenarios.length) : this.config.defaultStopLossPercent;

    return { takeProfit: currentPrice * (1 + Math.max(avgProfit, this.config.defaultTakeProfitPercent) / 100), stopLoss: currentPrice * (1 - Math.min(avgLoss, this.config.defaultStopLossPercent * 2) / 100), trailingStop: avgProfit > 5, targetReached: false };
  }

  protected optimizePositionSize(winRate: number, portfolioValue: number): WinRateOptimization['positionSizing'] {
    const W = winRate / 100;
    const R = 2.0;
    const kellyPercent = W - ((1 - W) / R);
    const halfKelly = kellyPercent / 2;
    let recommended = Math.max(this.config.basePositionSize, Math.min(halfKelly * 100, this.config.maxPositionSize));
    if (this.config.confidenceScaling) recommended *= (winRate / 100);
    return { recommended: Math.round(recommended * 10) / 10, min: this.config.basePositionSize, max: this.config.maxPositionSize, rationale: `勝率${winRate.toFixed(1)}%に基づき、ケリー基準（ハーフ）で算出` };
  }

  protected assessRisk(scenarios: TradeScenario[], data: OHLCV[]): WinRateOptimization['risk'] {
    if (scenarios.length === 0) return { level: 'MEDIUM', probabilityOfLoss: 50, expectedLoss: 2, maxDrawdown: 5 };

    const losers = scenarios.filter(s => !s.outcome.won);
    const probabilityOfLoss = (losers.length / scenarios.length) * 100;
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / losers.length) : this.config.defaultStopLossPercent;
    const maxDrawdown = Math.max(...scenarios.map(s => Math.abs(Math.min(0, s.outcome.profitPercent))));

    let level: 'LOW' | 'MEDIUM' | 'HIGH';
    if (probabilityOfLoss < 30 && avgLoss < 2) level = 'LOW';
    else if (probabilityOfLoss < 50 && avgLoss < 4) level = 'MEDIUM';
    else level = 'HIGH';

    return { level, probabilityOfLoss, expectedLoss: avgLoss, maxDrawdown };
  }

  protected calculateConfidence(scenarios: TradeScenario[], winRate: number): number {
    const dataConfidence = Math.min(scenarios.length / 50, 1) * 30;
    const winRateConfidence = Math.min(winRate / 100, 1) * 50;
    const consistency = this.calculateConsistency(scenarios);
    const consistencyConfidence = consistency * 20;
    return Math.round(dataConfidence + winRateConfidence + consistencyConfidence);
  }

  protected calculateConsistency(scenarios: TradeScenario[]): number {
    if (scenarios.length < 2) return 0;
    const returns = scenarios.map(s => s.outcome.profitPercent);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - stdDev / 10);
  }

  protected assessMarketMatch(scenarioCount: number, winRate: number): 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' {
    if (scenarioCount >= 20 && winRate >= 70) return 'EXCELLENT';
    if (scenarioCount >= 10 && winRate >= 60) return 'GOOD';
    if (scenarioCount >= 5 && winRate >= 50) return 'AVERAGE';
    return 'POOR';
  }

  protected calculateAvgReturn(scenarios: TradeScenario[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / scenarios.length;
  }

  protected generateReasoning(action: string, winRate: number, scenarios: TradeScenario[], conditions: ReturnType<typeof this.analyzeCurrentConditions>): string[] {
    const reasons: string[] = [];
    if (scenarios.length >= this.config.minScenariosRequired) reasons.push(`過去に${scenarios.length}件の類似シナリオを検出（勝率${winRate.toFixed(1)}%）`);
    else reasons.push(`類似シナリオが不足（${scenarios.length}件）のため、慎重な判断を推奨`);

    if (conditions.trend === 'UP' && action === 'BUY') reasons.push('上昇トレンドを確認、買いシグナル');
    else if (conditions.trend === 'DOWN' && action === 'SELL') reasons.push('下降トレンドを確認、売りシグナル');
    if (conditions.rsi < 30) reasons.push('RSIが売られすぎ水準、反発の可能性');
    else if (conditions.rsi > 70) reasons.push('RSIが買われすぎ水準、調整の可能性');
    if (conditions.volume === 'HIGH') reasons.push('出来高が高水準、トレンドの信頼性が高い');
    if (conditions.adx > 25) reasons.push(`トレンド強度=${conditions.adx.toFixed(1)}、強いトレンドを確認`);
    return reasons;
  }

  protected generateWarnings(risk: WinRateOptimization['risk'], winRate: number, scenarios: TradeScenario[]): string[] {
    const warnings: string[] = [];
    if (risk.level === 'HIGH') warnings.push('⚠️ 高リスク: 損失の可能性が高い');
    if (winRate < this.config.minWinRateForTrade) warnings.push(`⚠️ 低勝率: ${winRate.toFixed(1)}%（推奨${this.config.minWinRateForTrade}%以上）`);
    if (scenarios.length < this.config.minScenariosRequired) warnings.push('⚠️ データ不足: 判断材料が不十分');
    if (risk.maxDrawdown > 10) warnings.push(`⚠️ 大きなドローダウンリスク: 最大${risk.maxDrawdown.toFixed(1)}%`);
    return warnings;
  }

  getOptimizationStats(): { totalScenarios: number; avgWinRate: number } {
    if (this.scenarios.length === 0) return { totalScenarios: 0, avgWinRate: 0 };
    const wins = this.scenarios.filter(s => s.outcome.won).length;
    const avgWinRate = (wins / this.scenarios.length) * 100;
    return { totalScenarios: this.scenarios.length, avgWinRate };
  }
}
