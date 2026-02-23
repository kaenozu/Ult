import { Stock, OHLCV, Signal, TechnicalIndicator } from '../../types';
import { calculateSMA } from '../utils';
import { analyzeStock } from '../analysis';
import { SMA_CONFIG, PRICE_CALCULATION, BACKTEST_CONFIG, MARKET_CORRELATION, SIGNAL_THRESHOLDS } from '@/app/constants';
import { MLPredictionCore } from './core';
import { ModelPrediction } from './types';

class MLPredictionService extends MLPredictionCore {
  generateSignal(stock: Stock, data: OHLCV[], prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }, indexData?: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market, indexData);

    const { marketInfo, confidenceAdjustment } = this.analyzeMarketCorrelation(stock, data, indexData, prediction.ensemblePrediction);
    const finalConfidence = Math.min(Math.max(prediction.confidence + confidenceAdjustment, PRICE_CALCULATION.MIN_CONFIDENCE), PRICE_CALCULATION.MAX_CONFIDENCE);

    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const BUY_THRESHOLD = 0.5;
    const SELL_THRESHOLD = -0.5;

    if (prediction.ensemblePrediction > BUY_THRESHOLD && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'BUY';
    else if (prediction.ensemblePrediction < SELL_THRESHOLD && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'SELL';

    const errorFactor = baseAnalysis.predictionError || 1.0;
    const ERROR_THRESHOLD = 1.2;
    const TARGET_MULTIPLIER = 1.5;

    const atr = baseAnalysis.atr || (currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO);
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      const priceMove = Math.max(currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice + priceMove;
      stopLoss = currentPrice - (priceMove / 2);
    } else if (type === 'SELL') {
      const priceMove = Math.max(currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice - priceMove;
      stopLoss = currentPrice + (priceMove / 2);
    } else {
      const predictedMove = currentPrice * (prediction.ensemblePrediction / 100);
      targetPrice = currentPrice + predictedMove;
      stopLoss = currentPrice;
    }

    let correctionComment = "";
    if (errorFactor > ERROR_THRESHOLD && type !== 'HOLD') {
      correctionComment = ` 直近の予測誤差(${errorFactor.toFixed(1)}倍)を考慮しリスク管理を強化。`;
      const drift = Math.abs(currentPrice - stopLoss) * errorFactor;
      stopLoss = type === 'BUY' ? currentPrice - drift : currentPrice + drift;
    }

    let finalPredictedChange = prediction.ensemblePrediction;
    if (type === 'BUY' && finalPredictedChange < 0) finalPredictedChange = Math.abs(finalPredictedChange);
    if (type === 'SELL' && finalPredictedChange > 0) finalPredictedChange = -Math.abs(finalPredictedChange);

    if (type === 'HOLD') {
      const dampingFactor = Math.max(0, (finalConfidence - 30) / 70);
      finalPredictedChange = prediction.ensemblePrediction * dampingFactor;
    }

    const reason = this.generateBaseReason(type);

    if (isNaN(targetPrice)) targetPrice = currentPrice;
    if (isNaN(stopLoss)) stopLoss = currentPrice;

    return {
      symbol: stock.symbol, type,
      confidence: Math.round(finalConfidence),
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice, stopLoss, reason,
      predictedChange: parseFloat(finalPredictedChange.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext: marketInfo,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: errorFactor,
      volumeResistance: baseAnalysis.volumeResistance,
      forecastCone: baseAnalysis.forecastCone
    };
  }

  private analyzeMarketCorrelation(stock: Stock, data: OHLCV[], indexData: OHLCV[] | undefined, prediction: number) {
    if (!indexData || indexData.length < SMA_CONFIG.SHORT_PERIOD) {
      return { marketInfo: undefined, confidenceAdjustment: 0, marketComment: "市場指数との相関は低く、個別要因が支配的です。" };
    }

    const correlation = this.calculateCorrelation(
      this.calculateReturns(data.slice(-20)),
      this.calculateReturns(indexData.slice(-20))
    );
    const indexPrice = this.last(indexData.map(d => d.close), 0);
    const indexSMA20 = calculateSMA(indexData.map(d => d.close), SMA_CONFIG.SHORT_PERIOD).pop() || indexPrice;
    const trendDeviation = 1 + MARKET_CORRELATION.TREND_DEVIATION;
    const indexTrend: 'UP' | 'DOWN' | 'NEUTRAL' =
      indexPrice > indexSMA20 * trendDeviation ? 'UP' :
        indexPrice < indexSMA20 * (2 - trendDeviation) ? 'DOWN' : 'NEUTRAL';

    const marketInfo = { indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ', correlation, indexTrend };
    const isAligned = (indexTrend === 'UP' && prediction > 0) || (indexTrend === 'DOWN' && prediction < 0);
    const isOpposed = (indexTrend === 'DOWN' && prediction > 0) || (indexTrend === 'UP' && prediction < 0);

    let confidenceAdjustment = 0;
    if (Math.abs(correlation) > SIGNAL_THRESHOLDS.STRONG_CORRELATION) {
      if (isAligned) confidenceAdjustment = 10;
      else if (isOpposed) confidenceAdjustment = -15;
    }
    return { marketInfo, confidenceAdjustment };
  }

  private calculateReturns(data: OHLCV[]): number[] {
    return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const muX = x.reduce((a: number, b: number) => a + b, 0) / n, muY = y.reduce((a: number, b: number) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - muX, dy = y[i] - muY;
      num += dx * dy; denX += dx * dx; denY += dy * dy;
    }
    const denominator = Math.sqrt(denX) * Math.sqrt(denY);
    return denominator === 0 ? 0 : num / denominator;
  }

  private generateBaseReason(type: string): string {
    const reasons = this._lastPredictionReasons;
    if (reasons.length === 0) {
      if (type === 'BUY') return "複合指標から上昇トレンドを検出。";
      if (type === 'SELL') return "複合指標から下降トレンドを検出。";
      return "指標に方向性が見られず、様子見を推奨。";
    }
    const topReasons = reasons.slice(0, 3);
    const reasonText = topReasons.join(' ');
    if (type === 'BUY') return `買いシグナル: ${reasonText}`;
    else if (type === 'SELL') return `売りシグナル: ${reasonText}`;
    return `中立: ${reasonText}`;
  }
}

export const mlPredictionService = new MLPredictionService();
