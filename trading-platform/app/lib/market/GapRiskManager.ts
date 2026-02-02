/**
 * GapRiskManager.ts
 * 
 * ギャップリスク（窓空きリスク）を管理するためのモジュール。
 * 前営業日終値と当日始値の乖離を分析し、適切な損切りラインを提案します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * ギャップリスク評価設定
 */
export interface GapRiskConfig {
  /** 高リスクと判定するギャップ率（%） */
  highGapPercent: number;
  /** 中リスクと判定するギャップ率（%） */
  mediumGapPercent: number;
  /** 典型的なギャップ率（%） */
  typicalGapPercent: number;
  /** 適応的損切りライン計算の基準損切り率（%） */
  baseStopLossPercent: number;
  /** ギャップ調整の最大係数 */
  maxGapAdjustment: number;
  /** 分析に使用する過去データ数 */
  lookbackPeriod: number;
  /** ギャップ標準偏差の閾値 */
  gapStdDevThreshold: number;
}

/**
 * ギャップリスク評価結果
 */
export interface GapRiskAssessment {
  /** シンボル */
  symbol: string;
  /** ギャップ率（%） */
  gapPercent: number;
  /** ギャップ方向（UP/DOWN） */
  gapDirection: 'UP' | 'DOWN';
  /** 典型的なギャップ率（%） */
  typicalGap: number;
  /** ギャップの標準偏差 */
  gapStdDev: number;
  /** ギャップの偏差（σ単位） */
  gapDeviation: number;
  /** リスクレベル */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 推奨損切り価格 */
  recommendedStopLoss: number;
  /** 推奨利益確定価格 */
  recommendedTakeProfit: number;
  /** リスク・リターン比率 */
  riskRewardRatio: number;
  /** ポジションサイズ調整率（0-1） */
  positionSizeAdjustment: number;
  /** 推奨アクション */
  recommendedAction: 'REDUCE_SIZE' | 'HOLD' | 'CLOSE' | 'AVOID';
  /** 詳細メッセージ */
  message: string;
  /** メタデータ */
  metadata: {
    previousClose: number;
    currentOpen: number;
    highGapPercent: number;
    mediumGapPercent: number;
    atr: number;
    atrPercent: number;
  };
}

/**
 * ギャップ統計
 */
export interface GapStatistics {
  symbol: string;
  avgGapPercent: number;
  stdDevGapPercent: number;
  maxGapPercent: number;
  minGapPercent: number;
  upGapCount: number;
  downGapCount: number;
  gapFrequency: number;
  avgGapByDayOfWeek: Map<number, number>; // 0-6 (Sunday-Saturday)
}

/**
 * 適応的損切り設定
 */
export interface AdaptiveStopLossSettings {
  /** 基本的な損切り率（%） */
  baseStopLossPercent: number;
  /** ギャップに基づく追加調整 */
  gapAdjustmentEnabled: boolean;
  /** ATRベースの損切り */
  atrBasedEnabled: boolean;
  /** ATR乗数 */
  atrMultiplier: number;
  /** トレーリング損切りを有効にするか */
  trailingStopEnabled: boolean;
  /** トレーリング損切りの開始利益率（%） */
  trailingStartPercent: number;
  /** トレーリング損切りの距離（%） */
  trailDistancePercent: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: GapRiskConfig = {
  highGapPercent: 5,
  mediumGapPercent: 2,
  typicalGapPercent: 0.5,
  baseStopLossPercent: 2,
  maxGapAdjustment: 0.05,
  lookbackPeriod: 252,
  gapStdDevThreshold: 2,
};

// ============================================================================
// GapRiskManager Class
// ============================================================================

export class GapRiskManager extends EventEmitter {
  private config: GapRiskConfig;
  private historicalGaps: Map<string, number[]> = new Map();
  private gapStatistics: Map<string, GapStatistics> = new Map();

  constructor(config: Partial<GapRiskConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ギャップリスクを評価
   */
  assessGapRisk(
    symbol: string,
    currentOHLCV: OHLCV,
    previousClose: number,
    atr: number = 0
  ): GapRiskAssessment {
    const gapPercent = this.calculateGapPercent(previousClose, currentOHLCV.open);
    const gapDirection = gapPercent >= 0 ? 'UP' : 'DOWN';

    // 歴史的ギャップ統計を取得
    const stats = this.getHistoricalGapStats(symbol);
    const typicalGap = stats?.avgGapPercent || this.config.typicalGapPercent;
    const gapStdDev = stats?.stdDevGapPercent || (typicalGap * 0.5);

    // ギャップの偏差を計算
    const gapDeviation = gapStdDev > 0 
      ? (Math.abs(gapPercent) - typicalGap) / gapStdDev 
      : 0;

    // リスクレベルを判定
    const riskLevel = this.determineRiskLevel(gapPercent);

    // 適応的損切り価格を計算
    const adaptiveStopLoss = this.calculateAdaptiveStopLoss(
      currentOHLCV.open,
      gapPercent,
      atr
    );

    // 推奨アクションを決定
    const recommendedAction = this.determineAction(gapPercent, riskLevel);

    // ポジションサイズ調整率を計算
    const positionSizeAdjustment = this.calculatePositionSizeAdjustment(
      gapPercent,
      riskLevel
    );

    // リスク・リターン比率を計算
    const riskRewardRatio = this.calculateRiskRewardRatio(
      currentOHLCV,
      adaptiveStopLoss.stopLoss
    );

    const message = this.generateMessage(
      symbol,
      gapPercent,
      gapDirection,
      riskLevel,
      adaptiveStopLoss.stopLoss
    );

    return {
      symbol,
      gapPercent,
      gapDirection,
      typicalGap,
      gapStdDev,
      gapDeviation,
      riskLevel,
      recommendedStopLoss: adaptiveStopLoss.stopLoss,
      recommendedTakeProfit: adaptiveStopLoss.takeProfit,
      riskRewardRatio,
      positionSizeAdjustment,
      recommendedAction,
      message,
      metadata: {
        previousClose,
        currentOpen: currentOHLCV.open,
        highGapPercent: this.config.highGapPercent,
        mediumGapPercent: this.config.mediumGapPercent,
        atr,
        atrPercent: atr > 0 ? (atr / currentOHLCV.open) * 100 : 0,
      },
    };
  }

  /**
   * 適応的損切り価格を計算
   */
  calculateAdaptiveStopLoss(
    openPrice: number,
    gapPercent: number,
    atr: number = 0
  ): { stopLoss: number; takeProfit: number } {
    const baseStop = this.config.baseStopLossPercent / 100;
    let gapAdjustment = 0;

    if (gapPercent > 0) {
      // ギャップアップの場合、上方向への損切りラインを調整
      gapAdjustment = Math.min(Math.abs(gapPercent) / 100, this.config.maxGapAdjustment);
    } else if (gapPercent < 0) {
      // ギャップダウンの場合、下方向への損切りラインを調整
      // ギャップサイズに応じて損切りラインをさらに下げる
      gapAdjustment = Math.min(Math.abs(gapPercent) / 100 * 1.5, this.config.maxGapAdjustment * 1.5);
    }

    // 基本損切りライン
    let stopLoss: number;
    if (gapPercent >= 0) {
      // ギャップアップ: 買いポジションはopen價で逆指値
      stopLoss = openPrice * (1 - baseStop - gapAdjustment);
    } else {
      // ギャップダウン: 売りポジションはopen價で逆指値
      stopLoss = openPrice * (1 + baseStop + gapAdjustment);
    }

    // ATRベースの調整
    if (atr > 0 && atr > openPrice * baseStop) {
      if (gapPercent >= 0) {
        stopLoss = Math.min(stopLoss, openPrice - atr * this.config.maxGapAdjustment);
      } else {
        stopLoss = Math.max(stopLoss, openPrice + atr * this.config.maxGapAdjustment);
      }
    }

    // 利益確定ライン（リスク・リターン比2:1）
    const takeProfit = gapPercent >= 0 
      ? openPrice * (1 + (baseStop + gapAdjustment) * 2)
      : openPrice * (1 - (baseStop + gapAdjustment) * 2);

    return { stopLoss, takeProfit };
  }

  /**
   * 適応的損切り設定を取得
   */
  getAdaptiveStopLossSettings(
    gapRisk: GapRiskAssessment,
    settings?: Partial<AdaptiveStopLossSettings>
  ): AdaptiveStopLossSettings {
    const defaultSettings: AdaptiveStopLossSettings = {
      baseStopLossPercent: this.config.baseStopLossPercent,
      gapAdjustmentEnabled: true,
      atrBasedEnabled: true,
      atrMultiplier: 1.5,
      trailingStopEnabled: false,
      trailingStartPercent: 5,
      trailDistancePercent: 3,
    };

    return { ...defaultSettings, ...settings };
  }

  /**
   * ギャップ統計を更新
   */
  updateGapStatistics(symbol: string, gapPercent: number): void {
    const history = this.historicalGaps.get(symbol) || [];
    history.push(gapPercent);

    // 指定された期間のみ保持
    if (history.length > this.config.lookbackPeriod) {
      history.shift();
    }

    this.historicalGaps.set(symbol, history);

    // 統計を更新
    this.recalculateStatistics(symbol);
  }

  /**
   * 複数のシンボルに対してギャップリスクを評価
   */
  assessMultipleSymbols(
    assessments: Array<{
      symbol: string;
      currentOHLCV: OHLCV;
      previousClose: number;
      atr?: number;
    }>
  ): GapRiskAssessment[] {
    return assessments.map(a => 
      this.assessGapRisk(a.symbol, a.currentOHLCV, a.previousClose, a.atr)
    );
  }

  /**
   * ポートフォリオ全体のギャップリスクを評価
   */
  assessPortfolioGapRisk(
    positions: Array<{
      symbol: string;
      side: 'LONG' | 'SHORT';
      entryPrice: number;
      quantity: number;
      currentOHLCV: OHLCV;
      previousClose: number;
      atr?: number;
    }>
  ): {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assessments: GapRiskAssessment[];
    totalPositionSize: number;
    adjustedPositionSize: number;
    recommendedActions: string[];
  } {
    const assessments = positions.map(p => {
      const assessment = this.assessGapRisk(
        p.symbol,
        p.currentOHLCV,
        p.previousClose,
        p.atr
      );
      
      // ポジションタイプに応じて損切りを調整
      if (p.side === 'SHORT') {
        assessment.recommendedStopLoss = this.calculateShortStopLoss(
          p.currentOHLCV.open,
          assessment.gapPercent,
          this.config.baseStopLossPercent / 100
        );
      }
      
      return assessment;
    });

    // 全体リスクを評価
    const riskScores = assessments.map(a => {
      switch (a.riskLevel) {
        case 'CRITICAL': return 4;
        case 'HIGH': return 3;
        case 'MEDIUM': return 2;
        default: return 1;
      }
    });

    const avgRiskScore = riskScores.reduce((sum, s) => sum + s, 0) / riskScores.length;
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (avgRiskScore >= 3.5) overallRisk = 'CRITICAL';
    else if (avgRiskScore >= 2.5) overallRisk = 'HIGH';
    else if (avgRiskScore >= 1.5) overallRisk = 'MEDIUM';
    else overallRisk = 'LOW';

    // ポジションサイズの計算
    const totalPositionSize = positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);
    const adjustedPositionSize = positions.reduce((sum, p, i) => {
      return sum + p.entryPrice * p.quantity * assessments[i].positionSizeAdjustment;
    }, 0);

    // 推奨アクションを収集
    const recommendedActions = assessments
      .filter(a => a.recommendedAction !== 'HOLD')
      .map(a => `${a.symbol}: ${a.recommendedAction} - ${a.message}`);

    return {
      overallRisk,
      assessments,
      totalPositionSize,
      adjustedPositionSize,
      recommendedActions,
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<GapRiskConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * ギャップ統計を取得
   */
  getGapStatistics(symbol: string): GapStatistics | null {
    return this.gapStatistics.get(symbol) || null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * ギャップ率を計算
   */
  private calculateGapPercent(previousClose: number, currentOpen: number): number {
    if (previousClose === 0) return 0;
    return ((currentOpen - previousClose) / previousClose) * 100;
  }

  /**
   * リスクレベルを決定
   */
  private determineRiskLevel(gapPercent: number): GapRiskAssessment['riskLevel'] {
    const absGap = Math.abs(gapPercent);
    
    if (absGap >= this.config.highGapPercent) return 'CRITICAL';
    if (absGap >= this.config.highGapPercent * 0.75) return 'HIGH';
    if (absGap >= this.config.mediumGapPercent) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 推奨アクションを決定
   */
  private determineAction(
    gapPercent: number,
    riskLevel: GapRiskAssessment['riskLevel']
  ): GapRiskAssessment['recommendedAction'] {
    const absGap = Math.abs(gapPercent);
    
    // 大きなギャップダウンはポジション_CLOSE
    if (gapPercent <= -this.config.highGapPercent) {
      return 'CLOSE';
    }
    
    // 大きなギャップアップは新規参入を避ける
    if (gapPercent >= this.config.highGapPercent) {
      return 'AVOID';
    }
    
    switch (riskLevel) {
      case 'CRITICAL':
        return 'CLOSE';
      case 'HIGH':
        return 'REDUCE_SIZE';
      case 'MEDIUM':
        return 'REDUCE_SIZE';
      default:
        return 'HOLD';
    }
  }

  /**
   * ポジションサイズ調整率を計算
   */
  private calculatePositionSizeAdjustment(
    gapPercent: number,
    riskLevel: GapRiskAssessment['riskLevel']
  ): number {
    const absGap = Math.abs(gapPercent);
    
    // ギャップ率に応じた調整
    let adjustment = 1.0;
    
    if (absGap >= this.config.highGapPercent) {
      adjustment = 0.25;
    } else if (absGap >= this.config.highGapPercent * 0.75) {
      adjustment = 0.5;
    } else if (absGap >= this.config.mediumGapPercent) {
      adjustment = 0.75;
    }
    
    return Math.max(adjustment, 0.1);
  }

  /**
   * リスク・リターン比率を計算
   */
  private calculateRiskRewardRatio(
    ohlcv: OHLCV,
    stopLoss: number
  ): number {
    const absDifference = Math.abs(ohlcv.close - stopLoss);
    if (absDifference === 0) return 0;

    // 利益確定距離を損切り距離の2倍と仮定
    const takeProfitDistance = absDifference * 2;
    
    return takeProfitDistance / absDifference;
  }

  /**
   * 売りポジションの損切り価格を計算
   */
  private calculateShortStopLoss(
    openPrice: number,
    gapPercent: number,
    baseStopPercent: number
  ): number {
    let gapAdjustment = 0;
    
    if (gapPercent < 0) {
      // ギャップダウン: 売りポジションは利益が出るが、巻き返しのリスク
      gapAdjustment = Math.min(Math.abs(gapPercent) / 100 * 0.5, this.config.maxGapAdjustment * 0.5);
    } else if (gapPercent > 0) {
      // ギャップアップ: 売りポジションは損失、リスク увеличивается
      gapAdjustment = Math.min(gapPercent / 100 * 1.5, this.config.maxGapAdjustment * 1.5);
    }
    
    return openPrice * (1 + baseStopPercent + gapAdjustment);
  }

  /**
   * メッセージ生成
   */
  private generateMessage(
    symbol: string,
    gapPercent: number,
    gapDirection: 'UP' | 'DOWN',
    riskLevel: GapRiskAssessment['riskLevel'],
    stopLoss: number
  ): string {
    const gapStr = `${gapDirection === 'UP' ? '+' : ''}${gapPercent.toFixed(2)}%`;
    const riskEmoji = {
      'LOW': '🟢',
      'MEDIUM': '🟡',
      'HIGH': '🟠',
      'CRITICAL': '🔴',
    }[riskLevel];

    return `${riskEmoji} ${symbol}: Gap ${gapStr}, Risk: ${riskLevel}, Stop Loss: ${stopLoss.toFixed(2)}`;
  }

  /**
   * 歴史的ギャップ統計を取得
   */
  private getHistoricalGapStats(symbol: string): GapStatistics | null {
    return this.gapStatistics.get(symbol) || null;
  }

  /**
   * 統計を再計算
   */
  private recalculateStatistics(symbol: string): void {
    const history = this.historicalGaps.get(symbol);
    if (!history || history.length < 2) return;

    const gaps = history.filter(g => !isNaN(g) && isFinite(g));
    if (gaps.length === 0) return;

    const sum = gaps.reduce((a, b) => a + b, 0);
    const avg = sum / gaps.length;
    
    const squaredDiffs = gaps.map(g => Math.pow(g - avg, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / gaps.length);
    
    const stats: GapStatistics = {
      symbol,
      avgGapPercent: avg,
      stdDevGapPercent: stdDev,
      maxGapPercent: Math.max(...gaps),
      minGapPercent: Math.min(...gaps),
      upGapCount: gaps.filter(g => g > 0).length,
      downGapCount: gaps.filter(g => g < 0).length,
      gapFrequency: gaps.filter(g => Math.abs(g) >= this.config.mediumGapPercent).length / gaps.length,
      avgGapByDayOfWeek: new Map(),
    };

    this.gapStatistics.set(symbol, stats);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const gapRiskManager = new GapRiskManager();
