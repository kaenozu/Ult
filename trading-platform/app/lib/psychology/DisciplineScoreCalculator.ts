/**
 * Discipline Score Calculator
 * 
 * TRADING-025: 規律スコアとダッシュボード
 * トレーダーの規律を多面的に評価し、スコア化
 */

import { JournalEntry } from '@/app/types';
import { DisciplineScore, CooldownRecord } from '@/app/types/risk';

export interface DisciplineScoreConfig {
  planAdherenceWeight: number; // default: 30
  emotionalControlWeight: number; // default: 20
  lossManagementWeight: number; // default: 20
  journalConsistencyWeight: number; // default: 10
  coolingOffComplianceWeight: number; // default: 20
}

export class DisciplineScoreCalculator {
  private config: DisciplineScoreConfig;

  constructor(config?: Partial<DisciplineScoreConfig>) {
    this.config = {
      planAdherenceWeight: config?.planAdherenceWeight ?? 30,
      emotionalControlWeight: config?.emotionalControlWeight ?? 20,
      lossManagementWeight: config?.lossManagementWeight ?? 20,
      journalConsistencyWeight: config?.journalConsistencyWeight ?? 10,
      coolingOffComplianceWeight: config?.coolingOffComplianceWeight ?? 20
    };
  }

  /**
   * 規律スコアを計算
   */
  calculateDisciplineScore(
    journalEntries: JournalEntry[],
    cooldownRecords: CooldownRecord[]
  ): DisciplineScore {
    const planAdherence = this.calculatePlanAdherence(journalEntries);
    const emotionalControl = this.calculateEmotionalControl(journalEntries);
    const lossManagement = this.calculateLossManagement(journalEntries);
    const journalConsistency = this.calculateJournalConsistency(journalEntries);
    const coolingOffCompliance = this.calculateCoolingOffCompliance(cooldownRecords);

    const overall =
      planAdherence +
      emotionalControl +
      lossManagement +
      journalConsistency +
      coolingOffCompliance;

    return {
      overall: Math.round(overall * 10) / 10,
      planAdherence: Math.round(planAdherence * 10) / 10,
      emotionalControl: Math.round(emotionalControl * 10) / 10,
      lossManagement: Math.round(lossManagement * 10) / 10,
      journalConsistency: Math.round(journalConsistency * 10) / 10,
      coolingOffCompliance: Math.round(coolingOffCompliance * 10) / 10,
      breakdown: {
        planAdherenceRate: this.calculatePlanAdherenceRate(journalEntries),
        avgEmotionScore: this.calculateAverageEmotionScore(journalEntries),
        maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(journalEntries),
        journalEntryRate: this.calculateJournalEntryRate(journalEntries),
        coolingOffRespectRate: this.calculateCoolingOffRespectRate(cooldownRecords)
      }
    };
  }

  /**
   * 計画遵守スコアを計算 (0-30点)
   */
  private calculatePlanAdherence(entries: JournalEntry[]): number {
    const rate = this.calculatePlanAdherenceRate(entries);
    
    // 70%以上で満点、50%未満で0点
    if (rate >= 70) return this.config.planAdherenceWeight;
    if (rate < 50) return 0;
    
    // 50-70%の間で線形補間
    return (this.config.planAdherenceWeight * (rate - 50)) / 20;
  }

  /**
   * 計画遵守率を計算 (percentage)
   */
  private calculatePlanAdherenceRate(entries: JournalEntry[]): number {
    const withPlan = entries.filter(e => e.tradePlan && e.followedPlan === true);
    return entries.length > 0 ? (withPlan.length / entries.length) * 100 : 0;
  }

  /**
   * 感情コントロールスコアを計算 (0-20点)
   */
  private calculateEmotionalControl(entries: JournalEntry[]): number {
    const avgScore = this.calculateAverageEmotionScore(entries);
    
    // 7/10以上で満点、5/10未満で0点
    if (avgScore >= 7) return this.config.emotionalControlWeight;
    if (avgScore < 5) return 0;
    
    // 5-7の間で線形補間
    return (this.config.emotionalControlWeight * (avgScore - 5)) / 2;
  }

  /**
   * 平均感情スコアを計算 (1-10)
   */
  private calculateAverageEmotionScore(entries: JournalEntry[]): number {
    const entriesWithEmotion = entries.filter(e => e.emotionAfter);
    
    if (entriesWithEmotion.length === 0) return 5; // neutral default
    
    const totalScore = entriesWithEmotion.reduce((sum, entry) => {
      if (!entry.emotionAfter) return sum;
      
      const { fear, greed, confidence, stress } = entry.emotionAfter;
      
      // 恐怖とストレスは低いほど良い、自信は高いほど良い、欲は中程度が良い
      const emotionScore =
        (5 - fear) + // fear: 1 is good (5 points), 5 is bad (1 point)
        (3 - Math.abs(greed - 3)) + // greed: 3 is ideal (3 points)
        confidence + // confidence: higher is better
        (5 - stress); // stress: lower is better
      
      // 0-16 range, normalize to 1-10
      return sum + ((emotionScore / 16) * 9 + 1);
    }, 0);
    
    return totalScore / entriesWithEmotion.length;
  }

  /**
   * 損失管理スコアを計算 (0-20点)
   */
  private calculateLossManagement(entries: JournalEntry[]): number {
    const maxConsecutiveLosses = this.calculateMaxConsecutiveLosses(entries);
    
    // 連続損失0-1回で満点、4回以上で0点
    if (maxConsecutiveLosses <= 1) return this.config.lossManagementWeight;
    if (maxConsecutiveLosses >= 4) return 0;
    
    // 2-3回で段階的に減点
    const penalty = (maxConsecutiveLosses - 1) * (this.config.lossManagementWeight / 3);
    return Math.max(0, this.config.lossManagementWeight - penalty);
  }

  /**
   * 最大連続損失回数を計算
   */
  private calculateMaxConsecutiveLosses(entries: JournalEntry[]): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    for (const entry of sortedEntries) {
      if (entry.status === 'CLOSED' && entry.profit && entry.profit < 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (entry.status === 'CLOSED') {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  /**
   * ジャーナル記録一貫性スコアを計算 (0-10点)
   */
  private calculateJournalConsistency(entries: JournalEntry[]): number {
    const rate = this.calculateJournalEntryRate(entries);
    
    // 80%以上で満点、50%未満で0点
    if (rate >= 80) return this.config.journalConsistencyWeight;
    if (rate < 50) return 0;
    
    // 50-80%の間で線形補間
    return (this.config.journalConsistencyWeight * (rate - 50)) / 30;
  }

  /**
   * ジャーナル記録率を計算 (percentage)
   */
  private calculateJournalEntryRate(entries: JournalEntry[]): number {
    // 反省やメモが記録されているエントリーの割合
    const withReflection = entries.filter(e => 
      (e.notes && e.notes.length > 10) || 
      (e.reflection && e.reflection.lessonsLearned)
    );
    
    return entries.length > 0 ? (withReflection.length / entries.length) * 100 : 0;
  }

  /**
   * クーリングオフ遵守スコアを計算 (0-20点)
   */
  private calculateCoolingOffCompliance(records: CooldownRecord[]): number {
    const rate = this.calculateCoolingOffRespectRate(records);
    
    // 90%以上で満点、70%未満で0点
    if (rate >= 90) return this.config.coolingOffComplianceWeight;
    if (rate < 70) return 0;
    
    // 70-90%の間で線形補間
    return (this.config.coolingOffComplianceWeight * (rate - 70)) / 20;
  }

  /**
   * クーリングオフ遵守率を計算 (percentage)
   */
  private calculateCoolingOffRespectRate(records: CooldownRecord[]): number {
    if (records.length === 0) return 100; // no violations if no cooldowns
    
    const respected = records.filter(r => r.wasRespected);
    return (respected.length / records.length) * 100;
  }

  /**
   * 改善エリアを特定
   */
  identifyImprovementAreas(score: DisciplineScore): {
    priority: 'high' | 'medium' | 'low';
    area: string;
    currentScore: number;
    maxScore: number;
    suggestion: string;
  }[] {
    const areas = [
      {
        name: '計画遵守',
        score: score.planAdherence,
        max: this.config.planAdherenceWeight,
        suggestion: '取引前に明確な計画を立て、それに従うことを意識してください。'
      },
      {
        name: '感情コントロール',
        score: score.emotionalControl,
        max: this.config.emotionalControlWeight,
        suggestion: '取引中の感情を記録し、冷静な判断を心がけてください。'
      },
      {
        name: '損失管理',
        score: score.lossManagement,
        max: this.config.lossManagementWeight,
        suggestion: '連続損失時は一時的に取引を停止し、戦略を見直してください。'
      },
      {
        name: 'ジャーナル記録',
        score: score.journalConsistency,
        max: this.config.journalConsistencyWeight,
        suggestion: '全ての取引を記録し、反省と学びを書き留めてください。'
      },
      {
        name: 'クーリングオフ遵守',
        score: score.coolingOffCompliance,
        max: this.config.coolingOffComplianceWeight,
        suggestion: 'クーリングオフ期間を守り、感情的な取引を避けてください。'
      }
    ];

    return areas
      .map(area => {
        const percentage = (area.score / area.max) * 100;
        let priority: 'high' | 'medium' | 'low';
        
        if (percentage < 50) priority = 'high';
        else if (percentage < 75) priority = 'medium';
        else priority = 'low';

        return {
          priority,
          area: area.name,
          currentScore: area.score,
          maxScore: area.max,
          suggestion: area.suggestion
        };
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }
}

/**
 * Factory function
 */
export const createDisciplineScoreCalculator = (
  config?: Partial<DisciplineScoreConfig>
): DisciplineScoreCalculator => {
  return new DisciplineScoreCalculator(config);
};
