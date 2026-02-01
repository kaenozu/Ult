/**
 * シグナル生成サービス
 * 
 * このモジュールは、ML予測結果から取引シグナルを生成する機能を提供します。
 */

import { Stock, OHLCV, Signal, ModelPrediction } from '../../types';
import { analyzeStock } from '@/app/lib/analysis';
import { PRICE_CALCULATION, BACKTEST_CONFIG, SIGNAL_THRESHOLDS, MARKET_CORRELATION } from '@/app/lib/constants';

interface MarketCorrelationResult {
  marketInfo: {
    indexSymbol: string;
    correlation: number;
    indexTrend: 'UP' | 'DOWN' | 'NEUTRAL';
  } | undefined;
  confidenceAdj: number;
  marketComment: string;
}

/**
 * シグナル生成サービス
 */
export class SignalGenerationService {
  /**
   * 最終的なシグナルを生成（市場相関と自己矯正を含む）
   */
  generateSignal(
    stock: Stock, 
    data: OHLCV[], 
    prediction: ModelPrediction, 
    indicators: any, // TechnicalIndicator & { atr: number[] }
    indexData?: OHLCV[]
  ): Signal {
    const currentPrice = data[data.length - 1].close;
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market);

    // 1. 市場相関分析 (Market Sync)
    const { marketInfo, confidenceAdj, marketComment } = this.analyzeMarketCorrelation(
      stock, 
      data, 
      indexData, 
      prediction.ensemblePrediction
    );

    const finalConfidence = Math.min(
      Math.max(prediction.confidence + confidenceAdj, PRICE_CALCULATION.MIN_CONFIDENCE), 
      PRICE_CALCULATION.MAX_CONFIDENCE
    );
    const isStrong = finalConfidence >= 80;

    // 2. シグナルタイプの決定
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (prediction.ensemblePrediction > 1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) {
      type = 'BUY';
    } else if (prediction.ensemblePrediction < -1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) {
      type = 'SELL';
    }

    // 3. 自己矯正 (Self-Correction): 誤差係数による補正と、ターゲット価格の再計算
    const errorFactor = baseAnalysis.predictionError || 1.0;
    const ERROR_THRESHOLD = 1.2;
    const TARGET_MULTIPLIER = 1.5;

    // ML予測に基づいた動的なターゲット価格の算出
    const atr = baseAnalysis.atr || (currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO);
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      // 予測騰落率かATRの大きい方を採用
      const move = Math.max(
        currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), 
        atr * TARGET_MULTIPLIER
      );
      targetPrice = currentPrice + move;
      stopLoss = currentPrice - (move / 2);
    } else if (type === 'SELL') {
      const move = Math.max(
        currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), 
        atr * TARGET_MULTIPLIER
      );
      targetPrice = currentPrice - move;
      stopLoss = currentPrice + (move / 2);
    } else {
      // HOLDの場合はターゲットを現在値に固定
      targetPrice = currentPrice;
      stopLoss = currentPrice;
    }

    let correctionComment = "";
    if (errorFactor > ERROR_THRESHOLD && type !== 'HOLD') {
      correctionComment = ` 直近の予測誤差(${errorFactor.toFixed(1)}倍)を考慮しリスク管理を強化。`;
      const drift = Math.abs(currentPrice - stopLoss) * errorFactor;
      stopLoss = type === 'BUY' ? currentPrice - drift : currentPrice + drift;
    }

    const optParamsStr = baseAnalysis.optimizedParams 
      ? `最適化設定(RSI:${baseAnalysis.optimizedParams.rsiPeriod}, SMA:${baseAnalysis.optimizedParams.smaPeriod}) ` 
      : "";
    const reason = `${isStrong ? '【強気】' : '【注視】'}${optParamsStr}${this.generateBaseReason(type)} ${marketComment}${correctionComment}`;

    // 予測騰落率の符号をシグナルタイプと強制的に一致させるガード
    let finalPredictedChange = prediction.ensemblePrediction;
    if (type === 'BUY' && finalPredictedChange < 0) finalPredictedChange = Math.abs(finalPredictedChange);
    if (type === 'SELL' && finalPredictedChange > 0) finalPredictedChange = -Math.abs(finalPredictedChange);
    if (type === 'HOLD') finalPredictedChange = 0;

    return {
      symbol: stock.symbol, 
      type,
      confidence: Math.round(finalConfidence),
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice, 
      stopLoss, 
      reason,
      predictedChange: parseFloat(finalPredictedChange.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext: marketInfo,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: errorFactor,
      volumeResistance: baseAnalysis.volumeResistance
    };
  }

  /**
   * 市場相関分析
   */
  private analyzeMarketCorrelation(
    stock: Stock, 
    data: OHLCV[], 
    indexData: OHLCV[] | undefined, 
    prediction: number
  ): MarketCorrelationResult {
    if (!indexData || indexData.length < 20) {
      return {
        marketInfo: undefined,
        confidenceAdj: 0,
        marketComment: "市場指数との相関は低く、個別要因が支配的です。"
      };
    }

    const correlation = this.calculateCorrelation(
      this.calculateReturns(data.slice(-30)),
      this.calculateReturns(indexData.slice(-30))
    );
    
    const indexPrice = indexData[indexData.length - 1].close;
    const indexSMA20 = this.calculateSMA(indexData.map(d => d.close), 20)[indexData.length - 1] || indexPrice;
    const trendDeviation = 1 + MARKET_CORRELATION.TREND_DEVIATION;
    const indexTrend: 'UP' | 'DOWN' | 'NEUTRAL' =
      indexPrice > indexSMA20 * trendDeviation ? 'UP' :
        indexPrice < indexSMA20 * (2 - trendDeviation) ? 'DOWN' : 'NEUTRAL';

    const marketInfo = {
      indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ',
      correlation,
      indexTrend
    };
    
    const isAligned = (indexTrend === 'UP' && prediction > 0) || (indexTrend === 'DOWN' && prediction < 0);
    const isOpposed = (indexTrend === 'DOWN' && prediction > 0) || (indexTrend === 'UP' && prediction < 0);

    let confidenceAdj = 0;
    let marketComment = `市場全体（${marketInfo.indexSymbol}）との相関は ${correlation.toFixed(2)} です。`;
    
    if (Math.abs(correlation) > SIGNAL_THRESHOLDS.STRONG_CORRELATION) {
      if (isAligned) {
        confidenceAdj = 10;
        marketComment = `市場全体（${marketInfo.indexSymbol}）との強い連動(r=${correlation.toFixed(2)})を伴う確実性の高い動きです。`;
      } else if (isOpposed) {
        confidenceAdj = -15;
        marketComment = `市場全体は${indexTrend === 'UP' ? '好調' : '不調'}ですが、本銘柄は逆行(r=${correlation.toFixed(2)})しており警戒が必要です。`;
      }
    }
    
    return { marketInfo, confidenceAdj, marketComment };
  }

  /**
   * 価格リターンを計算
   */
  private calculateReturns(data: OHLCV[]): number[] {
    if (data.length < 2) return [];
    return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
  }

  /**
   * 2つの配列間の相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const muX = x.reduce((a, b) => a + b, 0) / n;
    const muY = y.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - muX;
      const dy = y[i] - muY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    
    const den = Math.sqrt(denX) * Math.sqrt(denY);
    return den === 0 ? 0 : num / den;
  }

  /**
   * 簡易SMA計算
   */
  private calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN); // 期間に満たない場合はNaN
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * 基本的な理由を生成
   */
  private generateBaseReason(type: string): string {
    if (type === 'BUY') return "短期的な上昇トレンドを検出。上昇余地あり。";
    if (type === 'SELL') return "過熱感があり、反落の可能性が高いシグナル。";
    return "中立的なシグナル。市場の方向性を様子見することを推奨。";
  }

  /**
   * マルチ時間枠分析を使用した強化シグナル生成
   * 
   * 複数の時間枠から整合性を確認し、より信頼性の高いシグナルを生成します。
   */
  async generateEnhancedSignalWithMultiTimeFrame(
    stock: Stock, 
    data: OHLCV[], 
    prediction: ModelPrediction, 
    indicators: any,
    dataByTimeFrame?: Map<string, OHLCV[]>, // TimeFrame -> OHLCV[]
    indexData?: OHLCV[]
  ): Promise<Signal> {
    // まず基本シグナルを生成
    const baseSignal = this.generateSignal(stock, data, prediction, indicators, indexData);

    // マルチ時間枠データがない場合は基本シグナルを返す
    if (!dataByTimeFrame || dataByTimeFrame.size === 0) {
      return baseSignal;
    }

    try {
      // MultiTimeFrameStrategyを動的にインポート
      const { multiTimeFrameStrategy } = await import('../strategies/MultiTimeFrameStrategy');

      // マルチ時間枠分析を実行
      const mtfAnalysis = await multiTimeFrameStrategy.analyzeMultipleTimeFrames(
        stock.symbol,
        dataByTimeFrame as any
      );

      // 時間枠間の整合性チェック
      const alignmentBonus = Math.floor(mtfAnalysis.alignment * 20); // 最大+20%の信頼度ボーナス
      const enhancedConfidence = Math.min(baseSignal.confidence + alignmentBonus, 100);

      // 乖離が検出された場合は信頼度を下げる
      let finalConfidence = enhancedConfidence;
      let finalType = baseSignal.type;
      let additionalReason = '';

      if (mtfAnalysis.divergenceDetected) {
        finalConfidence = Math.floor(enhancedConfidence * 0.8);
        additionalReason += ' ⚠ 複数時間枠間で乖離が検出されています。';
        
        // 乖離が大きい場合はHOLDに変更
        if (mtfAnalysis.alignment < 0.5) {
          finalType = 'HOLD';
          additionalReason += ' 時間枠間の整合性が低いため、様子見を推奨します。';
        }
      } else {
        // 時間枠が整合している場合、推奨シグナルを使用
        if (mtfAnalysis.primarySignal !== 'HOLD' && mtfAnalysis.confidence >= 70) {
          finalType = mtfAnalysis.primarySignal;
          additionalReason += ` ✓ 複数時間枠で整合性が確認されました（整合率: ${(mtfAnalysis.alignment * 100).toFixed(0)}%）。`;
        }
      }

      // マルチ時間枠の推奨理由を追加
      const mtfReasoningSummary = mtfAnalysis.reasoning.slice(0, 2).join(' ');
      const enhancedReason = `${baseSignal.reason}${additionalReason} ${mtfReasoningSummary}`;

      return {
        ...baseSignal,
        type: finalType,
        confidence: finalConfidence,
        reason: enhancedReason,
        // マルチ時間枠情報を追加
        regimeDescription: mtfAnalysis.recommendation,
      };
    } catch (error) {
      // エラーが発生した場合は基本シグナルを返す
      console.error('Multi-timeframe analysis failed:', error);
      return baseSignal;
    }
  }
}

export const signalGenerationService = new SignalGenerationService();