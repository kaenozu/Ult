import { OHLCV } from '@/app/types';
import { WinRateOptimization, TradeScenario, OptimizationConfig } from './types';
import { WinRateMaximizerCore } from './core';

export class WinRateMaximizer extends WinRateMaximizerCore {
  optimize(currentData: OHLCV[], symbol: string, portfolioValue: number): WinRateOptimization {
    const currentConditions = this.analyzeCurrentConditions(currentData);
    const similarScenarios = this.findSimilarScenarios(currentConditions);
    const winRate = this.calculateWinRate(similarScenarios);
    const action = this.determineAction(winRate, currentConditions, similarScenarios);
    const optimalEntry = this.calculateOptimalEntry(currentData, similarScenarios);
    const optimalExit = this.calculateOptimalExit(currentData, similarScenarios);
    const positionSizing = this.optimizePositionSize(winRate, portfolioValue);
    const risk = this.assessRisk(similarScenarios, currentData);
    const reasoning = this.generateReasoning(action, winRate, similarScenarios, currentConditions);
    const warnings = this.generateWarnings(risk, winRate, similarScenarios);

    return {
      action,
      confidence: this.calculateConfidence(similarScenarios, winRate),
      expectedWinRate: winRate,
      optimalEntry,
      optimalExit,
      positionSizing,
      marketConditions: {
        match: this.assessMarketMatch(similarScenarios.length, winRate),
        similarPastScenarios: similarScenarios.length,
        avgWinRateInSimilarScenarios: winRate,
        avgReturnInSimilarScenarios: this.calculateAvgReturn(similarScenarios),
      },
      risk,
      reasoning,
      warnings,
    };
  }
}

export const winRateMaximizer = new WinRateMaximizer();
