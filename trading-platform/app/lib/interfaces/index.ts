/**
 * Service Interfaces
 * 
 * すべてのサービスのインターフェース定義
 * テスト時にモック実装に差し替え可能
 */

import { OHLCV, Stock, Signal, BacktestTrade, Position, ModelPrediction } from '@/app/types';
import { ExtendedTechnicalIndicator } from '../types/prediction-types';

export interface IApiClient {
  fetch<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
  get<T>(url: string): Promise<T>;
}

export interface IPredictionService {
  generatePrediction(
    stock: Stock,
    historicalData: OHLCV[],
    indicators: ExtendedTechnicalIndicator
  ): Promise<{
    prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

export interface IMarketDataService {
  fetchStockData(symbol: string): Promise<OHLCV[]>;
  fetchLatestPrice(symbol: string): Promise<number>;
  subscribeToRealtime(symbol: string, callback: (data: OHLCV) => void): () => void;
}

export interface IBacktestService {
  runBacktest(
    strategy: string,
    data: OHLCV[],
    params: Record<string, unknown>
  ): Promise<{
    trades: BacktestTrade[];
    metrics: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
  }>;
}

export interface IMLModelService {
  predict(features: unknown): ModelPrediction;
  train(data: unknown[]): Promise<void>;
  evaluate(testData: unknown[]): number;
}

export interface ISignalGenerationService {
  generateSignals(
    stock: Stock,
    data: OHLCV[],
    indicators: ExtendedTechnicalIndicator
  ): Signal[];
}

export interface IPortfolioRiskManagementService {
  calculatePositionSize(
    accountValue: number,
    riskPercent: number,
    stopLossDistance: number
  ): number;
  assessPortfolioRisk(positions: Position[]): {
    totalRisk: number;
    var: number;
    correlationRisk: number;
  };
}
