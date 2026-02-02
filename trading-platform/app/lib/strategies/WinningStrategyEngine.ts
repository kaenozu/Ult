/**
 * WinningStrategyEngine.ts
 * 
 * 株取引で勝つための包括的な取引戦略エンジン
 * 
 * 【機能】
 * - 複数の取引戦略（トレンドフォロー、ブレイクアウト、逆張り、複合）
 * - 市場レジーム検出による動的戦略選択
 * - 高度なエントリー/イグジットロジック
 * - リスク管理統合
 */

import { OHLCV, Signal, Stock } from '@/app/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { marketRegimeDetector, RegimeDetectionResult } from '../MarketRegimeDetector';

// ============================================================================
// Types
// ============================================================================

export type StrategyType = 'TREND_FOLLOWING' | 'BREAKOUT' | 'MEAN_REVERSION' | 'COMPOSITE' | 'ADAPTIVE';

export interface StrategyResult {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number; // 推奨ポジションサイズ（%）
  riskRewardRatio: number;
  strategy: StrategyType;
  reasoning: string;
  indicators: {
    rsi: number;
    macd: number;
    sma20: number;
    sma50: number;
    bbUpper: number;
    bbLower: number;
    atr: number;
    adx: number;
  };
  metadata: {
    trendStrength: number;
    volatility: number;
    volumeConfirmation: boolean;
    supportLevel?: number;
    resistanceLevel?: number;
  };
}

export interface StrategyConfig {
  // RSI設定
  rsiOverbought: number;
  rsiOversold: number;
  rsiPeriod: number;
  
  // MACD設定
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  
  // 移動平均設定
  smaShortPeriod: number;
  smaMediumPeriod: number;
  smaLongPeriod: number;
  
  // ボリンジャーバンド設定
  bbPeriod: number;
  bbStdDev: number;
  
  // ATR設定
  atrPeriod: number;
  atrMultiplier: number;
  
  // ボリューム設定
  volumeThreshold: number;
  
  // ADX設定
  adxPeriod: number;
  adxTrendingThreshold: number;
  
  // リスク管理
  maxRiskPerTrade: number; // %
  minRiskRewardRatio: number;
  maxPositionSize: number; // %
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  rsiOverbought: 70,
  rsiOversold: 30,
  rsiPeriod: 14,
  
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  
  smaShortPeriod: 20,
  smaMediumPeriod: 50,
  smaLongPeriod: 200,
  
  bbPeriod: 20,
  bbStdDev: 2,
  
  atrPeriod: 14,
  atrMultiplier: 2,
  
  volumeThreshold: 1.5,
  
  adxPeriod: 14,
  adxTrendingThreshold: 25,
  
  maxRiskPerTrade: 2,
  minRiskRewardRatio: 2,
  maxPositionSize: 20,
};

// ============================================================================
// Winning Strategy Engine
// ============================================================================

class WinningStrategyEngine {
  private config: StrategyConfig;

  constructor(config: Partial<StrategyConfig> = {}) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
  }

  /**
   * 最適な戦略を選択して実行
   * 市場レジームに基づいて最適な戦略を自動選択
   */
  executeAdaptiveStrategy(
    data: OHLCV[],
    symbol: string,
    capital: number = 100000
  ): StrategyResult {
    // 市場レジームを検出
    const regime = marketRegimeDetector.detect(data);
    
    // レジームに基づいて戦略を選択
    let result: StrategyResult;
    
    // レジームに基づいてシグナル方向を制限
    const allowedSignals = regime.signalRestriction;
    
    if (regime.regime === 'TRENDING' && regime.trendDirection === 'UP') {
        // 上昇トレンド: 買いのみ
        result = this.executeTrendFollowingStrategy(data, 'LONG', capital);
    } else if (regime.regime === 'TRENDING' && regime.trendDirection === 'DOWN') {
        // 下降トレンド: 売りのみ
        result = this.executeTrendFollowingStrategy(data, 'SHORT', capital);
    } else if (regime.regime === 'RANGING') {
        // もみ合い: 両方許可（弱いシグナルで）
        result = this.executeMeanReversionStrategy(data, capital);
        // もみ合い相場では確信度を下げる
        if (result.confidence > 50) {
          result.confidence = Math.round(result.confidence * 0.7);
        }
    } else {
        // 不明な場合は複合戦略
        result = this.executeCompositeStrategy(data, capital);
    }
    
    // レジームに基づくシグナル制限を適用
    if (allowedSignals === 'BUY_ONLY' && result.signal === 'SELL') {
      result.signal = 'HOLD';
      result.confidence = 0;
      result.reasoning = `[制限] 上昇トレンド中の売りシグナルをブロック: ${result.reasoning}`;
    } else if (allowedSignals === 'SELL_ONLY' && result.signal === 'BUY') {
      result.signal = 'HOLD';
      result.confidence = 0;
      result.reasoning = `[制限] 下降トレンド中の買いシグナルをブロック: ${result.reasoning}`;
    }
    
    // レジームアライメントに基づく確信度調整
    if (result.signal === 'BUY' || result.signal === 'SELL') {
      const strengthMultiplier = marketRegimeDetector.getSignalStrengthMultiplier(regime, result.signal);
      result.confidence = Math.round(result.confidence * strengthMultiplier);
    }
    
    // 戦略タイプをADAPTIVEに設定
    result.strategy = 'ADAPTIVE';
    result.reasoning = `[${regime.regime} | ${regime.trendDirection}] ${result.reasoning}`;
    
    return result;
  }

  /**
   * トレンドフォロー戦略
   * 強いトレンドに乗る戦略
   */
  executeTrendFollowingStrategy(
    data: OHLCV[],
    forcedDirection?: 'LONG' | 'SHORT',
    capital: number = 100000
  ): StrategyResult {
    const indicators = this.calculateIndicators(data);
    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    
    // トレンド判定
    const isUptrend = indicators.sma20 > indicators.sma50 && latest.close > indicators.sma20;
    const isDowntrend = indicators.sma20 < indicators.sma50 && latest.close < indicators.sma20;
    
    // MACD確認
    const macdBullish = indicators.macd > 0;
    const macdBearish = indicators.macd < 0;
    
    // RSI確認（極端すぎないか）
    const rsiValid = indicators.rsi > 30 && indicators.rsi < 70;
    
    // ボリューム確認
    const avgVolume = this.calculateAverageVolume(data.slice(-20));
    const volumeConfirmed = latest.volume > avgVolume * this.config.volumeThreshold;
    
    // ADX確認（トレンドの強さ）
    const strongTrend = indicators.adx > this.config.adxTrendingThreshold;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';
    
    if (forcedDirection === 'LONG' || (!forcedDirection && isUptrend && macdBullish && rsiValid && strongTrend)) {
      signal = 'BUY';
      confidence = this.calculateTrendConfidence(indicators, true, volumeConfirmed);
      reasoning = `強い上昇トレンド: SMA20>SMA50(${isUptrend}), MACD>0(${macdBullish}), ADX=${indicators.adx.toFixed(1)}`;
    } else if (forcedDirection === 'SHORT' || (!forcedDirection && isDowntrend && macdBearish && rsiValid && strongTrend)) {
      signal = 'SELL';
      confidence = this.calculateTrendConfidence(indicators, false, volumeConfirmed);
      reasoning = `強い下降トレンド: SMA20<SMA50(${isDowntrend}), MACD<0(${macdBearish}), ADX=${indicators.adx.toFixed(1)}`;
    } else {
      reasoning = `トレンド不鮮明: アップトレンド=${isUptrend}, ダウントレンド=${isDowntrend}, ADX=${indicators.adx.toFixed(1)}`;
    }
    
    return this.buildStrategyResult(
      signal,
      confidence,
      latest,
      indicators,
      'TREND_FOLLOWING',
      reasoning,
      capital
    );
  }

  /**
   * ブレイクアウト戦略
   * 重要な価格レベルの突破を捉える
   */
  executeBreakoutStrategy(
    data: OHLCV[],
    capital: number = 100000
  ): StrategyResult {
    const indicators = this.calculateIndicators(data);
    const latest = data[data.length - 1];
    
    // 20期間の高値・安値を計算
    const period = 20;
    const highs = data.slice(-period - 1, -1).map(d => d.high);
    const lows = data.slice(-period - 1, -1).map(d => d.low);
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    // ブレイクアウト判定
    const breakoutUp = latest.close > highestHigh * 0.995; // 0.5%の許容範囲
    const breakoutDown = latest.close < lowestLow * 1.005;
    
    // ボリューム確認
    const avgVolume = this.calculateAverageVolume(data.slice(-20));
    const volumeSurge = latest.volume > avgVolume * this.config.volumeThreshold;
    
    // ボリンジャーバンド確認
    const bbBreakoutUp = latest.close > indicators.bbUpper;
    const bbBreakoutDown = latest.close < indicators.bbLower;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';
    
    if (breakoutUp && volumeSurge) {
      signal = 'BUY';
      confidence = bbBreakoutUp ? 85 : 70;
      confidence += volumeSurge ? 10 : 0;
      confidence = Math.min(95, confidence);
      reasoning = `上方ブレイクアウト: 期間高値${highestHigh.toFixed(0)}を突破, 出来高${(latest.volume/avgVolume).toFixed(1)}倍`;
    } else if (breakoutDown && volumeSurge) {
      signal = 'SELL';
      confidence = bbBreakoutDown ? 85 : 70;
      confidence += volumeSurge ? 10 : 0;
      confidence = Math.min(95, confidence);
      reasoning = `下方ブレイクアウト: 期間安値${lowestLow.toFixed(0)}を突破, 出来高${(latest.volume/avgVolume).toFixed(1)}倍`;
    } else {
      reasoning = `ブレイクアウトなし: 高値=${highestHigh.toFixed(0)}, 安値=${lowestLow.toFixed(0)}, 現在=${latest.close.toFixed(0)}`;
    }
    
    return this.buildStrategyResult(
      signal,
      confidence,
      latest,
      indicators,
      'BREAKOUT',
      reasoning,
      capital,
      { supportLevel: lowestLow, resistanceLevel: highestHigh }
    );
  }

  /**
   * 逆張り（均値回帰）戦略
   * 極端な価格変動からの反転を狙う
   */
  executeMeanReversionStrategy(
    data: OHLCV[],
    capital: number = 100000
  ): StrategyResult {
    const indicators = this.calculateIndicators(data);
    const latest = data[data.length - 1];
    
    // RSI極端値
    const rsiOversold = indicators.rsi < this.config.rsiOversold;
    const rsiOverbought = indicators.rsi > this.config.rsiOverbought;
    
    // ボリンジャーバンド極端値
    const bbOversold = latest.close < indicators.bbLower;
    const bbOverbought = latest.close > indicators.bbUpper;
    
    // 価格とSMAの乖離
    const sma = indicators.sma20;
    const priceDeviation = (latest.close - sma) / sma;
    const extremeDeviation = Math.abs(priceDeviation) > 0.05; // 5%以上乖離
    
    // ローソク足パターン（簡易版）
    const bodySize = Math.abs(latest.close - latest.open);
    const lowerWick = latest.open < latest.close 
      ? latest.open - latest.low 
      : latest.close - latest.low;
    const upperWick = latest.open < latest.close
      ? latest.high - latest.close
      : latest.high - latest.open;
    
    const hammer = lowerWick > bodySize * 2 && upperWick < bodySize;
    const shootingStar = upperWick > bodySize * 2 && lowerWick < bodySize;
    
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reasoning = '';
    
    // 買いシグナル：超売れ + ハンマー + 極端乖離
    if ((rsiOversold && bbOversold) || (rsiOversold && hammer)) {
      signal = 'BUY';
      confidence = 60;
      if (rsiOversold) confidence += 15;
      if (bbOversold) confidence += 10;
      if (hammer) confidence += 10;
      if (extremeDeviation) confidence += 5;
      confidence = Math.min(95, confidence);
      reasoning = `均値回帰買い: RSI=${indicators.rsi.toFixed(1)}, ハンマー=${hammer}, 乖離=${(priceDeviation*100).toFixed(1)}%`;
    }
    // 売りシグナル：超買い + シューティングスター + 極端乖離
    else if ((rsiOverbought && bbOverbought) || (rsiOverbought && shootingStar)) {
      signal = 'SELL';
      confidence = 60;
      if (rsiOverbought) confidence += 15;
      if (bbOverbought) confidence += 10;
      if (shootingStar) confidence += 10;
      if (extremeDeviation) confidence += 5;
      confidence = Math.min(95, confidence);
      reasoning = `均値回帰売り: RSI=${indicators.rsi.toFixed(1)}, シューティングスター=${shootingStar}, 乖離=${(priceDeviation*100).toFixed(1)}%`;
    } else {
      reasoning = `均値回帰条件不成立: RSI=${indicators.rsi.toFixed(1)}, 乖離=${(priceDeviation*100).toFixed(1)}%`;
    }
    
    return this.buildStrategyResult(
      signal,
      confidence,
      latest,
      indicators,
      'MEAN_REVERSION',
      reasoning,
      capital
    );
  }

  /**
   * 複合戦略
   * 複数の戦略を組み合わせてコンセンサスを取る
   */
  executeCompositeStrategy(
    data: OHLCV[],
    capital: number = 100000
  ): StrategyResult {
    // 各戦略を実行
    const trendResult = this.executeTrendFollowingStrategy(data, undefined, capital);
    const breakoutResult = this.executeBreakoutStrategy(data, capital);
    const meanRevResult = this.executeMeanReversionStrategy(data, capital);
    
    const results = [trendResult, breakoutResult, meanRevResult];
    
    // シグナルの集計
    const buySignals = results.filter(r => r.signal === 'BUY');
    const sellSignals = results.filter(r => r.signal === 'SELL');
    const holdSignals = results.filter(r => r.signal === 'HOLD');
    
    let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let finalConfidence = 0;
    let reasoning = '';
    
    // コンセンサスロジック
    if (buySignals.length >= 2) {
      finalSignal = 'BUY';
      finalConfidence = buySignals.reduce((sum, r) => sum + r.confidence, 0) / buySignals.length;
      reasoning = `複合買いシグナル: ${buySignals.length}/3の戦略が一致`;
    } else if (sellSignals.length >= 2) {
      finalSignal = 'SELL';
      finalConfidence = sellSignals.reduce((sum, r) => sum + r.confidence, 0) / sellSignals.length;
      reasoning = `複合売りシグナル: ${sellSignals.length}/3の戦略が一致`;
    } else if (buySignals.length === 1 && sellSignals.length === 0) {
      // 1つだけ買いシグナル
      finalSignal = 'BUY';
      finalConfidence = buySignals[0].confidence * 0.7; // 確信度を下げる
      reasoning = `弱い買いシグナル: トレンド戦略のみ`;
    } else if (sellSignals.length === 1 && buySignals.length === 0) {
      // 1つだけ売りシグナル
      finalSignal = 'SELL';
      finalConfidence = sellSignals[0].confidence * 0.7;
      reasoning = `弱い売りシグナル: ブレイクアウト戦略のみ`;
    } else {
      reasoning = `シグナル不統一: 買い=${buySignals.length}, 売り=${sellSignals.length}, 保留=${holdSignals.length}`;
    }
    
    // 最も確信度の高い結果をベースにするが、シグナルは統合したものを使用
    const baseResult = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    return {
      ...baseResult,
      signal: finalSignal,
      confidence: Math.round(finalConfidence),
      strategy: 'COMPOSITE',
      reasoning,
    };
  }

  /**
   * 特定の戦略を実行
   */
  executeStrategy(
    strategyType: StrategyType,
    data: OHLCV[],
    capital: number = 100000
  ): StrategyResult {
    switch (strategyType) {
      case 'TREND_FOLLOWING':
        return this.executeTrendFollowingStrategy(data, undefined, capital);
      case 'BREAKOUT':
        return this.executeBreakoutStrategy(data, capital);
      case 'MEAN_REVERSION':
        return this.executeMeanReversionStrategy(data, capital);
      case 'COMPOSITE':
        return this.executeCompositeStrategy(data, capital);
      case 'ADAPTIVE':
        return this.executeAdaptiveStrategy(data, '', capital);
      default:
        return this.executeCompositeStrategy(data, capital);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateIndicators(data: OHLCV[]): StrategyResult['indicators'] {
    const closes = data.map(d => d.close);
    const latest = data[data.length - 1];
    
    // RSI
    const rsi = technicalIndicatorService.calculateRSI(closes, this.config.rsiPeriod);
    
    // MACD
    const macd = technicalIndicatorService.calculateMACD(
      closes,
      this.config.macdFast,
      this.config.macdSlow,
      this.config.macdSignal
    );
    
    // SMA
    const sma20 = technicalIndicatorService.calculateSMA(closes, this.config.smaShortPeriod);
    const sma50 = technicalIndicatorService.calculateSMA(closes, this.config.smaMediumPeriod);
    
    // Bollinger Bands
    const bb = technicalIndicatorService.calculateBollingerBands(
      closes,
      this.config.bbPeriod,
      this.config.bbStdDev
    );
    
    // ATR
    const atr = this.calculateATR(data, this.config.atrPeriod);
    
    // ADX
    const adx = this.calculateADX(data, this.config.adxPeriod);
    
    return {
      rsi: rsi[rsi.length - 1] || 50,
      macd: macd.macd[macd.macd.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || latest.close,
      sma50: sma50[sma50.length - 1] || latest.close,
      bbUpper: bb.upper[bb.upper.length - 1] || latest.close * 1.02,
      bbLower: bb.lower[bb.lower.length - 1] || latest.close * 0.98,
      atr: atr[atr.length - 1] || latest.close * 0.02,
      adx: adx[adx.length - 1] || 20,
    };
  }

  private calculateATR(data: OHLCV[], period: number): number[] {
    const atr: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        atr.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const idx = i - j;
        const tr = Math.max(
          data[idx].high - data[idx].low,
          Math.abs(data[idx].high - data[idx - 1].close),
          Math.abs(data[idx].low - data[idx - 1].close)
        );
        sum += tr;
      }
      atr.push(sum / period);
    }
    
    return atr;
  }

  private calculateADX(data: OHLCV[], period: number): number[] {
    // 簡易ADX計算
    const adx: number[] = [];
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];
    const tr: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;
      
      dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
      dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      tr.push(Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      ));
    }
    
    // Smooth and calculate DX
    for (let i = period; i < dmPlus.length; i++) {
      const avgDMPlus = dmPlus.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgDMMinus = dmMinus.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgTR = tr.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      const diPlus = avgTR > 0 ? (avgDMPlus / avgTR) * 100 : 0;
      const diMinus = avgTR > 0 ? (avgDMMinus / avgTR) * 100 : 0;
      const dx = diPlus + diMinus > 0 ? (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100 : 0;
      
      adx.push(dx);
    }
    
    // Pad with NaN for alignment
    while (adx.length < data.length) {
      adx.unshift(NaN);
    }
    
    return adx;
  }

  private calculateAverageVolume(data: OHLCV[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.volume, 0) / data.length;
  }

  private calculateTrendConfidence(
    indicators: StrategyResult['indicators'],
    isUptrend: boolean,
    volumeConfirmed: boolean
  ): number {
    let confidence = 50;
    
    // ADXによるトレンド強度
    if (indicators.adx > 40) confidence += 20;
    else if (indicators.adx > 25) confidence += 10;
    
    // RSI位置
    if (isUptrend && indicators.rsi > 50 && indicators.rsi < 70) confidence += 10;
    if (!isUptrend && indicators.rsi < 50 && indicators.rsi > 30) confidence += 10;
    
    // ボリューム確認
    if (volumeConfirmed) confidence += 10;
    
    // MACD強度
    if (Math.abs(indicators.macd) > indicators.atr * 0.5) confidence += 10;
    
    return Math.min(95, confidence);
  }

  private buildStrategyResult(
    signal: 'BUY' | 'SELL' | 'HOLD',
    confidence: number,
    latest: OHLCV,
    indicators: StrategyResult['indicators'],
    strategy: StrategyType,
    reasoning: string,
    capital: number,
    levels?: { supportLevel?: number; resistanceLevel?: number }
  ): StrategyResult {
    // ストップロスと利確の計算 - R:R = 1:2に統一（損切3%、利確6%）
    const atr = indicators.atr;
    let stopLoss: number;
    let takeProfit: number;
    
    if (signal === 'BUY') {
      // 買いポジション: 損切は3%またはATR×2、利確は損切の2倍
      stopLoss = Math.max(latest.close * 0.97, latest.close - atr * this.config.atrMultiplier);
      takeProfit = latest.close + (latest.close - stopLoss) * this.config.minRiskRewardRatio;
    } else if (signal === 'SELL') {
      // 売りポジション: 損切は3%またはATR×2、利確は損切の2倍（買いと対称）
      stopLoss = Math.min(latest.close * 1.03, latest.close + atr * this.config.atrMultiplier);
      takeProfit = latest.close - (stopLoss - latest.close) * this.config.minRiskRewardRatio;
    } else {
      // HOLDの場合はデフォルト値
      stopLoss = latest.close - atr * this.config.atrMultiplier;
      takeProfit = latest.close + atr * this.config.atrMultiplier * this.config.minRiskRewardRatio;
    }
    
    // リスクリワード比
    const risk = Math.abs(latest.close - stopLoss);
    const reward = Math.abs(takeProfit - latest.close);
    const riskRewardRatio = risk > 0 ? reward / risk : 0;
    
    // ポジションサイズ計算（リスクベース）
    const riskAmount = capital * (this.config.maxRiskPerTrade / 100);
    const positionSize = risk > 0 ? Math.min(
      (riskAmount / risk) * latest.close / capital * 100,
      this.config.maxPositionSize
    ) : 0;
    
    // ボラティリティ計算
    const volatility = atr / latest.close;
    
    // ボリューム確認
    const volumeConfirmation = latest.volume > this.calculateAverageVolume([latest]) * this.config.volumeThreshold;
    
    return {
      signal,
      confidence,
      entryPrice: latest.close,
      stopLoss,
      takeProfit,
      positionSize: Math.round(positionSize * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      strategy,
      reasoning,
      indicators,
      metadata: {
        trendStrength: indicators.adx,
        volatility: Math.round(volatility * 10000) / 100,
        volumeConfirmation,
        supportLevel: levels?.supportLevel,
        resistanceLevel: levels?.resistanceLevel,
      },
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): StrategyConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const winningStrategyEngine = new WinningStrategyEngine();
export default WinningStrategyEngine;
