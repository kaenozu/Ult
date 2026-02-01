/**
 * WinRateMaximizer.ts
 * 
 * 株取引で勝つための最適化エンジン
 * 
 * 【機能】
 * - リアルタイムで勝率を最大化するための推奨を提供
 * - 過去のトレード履歴から最適なエントリー/エグジットタイミングを分析
 * - 信頼度に基づく最適なポジションサイズの提案
 * - 高勝率シナリオの市場条件検出とアラート
 */

import { OHLCV, Signal } from '@/app/types';
import { technicalIndicatorService } from '../TechnicalIndicatorService';

// ============================================================================
// Types
// ============================================================================

export interface WinRateOptimization {
  // 推奨アクション
  action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number; // 0-100
  expectedWinRate: number; // 0-100
  
  // 最適なエントリー/エグジット
  optimalEntry: {
    price: number;
    timing: 'IMMEDIATE' | 'WAIT_FOR_PULLBACK' | 'WAIT_FOR_BREAKOUT';
    waitCondition?: string;
    expectedDelay?: number; // minutes
  };
  
  optimalExit: {
    takeProfit: number;
    stopLoss: number;
    trailingStop: boolean;
    targetReached: boolean;
  };
  
  // ポジションサイズ最適化
  positionSizing: {
    recommended: number; // % of portfolio
    min: number;
    max: number;
    rationale: string;
  };
  
  // 市場条件マッチング
  marketConditions: {
    match: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
    similarPastScenarios: number;
    avgWinRateInSimilarScenarios: number;
    avgReturnInSimilarScenarios: number;
  };
  
  // リスク評価
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    probabilityOfLoss: number;
    expectedLoss: number;
    maxDrawdown: number;
  };
  
  // 推奨理由
  reasoning: string[];
  warnings: string[];
}

export interface TradeScenario {
  // シナリオ識別
  id: string;
  timestamp: string;
  
  // 市場条件
  marketConditions: {
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
    momentum: number;
  };
  
  // テクニカル指標
  indicators: {
    rsi: number;
    macd: number;
    adx: number;
    bbPosition: number; // -1 to 1 (below to above BB)
    smaAlignment: boolean; // 短期>長期
  };
  
  // 実績
  outcome: {
    action: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice: number;
    profit: number;
    profitPercent: number;
    holdingPeriod: number; // minutes
    won: boolean;
  };
}

export interface OptimizationConfig {
  // 学習データ設定
  minScenariosRequired: number;
  scenarioSimilarityThreshold: number; // 0-1
  
  // リスク管理
  maxRiskPerTrade: number; // %
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  
  // ポジションサイズ
  basePositionSize: number; // %
  maxPositionSize: number; // %
  confidenceScaling: boolean;
  
  // 勝率しきい値
  minWinRateForTrade: number; // %
  minConfidenceForTrade: number; // %
  
  // タイミング最適化
  enableTimingOptimization: boolean;
  waitForBetterEntryMaxMinutes: number;
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  minScenariosRequired: 10,
  scenarioSimilarityThreshold: 0.7,
  
  maxRiskPerTrade: 2,
  defaultStopLossPercent: 2,
  defaultTakeProfitPercent: 6,
  
  basePositionSize: 10,
  maxPositionSize: 25,
  confidenceScaling: true,
  
  minWinRateForTrade: 55,
  minConfidenceForTrade: 60,
  
  enableTimingOptimization: true,
  waitForBetterEntryMaxMinutes: 60,
};

// ============================================================================
// Win Rate Maximizer
// ============================================================================

export class WinRateMaximizer {
  private config: OptimizationConfig;
  private scenarios: TradeScenario[] = [];
  
  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
  }
  
  /**
   * 過去のトレードシナリオを学習
   */
  learnFromHistory(scenarios: TradeScenario[]): void {
    this.scenarios = scenarios;
    console.log(`[WinRateMaximizer] Learned from ${scenarios.length} historical scenarios`);
  }
  
  /**
   * 現在の市場状況に基づいて最適な取引を推奨
   */
  optimize(
    currentData: OHLCV[],
    symbol: string,
    portfolioValue: number
  ): WinRateOptimization {
    // 現在の市場条件を分析
    const currentConditions = this.analyzeCurrentConditions(currentData);
    
    // 類似シナリオを検索
    const similarScenarios = this.findSimilarScenarios(currentConditions);
    
    // 勝率を計算
    const winRate = this.calculateWinRate(similarScenarios);
    
    // アクションを決定
    const action = this.determineAction(winRate, currentConditions, similarScenarios);
    
    // 最適なエントリーを計算
    const optimalEntry = this.calculateOptimalEntry(currentData, similarScenarios);
    
    // 最適なエグジットを計算
    const optimalExit = this.calculateOptimalExit(currentData, similarScenarios);
    
    // ポジションサイズを最適化
    const positionSizing = this.optimizePositionSize(winRate, portfolioValue);
    
    // リスクを評価
    const risk = this.assessRisk(similarScenarios, currentData);
    
    // 推奨理由を生成
    const reasoning = this.generateReasoning(
      action,
      winRate,
      similarScenarios,
      currentConditions
    );
    
    // 警告を生成
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
  
  /**
   * トレンド強度を計算（ADXの代替）
   */
  private calculateTrendStrength(closes: number[]): number {
    if (closes.length < 20) return 0;
    
    // 最近20本のローソク足でのトレンド強度を計算
    const recent = closes.slice(-20);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = ((last - first) / first) * 100;
    
    // 変動性を考慮
    let sumSquaredDiff = 0;
    for (let i = 1; i < recent.length; i++) {
      const diff = recent[i] - recent[i - 1];
      sumSquaredDiff += diff * diff;
    }
    const volatility = Math.sqrt(sumSquaredDiff / (recent.length - 1));
    
    // トレンド強度 = 変化率の絶対値 / ボラティリティ
    // 0-100のスケールに正規化
    const strength = Math.abs(change) / (volatility / first * 100);
    return Math.min(100, strength * 10);
  }

  /**
   * 現在の市場条件を分析
   */
  private analyzeCurrentConditions(data: OHLCV[]): TradeScenario['marketConditions'] & TradeScenario['indicators'] {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    // テクニカル指標を計算
    const rsi = technicalIndicatorService.calculateRSI(closes, 14);
    const macd = technicalIndicatorService.calculateMACD(closes);
    // トレンド強度を計算（ADXの代替）
    const trendStrength = this.calculateTrendStrength(closes);
    const bb = technicalIndicatorService.calculateBollingerBands(closes, 20, 2);
    const sma20 = technicalIndicatorService.calculateSMA(closes, 20);
    const sma50 = technicalIndicatorService.calculateSMA(closes, 50);
    
    const currentPrice = closes[closes.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    // トレンド判定
    const trend = sma20 > sma50 ? 'UP' : sma20 < sma50 ? 'DOWN' : 'SIDEWAYS';
    
    // ボラティリティ判定
    const priceRange = Math.max(...closes) - Math.min(...closes);
    const volatility = priceRange / currentPrice > 0.05 ? 'HIGH' : priceRange / currentPrice > 0.02 ? 'MEDIUM' : 'LOW';
    
    // ボリューム判定
    const volume = currentVolume > avgVolume * 1.5 ? 'HIGH' : currentVolume > avgVolume * 0.8 ? 'MEDIUM' : 'LOW';
    
    // モメンタム計算
    const momentum = ((currentPrice - closes[Math.max(0, closes.length - 20)]) / closes[Math.max(0, closes.length - 20)]) * 100;
    
    // ボリンジャーバンド位置
    const bbUpper = bb.upper[bb.upper.length - 1];
    const bbLower = bb.lower[bb.lower.length - 1];
    const bbPosition = (currentPrice - bbLower) / (bbUpper - bbLower) * 2 - 1;
    
    // SMA配置
    const smaAlignment = sma20 > sma50;
    
    return {
      trend,
      volatility,
      volume,
      momentum,
      rsi: rsi[rsi.length - 1] || 50, // 最新のRSI値
      macd: macd.histogram[macd.histogram.length - 1] || 0,
      adx: trendStrength,
      bbPosition,
      smaAlignment,
    };
  }
  
  /**
   * 類似シナリオを検索
   */
  private findSimilarScenarios(
    currentConditions: ReturnType<typeof this.analyzeCurrentConditions>
  ): TradeScenario[] {
    if (this.scenarios.length < this.config.minScenariosRequired) {
      return [];
    }
    
    return this.scenarios.filter(scenario => {
      // 市場条件の類似度を計算
      let similarity = 0;
      let totalWeight = 0;
      
      // トレンド一致 (重み: 0.3)
      if (scenario.marketConditions.trend === currentConditions.trend) {
        similarity += 0.3;
      }
      totalWeight += 0.3;
      
      // RSI類似度 (重み: 0.2)
      const rsiDiff = Math.abs(scenario.indicators.rsi - currentConditions.rsi);
      similarity += (1 - rsiDiff / 100) * 0.2;
      totalWeight += 0.2;
      
      // MACD類似度 (重み: 0.15)
      const macdDiff = Math.abs(scenario.indicators.macd - currentConditions.macd);
      const macdSimilarity = Math.max(0, 1 - macdDiff / 10);
      similarity += macdSimilarity * 0.15;
      totalWeight += 0.15;
      
      // ADX類似度 (重み: 0.15)
      const adxDiff = Math.abs(scenario.indicators.adx - currentConditions.adx);
      similarity += (1 - adxDiff / 100) * 0.15;
      totalWeight += 0.15;
      
      // ボラティリティ一致 (重み: 0.1)
      if (scenario.marketConditions.volatility === currentConditions.volatility) {
        similarity += 0.1;
      }
      totalWeight += 0.1;
      
      // ボリューム一致 (重み: 0.1)
      if (scenario.marketConditions.volume === currentConditions.volume) {
        similarity += 0.1;
      }
      totalWeight += 0.1;
      
      const normalizedSimilarity = similarity / totalWeight;
      return normalizedSimilarity >= this.config.scenarioSimilarityThreshold;
    });
  }
  
  /**
   * 勝率を計算
   */
  private calculateWinRate(scenarios: TradeScenario[]): number {
    if (scenarios.length === 0) return 50; // デフォルト50%
    
    const wins = scenarios.filter(s => s.outcome.won).length;
    return (wins / scenarios.length) * 100;
  }
  
  /**
   * アクションを決定
   */
  private determineAction(
    winRate: number,
    conditions: ReturnType<typeof this.analyzeCurrentConditions>,
    scenarios: TradeScenario[]
  ): 'BUY' | 'SELL' | 'HOLD' | 'WAIT' {
    // 十分なデータがない場合
    if (scenarios.length < this.config.minScenariosRequired) {
      return 'WAIT';
    }
    
    // 勝率が低すぎる場合
    if (winRate < this.config.minWinRateForTrade) {
      return 'HOLD';
    }
    
    // トレンドとRSIに基づいて判定
    if (conditions.trend === 'UP' && conditions.rsi < 70 && conditions.smaAlignment) {
      return 'BUY';
    }
    
    if (conditions.trend === 'DOWN' && conditions.rsi > 30) {
      return 'SELL';
    }
    
    // 過去のシナリオで最も多かったアクション
    const buyCount = scenarios.filter(s => s.outcome.action === 'BUY').length;
    const sellCount = scenarios.filter(s => s.outcome.action === 'SELL').length;
    
    if (buyCount > sellCount && winRate >= this.config.minWinRateForTrade) {
      return 'BUY';
    } else if (sellCount > buyCount && winRate >= this.config.minWinRateForTrade) {
      return 'SELL';
    }
    
    return 'HOLD';
  }
  
  /**
   * 最適なエントリーを計算
   */
  private calculateOptimalEntry(
    data: OHLCV[],
    scenarios: TradeScenario[]
  ): WinRateOptimization['optimalEntry'] {
    const currentPrice = data[data.length - 1].close;
    
    if (scenarios.length === 0) {
      return {
        price: currentPrice,
        timing: 'IMMEDIATE',
      };
    }
    
    // 過去の成功トレードの平均エントリー価格を分析
    const successfulScenarios = scenarios.filter(s => s.outcome.won);
    
    if (successfulScenarios.length === 0) {
      return {
        price: currentPrice,
        timing: 'WAIT_FOR_PULLBACK',
        waitCondition: '勝率の高いシナリオが出現するまで待機',
      };
    }
    
    // エントリータイミングの分析
    const avgEntryRSI = successfulScenarios.reduce((sum, s) => sum + s.indicators.rsi, 0) / successfulScenarios.length;
    const closes = data.map(d => d.close);
    const currentRSIArray = technicalIndicatorService.calculateRSI(closes, 14);
    const currentRSI = currentRSIArray[currentRSIArray.length - 1] || 50;
    
    // RSIが最適範囲内か判定
    const rsiDiff = Math.abs(currentRSI - avgEntryRSI);
    
    if (rsiDiff < 5) {
      return {
        price: currentPrice,
        timing: 'IMMEDIATE',
      };
    } else if (currentRSI < avgEntryRSI) {
      return {
        price: currentPrice * 0.98, // 2%下で待つ
        timing: 'WAIT_FOR_PULLBACK',
        waitCondition: `RSIが${avgEntryRSI.toFixed(1)}付近になるまで待機`,
        expectedDelay: 15,
      };
    } else {
      return {
        price: currentPrice * 1.02, // 2%上で待つ
        timing: 'WAIT_FOR_BREAKOUT',
        waitCondition: `ブレイクアウトを待機`,
        expectedDelay: 30,
      };
    }
  }
  
  /**
   * 最適なエグジットを計算
   */
  private calculateOptimalExit(
    data: OHLCV[],
    scenarios: TradeScenario[]
  ): WinRateOptimization['optimalExit'] {
    const currentPrice = data[data.length - 1].close;
    
    if (scenarios.length === 0) {
      return {
        takeProfit: currentPrice * (1 + this.config.defaultTakeProfitPercent / 100),
        stopLoss: currentPrice * (1 - this.config.defaultStopLossPercent / 100),
        trailingStop: false,
        targetReached: false,
      };
    }
    
    // 成功トレードの平均利益率を計算
    const successfulScenarios = scenarios.filter(s => s.outcome.won);
    const avgProfit = successfulScenarios.length > 0
      ? successfulScenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / successfulScenarios.length
      : this.config.defaultTakeProfitPercent;
    
    // 失敗トレードの平均損失率を計算
    const failedScenarios = scenarios.filter(s => !s.outcome.won);
    const avgLoss = failedScenarios.length > 0
      ? Math.abs(failedScenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / failedScenarios.length)
      : this.config.defaultStopLossPercent;
    
    return {
      takeProfit: currentPrice * (1 + Math.max(avgProfit, this.config.defaultTakeProfitPercent) / 100),
      stopLoss: currentPrice * (1 - Math.min(avgLoss, this.config.defaultStopLossPercent * 2) / 100),
      trailingStop: avgProfit > 5, // 5%以上の利益が期待できる場合はトレーリングストップ
      targetReached: false,
    };
  }
  
  /**
   * ポジションサイズを最適化
   */
  private optimizePositionSize(
    winRate: number,
    portfolioValue: number
  ): WinRateOptimization['positionSizing'] {
    // ケリー基準を使用してポジションサイズを計算
    // Kelly% = W - (1-W)/R
    // W = 勝率, R = 平均勝ち/平均負け比率
    
    const W = winRate / 100;
    const R = 2.0; // デフォルトのリスクリワード比率
    const kellyPercent = W - ((1 - W) / R);
    
    // ケリー基準は攻撃的すぎるので、ハーフケリーを使用
    const halfKelly = kellyPercent / 2;
    
    // 最小・最大の範囲内に制限
    let recommended = Math.max(
      this.config.basePositionSize,
      Math.min(halfKelly * 100, this.config.maxPositionSize)
    );
    
    // 信頼度スケーリング
    if (this.config.confidenceScaling) {
      const confidenceFactor = winRate / 100;
      recommended *= confidenceFactor;
    }
    
    const rationale = `勝率${winRate.toFixed(1)}%に基づき、ケリー基準（ハーフ）で算出`;
    
    return {
      recommended: Math.round(recommended * 10) / 10,
      min: this.config.basePositionSize,
      max: this.config.maxPositionSize,
      rationale,
    };
  }
  
  /**
   * リスクを評価
   */
  private assessRisk(
    scenarios: TradeScenario[],
    data: OHLCV[]
  ): WinRateOptimization['risk'] {
    if (scenarios.length === 0) {
      return {
        level: 'MEDIUM',
        probabilityOfLoss: 50,
        expectedLoss: 2,
        maxDrawdown: 5,
      };
    }
    
    // 損失確率
    const losers = scenarios.filter(s => !s.outcome.won);
    const probabilityOfLoss = (losers.length / scenarios.length) * 100;
    
    // 平均損失
    const avgLoss = losers.length > 0
      ? Math.abs(losers.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / losers.length)
      : this.config.defaultStopLossPercent;
    
    // 最大ドローダウン
    const maxDrawdown = Math.max(
      ...scenarios.map(s => Math.abs(Math.min(0, s.outcome.profitPercent)))
    );
    
    // リスクレベル判定
    let level: 'LOW' | 'MEDIUM' | 'HIGH';
    if (probabilityOfLoss < 30 && avgLoss < 2) {
      level = 'LOW';
    } else if (probabilityOfLoss < 50 && avgLoss < 4) {
      level = 'MEDIUM';
    } else {
      level = 'HIGH';
    }
    
    return {
      level,
      probabilityOfLoss,
      expectedLoss: avgLoss,
      maxDrawdown,
    };
  }
  
  /**
   * 信頼度を計算
   */
  private calculateConfidence(scenarios: TradeScenario[], winRate: number): number {
    // データ量に基づく信頼度
    const dataConfidence = Math.min(scenarios.length / 50, 1) * 30; // 最大30点
    
    // 勝率に基づく信頼度
    const winRateConfidence = Math.min(winRate / 100, 1) * 50; // 最大50点
    
    // 一貫性に基づく信頼度
    const consistency = this.calculateConsistency(scenarios);
    const consistencyConfidence = consistency * 20; // 最大20点
    
    return Math.round(dataConfidence + winRateConfidence + consistencyConfidence);
  }
  
  /**
   * 一貫性を計算
   */
  private calculateConsistency(scenarios: TradeScenario[]): number {
    if (scenarios.length < 2) return 0;
    
    const returns = scenarios.map(s => s.outcome.profitPercent);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // 標準偏差が小さいほど一貫性が高い
    return Math.max(0, 1 - stdDev / 10);
  }
  
  /**
   * 市場マッチを評価
   */
  private assessMarketMatch(scenarioCount: number, winRate: number): 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' {
    if (scenarioCount >= 20 && winRate >= 70) return 'EXCELLENT';
    if (scenarioCount >= 10 && winRate >= 60) return 'GOOD';
    if (scenarioCount >= 5 && winRate >= 50) return 'AVERAGE';
    return 'POOR';
  }
  
  /**
   * 平均リターンを計算
   */
  private calculateAvgReturn(scenarios: TradeScenario[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, s) => sum + s.outcome.profitPercent, 0) / scenarios.length;
  }
  
  /**
   * 推奨理由を生成
   */
  private generateReasoning(
    action: string,
    winRate: number,
    scenarios: TradeScenario[],
    conditions: ReturnType<typeof this.analyzeCurrentConditions>
  ): string[] {
    const reasons: string[] = [];
    
    if (scenarios.length >= this.config.minScenariosRequired) {
      reasons.push(`過去に${scenarios.length}件の類似シナリオを検出（勝率${winRate.toFixed(1)}%）`);
    } else {
      reasons.push(`類似シナリオが不足（${scenarios.length}件）のため、慎重な判断を推奨`);
    }
    
    if (conditions.trend === 'UP' && action === 'BUY') {
      reasons.push('上昇トレンドを確認、買いシグナル');
    } else if (conditions.trend === 'DOWN' && action === 'SELL') {
      reasons.push('下降トレンドを確認、売りシグナル');
    }
    
    if (conditions.rsi < 30) {
      reasons.push('RSIが売られすぎ水準、反発の可能性');
    } else if (conditions.rsi > 70) {
      reasons.push('RSIが買われすぎ水準、調整の可能性');
    }
    
    if (conditions.volume === 'HIGH') {
      reasons.push('出来高が高水準、トレンドの信頼性が高い');
    }
    
    if (conditions.adx > 25) {
      reasons.push(`トレンド強度=${conditions.adx.toFixed(1)}、強いトレンドを確認`);
    }
    
    return reasons;
  }
  
  /**
   * 警告を生成
   */
  private generateWarnings(
    risk: WinRateOptimization['risk'],
    winRate: number,
    scenarios: TradeScenario[]
  ): string[] {
    const warnings: string[] = [];
    
    if (risk.level === 'HIGH') {
      warnings.push('⚠️ 高リスク: 損失の可能性が高い');
    }
    
    if (winRate < this.config.minWinRateForTrade) {
      warnings.push(`⚠️ 低勝率: ${winRate.toFixed(1)}%（推奨${this.config.minWinRateForTrade}%以上）`);
    }
    
    if (scenarios.length < this.config.minScenariosRequired) {
      warnings.push('⚠️ データ不足: 判断材料が不十分');
    }
    
    if (risk.maxDrawdown > 10) {
      warnings.push(`⚠️ 大きなドローダウンリスク: 最大${risk.maxDrawdown.toFixed(1)}%`);
    }
    
    return warnings;
  }
  
  /**
   * 現在の最適化状態を取得
   */
  getOptimizationStats(): {
    totalScenarios: number;
    avgWinRate: number;
  } {
    if (this.scenarios.length === 0) {
      return {
        totalScenarios: 0,
        avgWinRate: 0,
      };
    }
    
    const wins = this.scenarios.filter(s => s.outcome.won).length;
    const avgWinRate = (wins / this.scenarios.length) * 100;
    
    return {
      totalScenarios: this.scenarios.length,
      avgWinRate,
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export const winRateMaximizer = new WinRateMaximizer();
