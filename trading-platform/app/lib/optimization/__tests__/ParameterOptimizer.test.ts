/**
 * ParameterOptimizer.test.ts
 * 
 * パラメータ最適化エンジンのテスト
 */

import { 
  ParameterOptimizer,
  createDefaultParameterSpace,
  createDefaultOptimizationConfig,
  ParameterSpace,
  OptimizationConfig
} from '../ParameterOptimizer';
import { BacktestResult, BacktestConfig } from '../../backtest/AdvancedBacktestEngine';
import { OHLCV } from '@/app/types';

describe('ParameterOptimizer', () => {
  // モックデータ生成
  const generateMockData = (days: number): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    
    for (let i = 0; i < days; i++) {
      const change = (Math.random() - 0.5) * 2;
      price += change;
      
      data.push({
        timestamp: new Date(2023, 0, i + 1).toISOString(),
        open: price,
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price,
        volume: Math.floor(Math.random() * 1000000),
      });
    }
    
    return data;
  };

  // モック戦略エグゼキュータ
  const mockStrategyExecutor = async (
    params: Record<string, number | string>,
    data: OHLCV[],
    config: BacktestConfig
  ): Promise<BacktestResult> => {
    // シンプルなモックリザルト
    const sharpeRatio = Math.random() * 3;
    const totalReturn = Math.random() * 50 - 10;
    
    return {
      trades: [],
      equityCurve: Array(data.length).fill(0).map((_, i) => 100 * (1 + totalReturn / 100 * i / data.length)),
      metrics: {
        totalReturn,
        annualizedReturn: totalReturn * 2,
        volatility: 15,
        sharpeRatio,
        sortinoRatio: sharpeRatio * 1.2,
        maxDrawdown: 10,
        maxDrawdownDuration: 30,
        winRate: 55,
        profitFactor: 1.5,
        averageWin: 2,
        averageLoss: -1.5,
        largestWin: 10,
        largestLoss: -8,
        averageTrade: 0.5,
        totalTrades: 50,
        winningTrades: 28,
        losingTrades: 22,
        calmarRatio: totalReturn / 10,
        omegaRatio: 1.3,
      },
      config,
      startDate: data[0].timestamp,
      endDate: data[data.length - 1].timestamp,
      duration: data.length,
    };
  };

  const mockBacktestConfig: BacktestConfig = {
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    spread: 0.001,
    maxPositionSize: 1.0,
    maxDrawdown: 0.2,
    allowShort: false,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 0.02,
  };

  describe('Constructor', () => {
    it('should create an instance with parameter space and config', () => {
      const paramSpace = createDefaultParameterSpace();
      const config = createDefaultOptimizationConfig();
      
      const optimizer = new ParameterOptimizer(paramSpace, config);
      
      expect(optimizer).toBeInstanceOf(ParameterOptimizer);
    });
  });

  describe('Grid Search', () => {
    it('should perform grid search optimization', async () => {
      const paramSpace: ParameterSpace[] = [
        { name: 'param1', type: 'int', min: 1, max: 3 },
        { name: 'param2', type: 'float', min: 0.1, max: 0.3 },
      ];
      
      const config: OptimizationConfig = {
        method: 'grid',
        maxIterations: 10,
        validationSplit: 0.2,
        objective: 'sharpe',
      };
      
      const optimizer = new ParameterOptimizer(paramSpace, config);
      const data = generateMockData(100);
      
      const result = await optimizer.optimize(data, mockStrategyExecutor, mockBacktestConfig);
      
      expect(result.bestParams).toBeDefined();
      expect(result.bestScore).toBeGreaterThanOrEqual(0);
      expect(result.allTrials.length).toBeGreaterThan(0);
      expect(result.computationTime).toBeGreaterThan(0);
    });
  });

  describe('Bayesian Optimization', () => {
    it('should perform Bayesian optimization', async () => {
      const paramSpace: ParameterSpace[] = [
        { name: 'param1', type: 'int', min: 5, max: 15 },
        { name: 'param2', type: 'float', min: 0.5, max: 2.0 },
      ];
      
      const config: OptimizationConfig = {
        method: 'bayesian',
        maxIterations: 20,
        validationSplit: 0.2,
        objective: 'sharpe',
      };
      
      const optimizer = new ParameterOptimizer(paramSpace, config);
      const data = generateMockData(100);
      
      const result = await optimizer.optimize(data, mockStrategyExecutor, mockBacktestConfig);
      
      expect(result.bestParams).toBeDefined();
      expect(result.allTrials.length).toBe(20);
      expect(result.convergenceHistory.length).toBe(20);
    });
  });

  describe('Walk-Forward Validation', () => {
    it('should perform walk-forward validation', async () => {
      const paramSpace = createDefaultParameterSpace();
      const config = createDefaultOptimizationConfig();
      
      const optimizer = new ParameterOptimizer(paramSpace, config);
      const data = generateMockData(200);
      
      const result = await optimizer.walkForwardValidation(
        data,
        mockStrategyExecutor,
        mockBacktestConfig,
        3
      );
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.averageScore).toBeDefined();
      expect(result.stability).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create default parameter space', () => {
      const paramSpace = createDefaultParameterSpace();
      
      expect(paramSpace.length).toBeGreaterThan(0);
      expect(paramSpace[0]).toHaveProperty('name');
      expect(paramSpace[0]).toHaveProperty('type');
    });

    it('should create default optimization config', () => {
      const config = createDefaultOptimizationConfig();
      
      expect(config.method).toBe('bayesian');
      expect(config.maxIterations).toBe(100);
      expect(config.validationSplit).toBe(0.2);
      expect(config.objective).toBe('sharpe');
    });
  });
});
