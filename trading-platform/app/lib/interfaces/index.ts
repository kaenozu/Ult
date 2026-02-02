/**
 * Service Interfaces
 * 
 * すべてのサービスのインターフェース定義
 * テスト時にモック実装に差し替え可能
 */

import { OHLCV, Stock, Signal } from '../types';
import { ExtendedTechnicalIndicator } from '../types/prediction-types';
import { ModelPrediction } from '../../types';

export interface IApiClient {
  fetch<T>(url: string, options?: RequestInit): Promise<T>;
  post<T>(url: string, body: any): Promise<T>;
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
    params: Record<string, any>
  ): Promise<{
    trades: any[];
    metrics: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
    };
  }>;
}

export interface IMLModelService {
  predict(features: any): ModelPrediction;
  train(data: any[]): Promise<void>;
  evaluate(testData: any[]): number;
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
  assessPortfolioRisk(positions: any[]): {
    totalRisk: number;
    var: number;
    correlationRisk: number;
  };
}
