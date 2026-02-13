/**
 * Test Prediction Service
 * 
 * テスト用の予測サービス実装
 * 決定論的な結果を返す
 */

import { IPredictionService } from '../interfaces';
import { OHLCV, Stock } from '../types';
import { ExtendedTechnicalIndicator } from '../types/prediction-types';

export class TestPredictionService implements IPredictionService {
  private mockPredictions = new Map<string, {
    prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'neutral';
  }>();

  setMockPrediction(
    symbol: string,
    result: {
      prediction: number;
      confidence: number;
      trend: 'up' | 'down' | 'neutral';
    }
  ): void {
    this.mockPredictions.set(symbol, result);
  }

  async generatePrediction(
    stock: Stock,
    _historicalData: OHLCV[],
    _indicators: ExtendedTechnicalIndicator
  ): Promise<{
    prediction: number;
    confidence: number;
    trend: 'up' | 'down' | 'neutral';
  }> {
    const mock = this.mockPredictions.get(stock.symbol);
    if (mock) {
      return mock;
    }

    // デフォルトの予測結果
    return {
      prediction: 0,
      confidence: 50,
      trend: 'neutral'
    };
  }

  reset(): void {
    this.mockPredictions.clear();
  }
}
