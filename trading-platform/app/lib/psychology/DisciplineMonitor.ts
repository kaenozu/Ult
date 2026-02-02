/**
 * Discipline Monitor
 *
 * TRADING-029: トレード心理学分析
 * ルール違反の検出、過去取引からの学習
 */

import { JournalEntry } from '@/app/types';

export interface RuleViolation {
  id: string;
  type: 'no_plan' | 'plan_deviation' | 'oversized_position' | 'no_stop_loss' | 'emotional_trade' | 'overtrading' | 'revenge_trading';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  timestamp: Date;
  description: string;
  entryId: string;
  impact?: {
    potentialLoss?: number;
    actualLoss?: number;
  };
}

export interface LearningPattern {
  patternType: 'successful_behavior' | 'failure_pattern' | 'improvement_area';
  description: string;
  frequency: number;
  confidence: number;
  actionable: boolean;
  recommendation?: string;
}

export interface RuleCompliance {
  overall: number; // 0-100
  byRule: {
    alwaysUsePlan: number;
    followPlan: number;
    positionSizing: number;
    useStopLoss: number;
    emotionalControl: number;
    tradingFrequency: number;
  };
  trend: 'improving' | 'declining' | 'stable';
}

export interface DisciplineReport {
  timestamp: Date;
  ruleCompliance: RuleCompliance;
  violations: RuleViolation[];
  learningPatterns: LearningPattern[];
  insights: {
    strongestArea: string;
    weakestArea: string;
    topViolations: string[];
    recentImprovements: string[];
  };
  recommendations: string[];
}

export interface DisciplineMonitorConfig {
  maxTradesPerDay: number;
  maxPositionSize: number;
  maxRiskPerTrade: number;
  requireStopLoss: boolean;
  lookbackPeriod: number; // days
}

export class DisciplineMonitor {
  private config: DisciplineMonitorConfig;
  private violations: RuleViolation[] = [];

  constructor(config?: Partial<DisciplineMonitorConfig>) {
    this.config = {
      maxTradesPerDay: config?.maxTradesPerDay ?? 5,
      maxPositionSize: config?.maxPositionSize ?? 10000,
      maxRiskPerTrade: config?.maxRiskPerTrade ?? 500,
      requireStopLoss: config?.requireStopLoss ?? true,
      lookbackPeriod: config?.lookbackPeriod ?? 30
    };
  }

  /**
   * ジャーナルエントリーをチェックし、ルール違反を検出
   */
  checkEntryForViolations(entry: JournalEntry): RuleViolation[] {
    const entryViolations: RuleViolation[] = [];

    // 1. 取引計画の有無チェック
    if (!entry.tradePlan) {
      entryViolations.push({
        id: `no_plan_${entry.id}_${Date.now()}`,
        type: 'no_plan',
        severity: 'moderate',
        timestamp: new Date(entry.date),
        description: '取引計画なしでエントリーしました。取引前に必ず計画を立ててください。',
        entryId: entry.id
      });
    }

    // 2. 計画からの逸脱チェック
    if (entry.tradePlan && entry.followedPlan === false) {
      entryViolations.push({
        id: `plan_deviation_${entry.id}_${Date.now()}`,
        type: 'plan_deviation',
        severity: 'major',
        timestamp: new Date(entry.date),
        description: '取引計画から逸脱しました。計画通りの取引のみを行ってください。',
        entryId: entry.id,
        impact: {
          actualLoss: entry.profit
        }
      });
    }

    // 3. ポジションサイズチェック
    const positionValue = entry.quantity * (entry.entryPrice || 0);
    if (positionValue > this.config.maxPositionSize) {
      entryViolations.push({
        id: `oversized_position_${entry.id}_${Date.now()}`,
        type: 'oversized_position',
        severity: 'major',
        timestamp: new Date(entry.date),
        description: `ポジションサイズが上限を超えています（${positionValue.toFixed(2)} > ${this.config.maxPositionSize}）`,
        entryId: entry.id,
        impact: {
          potentialLoss: positionValue * 0.02 // 2%の損失を仮定
        }
      });
    }

    // 4. ストップロスの有無チェック
    if (this.config.requireStopLoss && entry.tradePlan && !entry.tradePlan.stopLoss) {
      entryViolations.push({
        id: `no_stop_loss_${entry.id}_${Date.now()}`,
        type: 'no_stop_loss',
        severity: 'critical',
        timestamp: new Date(entry.date),
        description: 'ストップロスが設定されていません。必ずストップロスを設定してください。',
        entryId: entry.id,
        impact: {
          potentialLoss: entry.quantity * (entry.entryPrice || 0) * 0.05
        }
      });
    }

    // 5. 感情的取引チェック
    if (entry.emotionBefore) {
      const avgEmotion = (entry.emotionBefore.fear + entry.emotionBefore.greed +
                         entry.emotionBefore.stress) / 3;

      if (avgEmotion >= 4) {
        entryViolations.push({
          id: `emotional_trade_${entry.id}_${Date.now()}`,
          type: 'emotional_trade',
          severity: 'moderate',
          timestamp: new Date(entry.date),
          description: `感情が高ぶっている状態で取引しました（平均感情レベル: ${avgEmotion.toFixed(1)}/5）`,
          entryId: entry.id,
          impact: {
            actualLoss: entry.profit
          }
        });
      }
    }

    // 違反を記録
    this.violations.push(...entryViolations);

    return entryViolations;
  }

  /**
   * 全体的なルール遵守状況を計算
   */
  calculateRuleCompliance(entries: JournalEntry[]): RuleCompliance {
    const recentEntries = this.getRecentEntries(entries);

    if (recentEntries.length === 0) {
      return {
        overall: 0,
        byRule: {
          alwaysUsePlan: 0,
          followPlan: 0,
          positionSizing: 0,
          useStopLoss: 0,
          emotionalControl: 0,
          tradingFrequency: 0
        },
        trend: 'stable'
      };
    }

    // 各ルールの遵守率を計算
    const alwaysUsePlan = this.calculateAlwaysUsePlanRate(recentEntries);
    const followPlan = this.calculateFollowPlanRate(recentEntries);
    const positionSizing = this.calculatePositionSizingCompliance(recentEntries);
    const useStopLoss = this.calculateStopLossUsageRate(recentEntries);
    const emotionalControl = this.calculateEmotionalControlRate(recentEntries);
    const tradingFrequency = this.calculateTradingFrequencyCompliance(recentEntries);

    // 全体スコア（加重平均）
    const overall = (
      alwaysUsePlan * 0.2 +
      followPlan * 0.25 +
      positionSizing * 0.2 +
      useStopLoss * 0.15 +
      emotionalControl * 0.1 +
      tradingFrequency * 0.1
    );

    // トレンドを計算
    const trend = this.calculateTrend(recentEntries);

    return {
      overall: Math.round(overall),
      byRule: {
        alwaysUsePlan: Math.round(alwaysUsePlan),
        followPlan: Math.round(followPlan),
        positionSizing: Math.round(positionSizing),
        useStopLoss: Math.round(useStopLoss),
        emotionalControl: Math.round(emotionalControl),
        tradingFrequency: Math.round(tradingFrequency)
      },
      trend
    };
  }

  /**
   * 学習パターンを抽出
   */
  extractLearningPatterns(entries: JournalEntry[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // 成功パターンを特定
    const winningEntries = entries.filter(e => e.profit && e.profit > 0);
    if (winningEntries.length >= 3) {
      const successPatterns = this.identifySuccessPatterns(winningEntries);
      patterns.push(...successPatterns);
    }

    // 失敗パターンを特定
    const losingEntries = entries.filter(e => e.profit && e.profit < 0);
    if (losingEntries.length >= 3) {
      const failurePatterns = this.identifyFailurePatterns(losingEntries);
      patterns.push(...failurePatterns);
    }

    // 改善領域を特定
    const improvementAreas = this.identifyImprovementAreas(entries);
    patterns.push(...improvementAreas);

    // 信頼度でフィルタリング
    return patterns.filter(p => p.confidence >= 0.5).slice(0, 10);
  }

  /**
   * 規律レポートを生成
   */
  generateDisciplineReport(entries: JournalEntry[]): DisciplineReport {
    const recentEntries = this.getRecentEntries(entries);

    // 全エントリーの違反をチェック（まだチェックしていない場合）
    for (const entry of recentEntries) {
      if (!this.violations.some(v => v.entryId === entry.id)) {
        this.checkEntryForViolations(entry);
      }
    }

    const ruleCompliance = this.calculateRuleCompliance(recentEntries);
    const learningPatterns = this.extractLearningPatterns(recentEntries);
    const insights = this.generateInsights(recentEntries, ruleCompliance);
    const recommendations = this.generateRecommendations(insights, ruleCompliance);

    return {
      timestamp: new Date(),
      ruleCompliance,
      violations: this.getRecentViolations(),
      learningPatterns,
      insights,
      recommendations
    };
  }

  /**
   * 最近の違反を取得
   */
  getRecentViolations(days: number = 7): RuleViolation[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.violations.filter(v => v.timestamp >= cutoffDate);
  }

  /**
   * 違反をクリア
   */
  clearViolations(): void {
    this.violations = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 常に計画を使用している率を計算
   */
  private calculateAlwaysUsePlanRate(entries: JournalEntry[]): number {
    const entriesWithPlan = entries.filter(e => e.tradePlan);
    return entries.length > 0 ? (entriesWithPlan.length / entries.length) * 100 : 0;
  }

  /**
   * 計画を遵守している率を計算
   */
  private calculateFollowPlanRate(entries: JournalEntry[]): number {
    const entriesWithPlan = entries.filter(e => e.tradePlan && e.followedPlan === true);
    const totalWithPlan = entries.filter(e => e.tradePlan);
    return totalWithPlan.length > 0 ? (entriesWithPlan.length / totalWithPlan.length) * 100 : 0;
  }

  /**
   * ポジションサイジング遵守率を計算
   */
  private calculatePositionSizingCompliance(entries: JournalEntry[]): number {
    let compliantCount = 0;
    let totalEntries = 0;

    for (const entry of entries) {
      const positionValue = entry.quantity * (entry.entryPrice || 0);
      totalEntries++;
      if (positionValue <= this.config.maxPositionSize) {
        compliantCount++;
      }
    }

    return totalEntries > 0 ? (compliantCount / totalEntries) * 100 : 0;
  }

  /**
   * ストップロス使用率を計算
   */
  private calculateStopLossUsageRate(entries: JournalEntry[]): number {
    const entriesWithStopLoss = entries.filter(
      e => e.tradePlan && e.tradePlan.stopLoss
    );
    const entriesWithPlan = entries.filter(e => e.tradePlan);

    return entriesWithPlan.length > 0
      ? (entriesWithStopLoss.length / entriesWithPlan.length) * 100
      : 0;
  }

  /**
   * 感情コントロール率を計算
   */
  private calculateEmotionalControlRate(entries: JournalEntry[]): number {
    const entriesWithEmotion = entries.filter(e => e.emotionBefore);
    if (entriesWithEmotion.length === 0) return 100;

    const controlledEntries = entriesWithEmotion.filter(e => {
      const avgEmotion = (e.emotionBefore!.fear + e.emotionBefore!.greed +
                         e.emotionBefore!.stress) / 3;
      return avgEmotion < 4; // 4未満を適正と判定
    });

    return (controlledEntries.length / entriesWithEmotion.length) * 100;
  }

  /**
   * 取引頻度遵守率を計算
   */
  private calculateTradingFrequencyCompliance(entries: JournalEntry[]): number {
    const tradesPerDay = this.calculateTradesPerDay(entries);
    const compliant = Math.min(tradesPerDay, this.config.maxTradesPerDay) / this.config.maxTradesPerDay;
    return compliant * 100;
  }

  /**
   * 1日あたりの取引回数を計算
   */
  private calculateTradesPerDay(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;

    const dates = entries.map(e => new Date(e.date).toDateString());
    const uniqueDates = new Set(dates);

    return entries.length / uniqueDates.size;
  }

  /**
   * トレンドを計算
   */
  private calculateTrend(entries: JournalEntry[]): RuleCompliance['trend'] {
    if (entries.length < 10) return 'stable';

    const half = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, half);
    const secondHalf = entries.slice(half);

    const firstHalfCompliance = this.calculateAlwaysUsePlanRate(firstHalf);
    const secondHalfCompliance = this.calculateAlwaysUsePlanRate(secondHalf);

    const diff = secondHalfCompliance - firstHalfCompliance;

    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
  }

  /**
   * 成功パターンを特定
   */
  private identifySuccessPatterns(winningEntries: JournalEntry[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // 計画遵守率
    const withPlanFollowed = winningEntries.filter(e => e.tradePlan && e.followedPlan === true);
    if (withPlanFollowed.length / winningEntries.length > 0.7) {
      patterns.push({
        patternType: 'successful_behavior',
        description: '計画を立てて守る取引で高い勝率',
        frequency: withPlanFollowed.length / winningEntries.length,
        confidence: 0.8,
        actionable: true,
        recommendation: 'この成功パターンを維持してください。全ての取引で計画を立てて守ることを徹底してください。'
      });
    }

    // 感情コントロール
    const withLowEmotion = winningEntries.filter(e => {
      if (!e.emotionBefore) return false;
      return (e.emotionBefore.fear + e.emotionBefore.greed + e.emotionBefore.stress) / 3 < 3;
    });
    if (withLowEmotion.length / winningEntries.length > 0.5) {
      patterns.push({
        patternType: 'successful_behavior',
        description: '低い感情レベルでの取引で成功',
        frequency: withLowEmotion.length / winningEntries.length,
        confidence: 0.75,
        actionable: true,
        recommendation: '感情が安定している時の取引を続けてください。感情が高ぶった時は取引を控えてください。'
      });
    }

    return patterns;
  }

  /**
   * 失敗パターンを特定
   */
  private identifyFailurePatterns(losingEntries: JournalEntry[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // 計画なしからの損失
    const withoutPlan = losingEntries.filter(e => !e.tradePlan);
    if (withoutPlan.length / losingEntries.length > 0.3) {
      patterns.push({
        patternType: 'failure_pattern',
        description: '計画なしの取引で損失が頻発',
        frequency: withoutPlan.length / losingEntries.length,
        confidence: 0.85,
        actionable: true,
        recommendation: '取引前に必ず計画を立ててください。計画のない取引は回避してください。'
      });
    }

    // 計画逸脱からの損失
    const planDeviations = losingEntries.filter(e => e.followedPlan === false);
    if (planDeviations.length / losingEntries.length > 0.3) {
      patterns.push({
        patternType: 'failure_pattern',
        description: '計画からの逸脱で損失が頻発',
        frequency: planDeviations.length / losingEntries.length,
        confidence: 0.9,
        actionable: true,
        recommendation: '一度立てた計画は必ず守ってください。途中で変更したくなっても、原則に従ってください。'
      });
    }

    // 感情的取引からの損失
    const emotionalTrades = losingEntries.filter(e => {
      if (!e.emotionBefore) return false;
      return (e.emotionBefore.fear + e.emotionBefore.greed + e.emotionBefore.stress) / 3 >= 4;
    });
    if (emotionalTrades.length / losingEntries.length > 0.3) {
      patterns.push({
        patternType: 'failure_pattern',
        description: '高い感情レベルでの取引で損失が頻発',
        frequency: emotionalTrades.length / losingEntries.length,
        confidence: 0.8,
        actionable: true,
        recommendation: '感情が高ぶっている時は取引を控えてください。リラックスしてから再開してください。'
      });
    }

    return patterns;
  }

  /**
   * 改善領域を特定
   */
  private identifyImprovementAreas(entries: JournalEntry[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // ストップロスの不使用
    const withoutStopLoss = entries.filter(e => e.tradePlan && !e.tradePlan.stopLoss);
    if (withoutStopLoss.length > 0) {
      const lossesWithoutStopLoss = withoutStopLoss.filter(e => e.profit && e.profit < 0);
      if (lossesWithoutStopLoss.length / withoutStopLoss.length > 0.5) {
        patterns.push({
          patternType: 'improvement_area',
          description: 'ストップロスを設定しない取引で損失が拡大',
          frequency: lossesWithoutStopLoss.length / withoutStopLoss.length,
          confidence: 0.9,
          actionable: true,
          recommendation: '全ての取引で必ずストップロスを設定してください。これだけで損失を大幅に削減できます。'
        });
      }
    }

    // ジャーナル記録の不備
    const withoutReflection = entries.filter(e => !e.reflection || !e.reflection.lessonsLearned);
    if (withoutReflection.length / entries.length > 0.5) {
      patterns.push({
        patternType: 'improvement_area',
        description: '取引後の振り返りが不足',
        frequency: withoutReflection.length / entries.length,
        confidence: 0.7,
        actionable: true,
        recommendation: '各取引後に必ず振り返りを行い、学びを記録してください。同じ過ちを繰り返さないためです。'
      });
    }

    return patterns;
  }

  /**
   * インサイトを生成
   */
  private generateInsights(
    entries: JournalEntry[],
    compliance: RuleCompliance
  ): DisciplineReport['insights'] {
    const scores = compliance.byRule;
    const ruleNames = {
      alwaysUsePlan: '取引計画の作成',
      followPlan: '計画の遵守',
      positionSizing: 'ポジションサイジング',
      useStopLoss: 'ストップロスの使用',
      emotionalControl: '感情のコントロール',
      tradingFrequency: '取引頻度'
    };

    // 最も強い領域と弱い領域を特定
    let strongestArea = '';
    let strongestScore = -1;
    let weakestArea = '';
    let weakestScore = 101;

    for (const [key, score] of Object.entries(scores)) {
      if (score > strongestScore) {
        strongestScore = score;
        strongestArea = ruleNames[key as keyof typeof ruleNames];
      }
      if (score < weakestScore) {
        weakestScore = score;
        weakestArea = ruleNames[key as keyof typeof ruleNames];
      }
    }

    // トップ違反を特定
    const recentViolations = this.getRecentViolations(7);
    const violationCounts = recentViolations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topViolations = Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => this.getViolationTypeLabel(type));

    // 最近の改善を特定
    const recentImprovements: string[] = [];
    if (compliance.trend === 'improving') {
      recentImprovements.push('全体的な規律が改善傾向にあります');
    }
    if (strongestScore >= 80) {
      recentImprovements.push(`${strongestArea}で優れた規律を維持しています`);
    }

    return {
      strongestArea,
      weakestArea,
      topViolations,
      recentImprovements
    };
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(
    insights: DisciplineReport['insights'],
    compliance: RuleCompliance
  ): string[] {
    const recommendations: string[] = [];

    // 最も弱い領域への推奨
    if (insights.weakestArea) {
      recommendations.push(
        `最優先改善項目: ${insights.weakestArea}。ここに集中的に取り組んでください。`
      );
    }

    // トップ違反への推奨
    if (insights.topViolations.length > 0) {
      recommendations.push(
        `最近の違反パターン: ${insights.topViolations.join(', ')}。これらを避けるように意識してください。`
      );
    }

    // 全体的な推奨
    if (compliance.overall < 60) {
      recommendations.push('全体的な規律スコアが低いです。取引を一時停止し、ルールを見直してください。');
    } else if (compliance.overall < 80) {
      recommendations.push('規律スコアは普通です。弱い領域を改善すれば、パフォーマンスが向上します。');
    } else {
      recommendations.push('優れた規律を維持しています。この調子で継続してください。');
    }

    return recommendations;
  }

  /**
   * 違反タイプのラベルを取得
   */
  private getViolationTypeLabel(type: string): string {
    const labels = {
      no_plan: '計画なしの取引',
      plan_deviation: '計画からの逸脱',
      oversized_position: '過大なポジション',
      no_stop_loss: 'ストップロスなし',
      emotional_trade: '感情的取引',
      overtrading: '過度な取引',
      revenge_trading: '復讐トレード'
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * 最近のエントリーを取得
   */
  private getRecentEntries(entries: JournalEntry[]): JournalEntry[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackPeriod);

    return entries.filter(entry => new Date(entry.date) >= cutoffDate);
  }
}

/**
 * Factory function
 */
export const createDisciplineMonitor = (
  config?: Partial<DisciplineMonitorConfig>
): DisciplineMonitor => {
  return new DisciplineMonitor(config);
};
