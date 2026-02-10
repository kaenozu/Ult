/**
 * AI Trading Coach
 *
 * TRADING-029: トレード心理学分析
 * 取引パターンの分析と改善提案の提示
 */

import { JournalEntry } from '@/app/types';

export interface TradingPattern {
  patternType: 'overtrading' | 'revenge_trading' | 'premature_exit' | 'late_entry' | 'position_sizing' | 'emotional';
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface ImprovementSuggestion {
  category: 'discipline' | 'strategy' | 'risk_management' | 'psychology';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionableSteps: string[];
  expectedImpact: string;
  timeframe: string;
}

export interface CoachingInsight {
  timestamp: Date;
  overallScore: number; // 0-100
  patterns: TradingPattern[];
  strengths: string[];
  weaknesses: string[];
  suggestions: ImprovementSuggestion[];
  motivationalMessage: string;
}

export interface PatternAnalysisConfig {
  minTradesForAnalysis: number;
  lookbackPeriod: number; // days
  confidenceThreshold: number;
}

export class AITradingCoach {
  private config: PatternAnalysisConfig;

  constructor(config?: Partial<PatternAnalysisConfig>) {
    this.config = {
      minTradesForAnalysis: config?.minTradesForAnalysis ?? 3,
      lookbackPeriod: config?.lookbackPeriod ?? 30,
      confidenceThreshold: config?.confidenceThreshold ?? 0.6
    };
  }

  /**
   * 取引パターンを分析
   */
  analyzeTradingPatterns(journalEntries: JournalEntry[]): TradingPattern[] {
    if (journalEntries.length < this.config.minTradesForAnalysis) {
      return [];
    }

    const patterns: TradingPattern[] = [];

    // 過去30日間のエントリーに絞り込み
    const recentEntries = this.filterRecentEntries(journalEntries);

    // オーバートレーディング検出
    const overtrading = this.detectOvertrading(recentEntries);
    if (overtrading) patterns.push(overtrading);

    // リベンジトレーディング検出
    const revengeTrading = this.detectRevengeTrading(recentEntries);
    if (revengeTrading) patterns.push(revengeTrading);

    // 早すぎる利益確定検出
    const prematureExit = this.detectPrematureExit(recentEntries);
    if (prematureExit) patterns.push(prematureExit);

    // 遅すぎるエントリー検出
    const lateEntry = this.detectLateEntry(recentEntries);
    if (lateEntry) patterns.push(lateEntry);

    // ポジションサイジングの問題検出
    const positionSizing = this.detectPositionSizingIssues(recentEntries);
    if (positionSizing) patterns.push(positionSizing);

    // 感情的取引パターン検出
    const emotionalPatterns = this.detectEmotionalPatterns(recentEntries);
    if (emotionalPatterns) patterns.push(emotionalPatterns);

    // 信頼度でフィルタリング
    return patterns.filter(p => p.confidence >= this.config.confidenceThreshold);
  }

  /**
   * 改善提案を生成
   */
  generateSuggestions(
    journalEntries: JournalEntry[],
    patterns: TradingPattern[]
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // パターンに基づく提案
    for (const pattern of patterns) {
      const suggestion = this.createSuggestionForPattern(pattern);
      if (suggestion) suggestions.push(suggestion);
    }

    // 全体的な改善提案
    const generalSuggestions = this.generateGeneralSuggestions(journalEntries);
    suggestions.push(...generalSuggestions);

    // 優先度でソート
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 全体的なコーチングインサイトを生成
   */
  generateCoachingInsight(journalEntries: JournalEntry[]): CoachingInsight {
    const patterns = this.analyzeTradingPatterns(journalEntries);
    const suggestions = this.generateSuggestions(journalEntries, patterns);
    const { strengths, weaknesses } = this.identifyStrengthsAndWeaknesses(journalEntries, patterns);
    const overallScore = this.calculateOverallPerformance(journalEntries);

    return {
      timestamp: new Date(),
      overallScore,
      patterns,
      strengths,
      weaknesses,
      suggestions,
      motivationalMessage: this.generateMotivationalMessage(overallScore, strengths.length, weaknesses.length)
    };
  }

  /**
   * オーバートレーディングを検出
   */
  private detectOvertrading(entries: JournalEntry[]): TradingPattern | null {
    // 1日あたりの平均取引回数を計算
    const tradesPerDay = this.calculateTradesPerDay(entries);

    if (tradesPerDay > 5) {
      return {
        patternType: 'overtrading',
        description: `1日あたり平均${tradesPerDay.toFixed(1)}回の取引を行っています。高頻度な取引は過度なストレスとエラーを招く可能性があります。`,
        frequency: tradesPerDay / 5, // 5回を基準
        impact: 'negative',
        confidence: Math.min(0.95, 0.5 + (tradesPerDay - 5) * 0.1)
      };
    }

    return null;
  }

  /**
   * リベンジトレーディングを検出
   */
  private detectRevengeTrading(entries: JournalEntry[]): TradingPattern | null {
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    let quickReentryCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.profit && entry.profit < 0) {
        consecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);

        // 次の取引が30分以内に行われたかチェック
        if (i < entries.length - 1) {
          const currentEntryTime = new Date(entry.date).getTime();
          const nextEntryTime = new Date(entries[i + 1].date).getTime();
          const timeDiff = nextEntryTime - currentEntryTime;

          if (timeDiff < 30 * 60 * 1000) { // 30分以内
            quickReentryCount++;
          }
        }
      } else {
        consecutiveLosses = 0;
      }
    }

    if (maxConsecutiveLosses >= 2 && quickReentryCount > 0) {
      return {
        patternType: 'revenge_trading',
        description: `損失後に${quickReentryCount}回、短時間で再エントリーしています。損失を取り戻そうとする心理が働いている可能性があります。`,
        frequency: quickReentryCount / entries.length,
        impact: 'negative',
        confidence: Math.min(0.9, 0.5 + maxConsecutiveLosses * 0.1)
      };
    }

    return null;
  }

  /**
   * 早すぎる利益確定を検出
   */
  private detectPrematureExit(entries: JournalEntry[]): TradingPattern | null {
    let prematureExitCount = 0;
    let totalExitCount = 0;

    for (const entry of entries) {
      if (entry.status === 'CLOSED' && entry.profit && entry.profit > 0) {
        totalExitCount++;

        // ターゲット価格が設定されている場合、それより早く決済したか
        if (entry.tradePlan?.targetPrice && entry.exitPrice) {
          if (entry.exitPrice < entry.tradePlan.targetPrice * 0.95) {
            prematureExitCount++;
          }
        }

        // 利益が小さい（+1%未満）で決済した場合
        if (entry.profitPercent && entry.profitPercent < 1) {
          prematureExitCount++;
        }
      }
    }

    if (totalExitCount > 0 && prematureExitCount / totalExitCount > 0.4) {
      return {
        patternType: 'premature_exit',
        description: `${Math.round(prematureExitCount / totalExitCount * 100)}%の利益確定が早すぎます。利益を最大化するためには、トレンドに乗った持ち続けが必要です。`,
        frequency: prematureExitCount / totalExitCount,
        impact: 'negative',
        confidence: 0.7
      };
    }

    return null;
  }

  /**
   * 遅すぎるエントリーを検出
   */
  private detectLateEntry(entries: JournalEntry[]): TradingPattern | null {
    // エントリー後の価格変動を分析（シミュレーション）
    let lateEntryCount = 0;
    let totalEntries = 0;

    for (const entry of entries) {
      if (entry.signalType && entry.entryPrice) {
        totalEntries++;

        // シグナルからエントリーまでの時間を推定
        // （実際にはタイムスタンプが必要だが、ここでは簡略化）

        // エントリー価格がすでに大きく動いている場合を「遅い」と判定
        // （これは実際のデータがないため、プレースホルダー）
        if (entry.profit && entry.profit < 0) {
          // 損失トレードの一部は遅れたエントリーによるものと仮定
          lateEntryCount += 0.3; // 30%の確率で遅れたエントリーと推定
        }
      }
    }

    if (totalEntries > 0 && lateEntryCount / totalEntries > 0.3) {
      return {
        patternType: 'late_entry',
        description: '一部の取引でエントリーのタイミングが遅れている可能性があります。シグナルが出たら、躊躇せずエントリーすることが重要です。',
        frequency: lateEntryCount / totalEntries,
        impact: 'negative',
        confidence: 0.5
      };
    }

    return null;
  }

  /**
   * ポジションサイジングの問題を検出
   */
  private detectPositionSizingIssues(entries: JournalEntry[]): TradingPattern | null {
    const positionSizes = entries.map(e => e.quantity * (e.entryPrice || 0));
    const avgSize = positionSizes.reduce((a, b) => a + b, 0) / positionSizes.length;
    const variance = positionSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / positionSizes.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgSize;

    // 変動係数が大きい（>0.5）場合、ポジションサイジングが不規則
    if (coefficientOfVariation > 0.5) {
      return {
        patternType: 'position_sizing',
        description: `ポジションサイズの変動が大きい（変動係数: ${coefficientOfVariation.toFixed(2)}）。一貫したリスク管理ルールを適用することで、パフォーマンスの安定性が向上します。`,
        frequency: coefficientOfVariation,
        impact: 'negative',
        confidence: Math.min(0.9, 0.5 + coefficientOfVariation)
      };
    }

    return null;
  }

  /**
   * 感情的取引パターンを検出
   */
  private detectEmotionalPatterns(entries: JournalEntry[]): TradingPattern | null {
    let highFearCount = 0;
    let highGreedCount = 0;
    let highStressCount = 0;

    for (const entry of entries) {
      if (entry.emotionBefore) {
        if (entry.emotionBefore.fear >= 4) highFearCount++;
        if (entry.emotionBefore.greed >= 4) highGreedCount++;
        if (entry.emotionBefore.stress >= 4) highStressCount++;
      }
    }

    const totalWithEmotion = entries.filter(e => e.emotionBefore).length;
    if (totalWithEmotion === 0) return null;

    const emotionalTradeRatio = (highFearCount + highGreedCount + highStressCount) / totalWithEmotion;

    if (emotionalTradeRatio > 0.3) {
      return {
        patternType: 'emotional',
        description: `約${Math.round(emotionalTradeRatio * 100)}%の取引で高い感情レベルが記録されています。感情が高ぶっている時は取引を控えるべきです。`,
        frequency: emotionalTradeRatio,
        impact: 'negative',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * パターンに基づく改善提案を作成
   */
  private createSuggestionForPattern(pattern: TradingPattern): ImprovementSuggestion {
    switch (pattern.patternType) {
      case 'overtrading':
        return {
          category: 'discipline',
          priority: pattern.frequency > 1.5 ? 'high' : 'medium',
          title: '取引頻度の最適化',
          description: '過度な取引は取引コストを増やし、判断の質を低下させます。質の高いセットアップのみに焦点を当ててください。',
          actionableSteps: [
            '1日の最大取引回数を3-5回に制限する',
            '各取引前にチェックリストを使用してセットアップの質を確認する',
            '取引間に最低30分の休憩を入れる',
            '取引日記をつけ、各取引の質を評価する（1-10点）'
          ],
          expectedImpact: '勝率が10-15%向上し、取引コストが30-40%削減される可能性があります',
          timeframe: '2-4週間'
        };

      case 'revenge_trading':
        return {
          category: 'psychology',
          priority: 'high',
          title: 'リベンジトレーディングの防止',
          description: '損失を取り戻そうとする心理は、さらなる損失を招く悪循環を生みます。',
          actionableSteps: [
            '連続2回の損失後は、必ず1時間以上の休憩を取る',
            '損失が発生したら、その取引を客観的に分析してから次の取引を検討する',
            '1日の最大損失額を設定し、達成したら取引を停止する',
            '損失を受容するためのマインドフルネス瞑想を実践する'
          ],
          expectedImpact: '感情的な取引が70-80%減少、連続損失の平均が2回から3回に増加',
          timeframe: '3-4週間'
        };

      case 'premature_exit':
        return {
          category: 'strategy',
          priority: 'medium',
          title: '利益確定の最適化',
          description: '早すぎる利益確定は、大きな利益を逃す機会損失になります。',
          actionableSteps: [
            'トレイリングストップを導入し、利益を伸ばす',
            '利益確定ルールを明確に定義し（例：+5%で半分、+10%で残り）、それに従う',
            '利益確定の根拠を取引日記に記録し、後で振り返る',
            'トレンドフォロー戦略の場合、最初のターゲットに達したら、損切りをBreakevenに移動'
          ],
          expectedImpact: '平均利益が20-30%増加、リスク・リワード比率が1:2から1:3に改善',
          timeframe: '4-6週間'
        };

      case 'late_entry':
        return {
          category: 'discipline',
          priority: 'medium',
          title: 'エントリータイミングの改善',
          description: 'シグナルが出たら躊躇せずエントリーすることが重要です。',
          actionableSteps: [
            'アラートを設定し、シグナルを即座に認識できるようにする',
            'エントリー条件を事前に明確に定義する',
            'エントリー価格、数量、ストップロスを事前に計算しておく',
            'トレード中に他の作業（ニュースチェック、SNS等）を避ける'
          ],
          expectedImpact: '取引の機会損失が減少し、エントリー精度が15-20%向上',
          timeframe: '2-3週間'
        };

      case 'position_sizing':
        return {
          category: 'risk_management',
          priority: 'high',
          title: 'ポジションサイジングの標準化',
          description: '一貫したリスク管理は長期的な成功に不可欠です。',
          actionableSteps: [
            '1取引あたりのリスクを資金の1-2%に固定する',
            'ATRに基づくポジションサイジング計算式を使用する',
            'すべての取引で同じリスクリワード比率（例：1:2）を目指す',
            'ポジションサイズ計算シートを作成し、各取引前に使用する'
          ],
          expectedImpact: '資金の変動が減少し、最大ドローダウンが30-40%改善',
          timeframe: '即座に実施可能、2週間で習慣化'
        };

      case 'emotional':
        return {
          category: 'psychology',
          priority: 'high',
          title: '感情管理の強化',
          description: '感情が高ぶっている時の取引は、判断の質を著しく低下させます。',
          actionableSteps: [
            '取引前に感情レベルを記録し、恐怖/貪欲/ストレスが4以上の場合は取引を skip する',
            '1日10分のマインドフルネス瞑想を実践する',
            '取引ルールの違反を記録し、週次レビューを行う',
            '感情が高ぶっている時は、必ず15分間の休憩を取る'
          ],
          expectedImpact: '感情的な取引が80%減少、規律スコアが20-30点向上',
          timeframe: '4-6週間'
        };

      default:
        return {
          category: 'discipline',
          priority: 'low',
          title: '全般的な改善',
          description: '取引プロセス全体を見直してください。',
          actionableSteps: ['取引日記をつける', 'ルールを明確にする', '定期的にレビューする'],
          expectedImpact: '全般的なパフォーマンスの改善',
          timeframe: '4-8週間'
        };
    }
  }

  /**
   * 全体的な改善提案を生成
   */
  private generateGeneralSuggestions(entries: JournalEntry[]): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // ジャーナル記録率のチェック
    const entriesWithReflection = entries.filter(e =>
      e.reflection && e.reflection.lessonsLearned
    );
    const reflectionRate = entries.length > 0 ? entriesWithReflection.length / entries.length : 0;

    if (reflectionRate < 0.5) {
      suggestions.push({
        category: 'discipline',
        priority: 'medium',
        title: '取引日記の充実',
        description: '取引日記は学習と改善の最も強力なツールです。',
        actionableSteps: [
          '各取引後に必ず日記をつける',
          '何が良かったか、何が悪かったかを記録する',
          '次回の改善点を具体的に書き留める',
          '週1回で過去1週間の取引を振り返る'
        ],
        expectedImpact: '同じ過ちを繰り返す確率が50%減少',
        timeframe: '2-4週間'
      });
    }

    // 計画遵守率のチェック
    const entriesWithPlan = entries.filter(e => e.tradePlan && e.followedPlan === true);
    const planAdherenceRate = entries.length > 0 ? entriesWithPlan.length / entries.length : 0;

    if (planAdherenceRate < 0.7) {
      suggestions.push({
        category: 'discipline',
        priority: 'high',
        title: '取引計画の遵守',
        description: '計画なき取引は計画的な失敗です。',
        actionableSteps: [
          '各取引前に計画を文書化する（エントリー、出口、リスク）',
          '計画通りの取引のみを実行する',
          '計画を変更した場合は、必ず理由を記録する',
          '計画遵守率を週次で追跡する'
        ],
        expectedImpact: '勝率が15-25%向上、規律スコアが大幅改善',
        timeframe: '3-4週間'
      });
    }

    return suggestions;
  }

  /**
   * 強みと弱みを特定
   */
  private identifyStrengthsAndWeaknesses(
    entries: JournalEntry[],
    patterns: TradingPattern[]
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // パターンから弱みを抽出
    for (const pattern of patterns) {
      if (pattern.impact === 'negative') {
        switch (pattern.patternType) {
          case 'overtrading':
            weaknesses.push('過度な取引による判断の質の低下');
            break;
          case 'revenge_trading':
            weaknesses.push('損失後の感情的な取引');
            break;
          case 'premature_exit':
            weaknesses.push('早すぎる利益確定による利益の機会損失');
            break;
          case 'position_sizing':
            weaknesses.push('一貫性のないポジションサイジング');
            break;
          case 'emotional':
            weaknesses.push('感情に左右される取引判断');
            break;
        }
      }
    }

    // 勝率とリスク管理から強みを抽出
    const winRate = this.calculateWinRate(entries);
    if (winRate > 0.5) {
      strengths.push('良好な勝率');
    }

    const avgLoss = this.calculateAverageLoss(entries);
    const avgWin = this.calculateAverageWin(entries);
    if (avgLoss < avgWin * 0.5) {
      strengths.push('優れた損失管理（小さな負け、大きな勝ち）');
    }

    const planAdherence = this.calculatePlanAdherence(entries);
    if (planAdherence > 0.7) {
      strengths.push('高い計画遵守率');
    }

    const journalConsistency = this.calculateJournalConsistency(entries);
    if (journalConsistency > 0.8) {
      strengths.push('優れた取引日記の習慣');
    }

    // デフォルトの強み
    if (strengths.length === 0) {
      strengths.push('継続的な取引活動');
    }

    return { strengths, weaknesses };
  }

  /**
   * 全体的なパフォーマンススコアを計算
   */
  private calculateOverallPerformance(entries: JournalEntry[]): number {
    if (entries.length === 0) return 50;

    let score = 0;

    // 勝率（20点満点）
    const winRate = this.calculateWinRate(entries);
    score += Math.min(20, winRate * 40);

    // リスクリワード比率（20点満点）
    const avgWin = this.calculateAverageWin(entries);
    const avgLoss = Math.abs(this.calculateAverageLoss(entries));
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : 1;
    score += Math.min(20, riskReward * 10);

    // 計画遵守（20点満点）
    const planAdherence = this.calculatePlanAdherence(entries);
    score += planAdherence * 20;

    // ジャーナル一貫性（20点満点）
    const journalConsistency = this.calculateJournalConsistency(entries);
    score += journalConsistency * 20;

    // 感情コントロール（20点満点）
    const emotionalControl = this.calculateEmotionalControl(entries);
    score += emotionalControl * 20;

    return Math.round(score);
  }

  /**
   * モチベーショナルメッセージを生成
   */
  private generateMotivationalMessage(
    overallScore: number,
    strengthsCount: number,
    weaknessesCount: number
  ): string {
    if (overallScore >= 80) {
      return '素晴らしいパフォーマンスです！この調子で継続してください。';
    } else if (overallScore >= 60) {
      return '良い方向に進んでいます。改善点に取り組めば、さらに成果が上がります。';
    } else if (strengthsCount > weaknessesCount) {
      return '強みを活かしつつ、改善点に着実に取り組んでください。 Rome was not built in a day.';
    } else if (overallScore >= 40) {
      return '今は困難な時期かもしれませんが、継続こそが成功への鍵です。一つ一つの改善に集中してください。';
    } else {
      return '今日は新しい始まりです。小さな一歩から始めましょう。焦らず、着実に進んでください。';
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private filterRecentEntries(entries: JournalEntry[]): JournalEntry[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackPeriod);

    return entries.filter(entry => new Date(entry.date) >= cutoffDate);
  }

  private calculateTradesPerDay(entries: JournalEntry[]): number {
    if (entries.length === 0) return 0;

    const dates = entries.map(e => new Date(e.date).toDateString());
    const uniqueDates = new Set(dates);

    return entries.length / uniqueDates.size;
  }

  private calculateWinRate(entries: JournalEntry[]): number {
    const closedTrades = entries.filter(e => e.status === 'CLOSED' && e.profit !== undefined);
    if (closedTrades.length === 0) return 0;

    const wins = closedTrades.filter(e => e.profit && e.profit > 0).length;
    return wins / closedTrades.length;
  }

  private calculateAverageWin(entries: JournalEntry[]): number {
    const wins = entries.filter(e => e.profit && e.profit > 0);
    if (wins.length === 0) return 0;

    return wins.reduce((sum, e) => sum + (e.profit || 0), 0) / wins.length;
  }

  private calculateAverageLoss(entries: JournalEntry[]): number {
    const losses = entries.filter(e => e.profit && e.profit < 0);
    if (losses.length === 0) return 0;

    return losses.reduce((sum, e) => sum + (e.profit || 0), 0) / losses.length;
  }

  private calculatePlanAdherence(entries: JournalEntry[]): number {
    const withPlan = entries.filter(e => e.tradePlan && e.followedPlan === true);
    return entries.length > 0 ? withPlan.length / entries.length : 0;
  }

  private calculateJournalConsistency(entries: JournalEntry[]): number {
    const withReflection = entries.filter(e =>
      e.reflection && (e.reflection.lessonsLearned || e.notes)
    );
    return entries.length > 0 ? withReflection.length / entries.length : 0;
  }

  private calculateEmotionalControl(entries: JournalEntry[]): number {
    const entriesWithEmotion = entries.filter(e => e.emotionAfter);
    if (entriesWithEmotion.length === 0) return 0.5;

    let totalScore = 0;
    for (const entry of entriesWithEmotion) {
      if (!entry.emotionAfter) continue;

      // 恐怖とストレスは低い方が良い、自信は高い方が良い
      const fearScore = (5 - entry.emotionAfter.fear) / 4;
      const stressScore = (5 - entry.emotionAfter.stress) / 4;
      const confidenceScore = entry.emotionAfter.confidence / 5;

      totalScore += (fearScore + stressScore + confidenceScore) / 3;
    }

    return totalScore / entriesWithEmotion.length;
  }
}

/**
 * Factory function
 */
export const createAITradingCoach = (
  config?: Partial<PatternAnalysisConfig>
): AITradingCoach => {
  return new AITradingCoach(config);
};
