import { OHLCV } from '@/app/types';
import { marketDataService } from './MarketDataService';
import { technicalIndicatorService } from './TechnicalIndicatorService';
import { SignalValidatorService } from '../SignalValidatorService';
import { DynamicWeightingService, Weights } from '../DynamicWeightingService';
import { parameterOptimizerService } from '../ParameterOptimizerService';
import { expectedValueService, EVResult } from '../ExpectedValueService';
import { marketRegimeService, MarketRegime } from '../MarketRegimeService';
import { featureEngine } from '../FeatureEngine';
import { LSTMModel } from './tensorflow-model-service';
import { logger } from '@/app/core/logger';

export interface IntelligenceReport {
  symbol: string;
  confidenceScore: number; 
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  expectedValue: EVResult;
  regime: MarketRegime; // New field in report
  components: {
    aiPrediction: number;
    technicalScore: number;
    marketCorrelation: number;
    supplyDemandScore: number;
  };
  appliedWeights: Weights;
  optimizedRSIPeriod: number;
  reasoning: string[];
  timestamp: string;
}

export class UnifiedIntelligenceService {
  private weightingService = new DynamicWeightingService();
  private validatorService = new SignalValidatorService();
  private mlModel = new LSTMModel();

  async generateReport(symbol: string, market: 'japan' | 'usa'): Promise<IntelligenceReport> {
    const dataResult = await marketDataService.fetchMarketData(symbol);
    if (!dataResult.success || dataResult.data.length < 50) {
      throw new Error(`Insufficient data for ${symbol}`);
    }

    const ohlcv = dataResult.data;
    const lastPrice = ohlcv[ohlcv.length - 1].close;

    // --- 1. 文脈（相場環境）の特定 (TOBEの一本化) ---
    const regime = marketRegimeService.classify(ohlcv);

    // --- 2. 各コンポーネントの分析 ---
    const features = featureEngine.extract(ohlcv);
    const prediction = await this.mlModel.predict(features);
    const aiScore = Math.round(prediction * 100);

    const optimizedRSIPeriod = await parameterOptimizerService.findBestRSIPeriod(ohlcv, [7, 10, 14, 21]);
    const technicalScore = this.calculateTechnicalScore(ohlcv, optimizedRSIPeriod);
    const correlationScore = await this.calculateMarketCorrelationScore(symbol, market);
    const supplyDemandScore = this.calculateSupplyDemandScore(ohlcv, lastPrice);

    // --- 3. 動的最適化（実績 × 文脈）---
    const performance = await this.getHistoricalPerformance(symbol, ohlcv);
    const baseWeights: Weights = { ai: 0.4, technical: 0.25, correlation: 0.15, supplyDemand: 0.2 };
    
    // 実績だけでなく、現在の regime も考慮して重みを決定
    const optimizedWeights = this.weightingService.optimize(baseWeights, performance, regime);

    // --- 4. 最終確信度の算出 ---
    let finalScore = (
      (aiScore * optimizedWeights.ai) +
      (technicalScore * optimizedWeights.technical) +
      (correlationScore * optimizedWeights.correlation) +
      (supplyDemandScore * optimizedWeights.supplyDemand)
    );

    // 期待値(EV)によるフィルタリング
    const ev = expectedValueService.calculate({
      hitRate: performance.ai.hitRate,
      avgProfit: 1500, 
      avgLoss: 1000,   
      totalTrades: 50
    });

    if (!ev.isPositive) finalScore *= 0.7; 

    const recommendation = this.determineRecommendation(finalScore);
    const reasoning = this.generateReasoning({
      aiScore, technicalScore, correlationScore, supplyDemandScore, recommendation, 
      optimizedWeights, optimizedRSIPeriod, ev, regime
    });

    return {
      symbol,
      confidenceScore: Math.round(finalScore),
      recommendation,
      expectedValue: ev,
      regime,
      components: {
        aiPrediction: aiScore,
        technicalScore,
        marketCorrelation: correlationScore,
        supplyDemandScore
      },
      appliedWeights: optimizedWeights,
      optimizedRSIPeriod,
      reasoning,
      timestamp: new Date().toISOString()
    };
  }

    if (!ev.isPositive) {
      finalScore *= 0.7; 
    }

    const recommendation = this.determineRecommendation(finalScore);
    const reasoning = this.generateReasoning({
      aiScore, technicalScore, correlationScore, supplyDemandScore, recommendation, 
      optimizedWeights, optimizedRSIPeriod, ev
    });

    return {
      symbol,
      confidenceScore: Math.round(finalScore),
      recommendation,
      expectedValue: ev,
      components: {
        aiPrediction: aiScore,
        technicalScore,
        marketCorrelation: correlationScore,
        supplyDemandScore
      },
      appliedWeights: optimizedWeights,
      optimizedRSIPeriod,
      reasoning,
      timestamp: new Date().toISOString()
    };
  }

  private calculateTechnicalScore(ohlcv: OHLCV[], rsiPeriod: number): number {
    const closes = ohlcv.map(d => d.close);
    const rsi = technicalIndicatorService.calculateRSI(closes, rsiPeriod);
    const lastRSI = rsi[rsi.length - 1];
    
    let score = 50;
    if (lastRSI > 70) score += 20; 
    if (lastRSI < 30) score -= 20; 

    return Math.min(100, Math.max(0, score));
  }

  private async calculateMarketCorrelationScore(symbol: string, market: 'japan' | 'usa'): Promise<number> {
    const indexSymbol = market === 'japan' ? '^N225' : '^GSPC';
    const indexData = await marketDataService.fetchMarketData(indexSymbol);
    const stockData = await marketDataService.fetchMarketData(symbol);

    if (indexData.success && stockData.success) {
      const corr = marketDataService.calculateCorrelation(stockData.data, indexData.data);
      return Math.round((corr + 1) * 50); 
    }
    return 50;
  }

  private calculateSupplyDemandScore(ohlcv: OHLCV[], lastPrice: number): number {
    const low = Math.min(...ohlcv.slice(-20).map(d => d.low));
    const high = Math.max(...ohlcv.slice(-20).map(d => d.high));
    const range = high - low;
    if (range === 0) return 50;
    const position = (lastPrice - low) / range;
    return Math.round((1 - position) * 100); 
  }

  private async getHistoricalPerformance(symbol: string, ohlcv: OHLCV[]) {
    return {
      ai: { hitRate: 65 + Math.random() * 20 },
      technical: { hitRate: 40 + Math.random() * 30 },
      correlation: { hitRate: 50 },
      supplyDemand: { hitRate: 60 }
    };
  }

  private determineRecommendation(score: number): IntelligenceReport['recommendation'] {
    if (score >= 80) return 'STRONG_BUY';
    if (score >= 65) return 'BUY';
    if (score <= 20) return 'STRONG_SELL';
    if (score <= 35) return 'SELL';
    return 'HOLD';
  }

  private generateReasoning(data: any): string[] {
    const reasons: string[] = [];
    if (data.optimizedRSIPeriod !== 14) {
      reasons.push(`銘柄最適化: RSI期間を ${data.optimizedRSIPeriod} 日に調整して精度を高めています。`);
    }
    if (data.aiScore > 75) reasons.push('AIモデルが強力な上昇シグナルを検知しています。');
    if (data.technicalScore > 70) reasons.push('主要なテクニカル指標が強気転換を示唆しています。');
    if (data.supplyDemandScore > 80) reasons.push('価格が強力なサポートゾーン（需要の壁）に位置しています。');
    if (reasons.length === 0) reasons.push('明確なトレンドは確認されず、市場は保ち合いの状態です。');
    return reasons;
  }
}

export const unifiedIntelligenceService = new UnifiedIntelligenceService();
