/**
 * Sentiment Analyzer
 *
 * TRADING-029: トレード心理学分析
 * 恐怖と貪欲指数、感情と取引結果の相関分析
 */

import { JournalEntry } from '@/app/types';

export interface FearGreedIndex {
  current: number; // 0-100 (0=Extreme Fear, 100=Extreme Greed)
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  trend: 'increasing' | 'decreasing' | 'stable';
  components: {
    fear: number; // 0-100
    greed: number; // 0-100
    confidence: number; // 0-100
    stress: number; // 0-100
  };
  timestamp: Date;
}

export interface EmotionTradeCorrelation {
  emotionType: 'fear' | 'greed' | 'confidence' | 'stress';
  correlationCoefficient: number; // -1 to 1
  significance: 'high' | 'medium' | 'low';
  impactOnProfit: {
    lowEmotionProfit: number; // 平均利益（感情レベル低）
    highEmotionProfit: number; // 平均利益（感情レベル高）
    difference: number;
    percentage: number;
  };
  recommendation: string;
}

export interface EmotionalStateHistory {
  timestamp: Date;
  fear: number;
  greed: number;
  confidence: number;
  stress: number;
  overall: number;
  tradeResult?: 'win' | 'loss' | 'breakeven';
  profit?: number;
}

export interface SentimentAnalysisReport {
  timestamp: Date;
  currentFearGreedIndex: FearGreedIndex;
  emotionTradeCorrelations: EmotionTradeCorrelation[];
  emotionalStateHistory: EmotionalStateHistory[];
  insights: {
    dominantEmotion: string;
    emotionalStability: number; // 0-100
    emotionalVolatility: number; // 標準偏差
    bestEmotionalState: { fear: number; greed: number; confidence: number; stress: number };
    worstEmotionalState: { fear: number; greed: number; confidence: number; stress: number };
  };
  recommendations: string[];
}

export interface SentimentAnalysisConfig {
  lookbackPeriod: number; // days
  minDataPoints: number;
  fearThreshold: number;
  greedThreshold: number;
}

export class SentimentAnalyzer {
  private config: SentimentAnalysisConfig;

  constructor(config?: Partial<SentimentAnalysisConfig>) {
    this.config = {
      lookbackPeriod: config?.lookbackPeriod ?? 30,
      minDataPoints: config?.minDataPoints ?? 10,
      fearThreshold: config?.fearThreshold ?? 3,
      greedThreshold: config?.greedThreshold ?? 3
    };
  }

  /**
   * 恐怖と貪欲指数を計算
   */
  calculateFearGreedIndex(entries: JournalEntry[]): FearGreedIndex | null {
    const recentEntries = this.getRecentEntries(entries);

    if (recentEntries.length < this.config.minDataPoints) {
      return null;
    }

    const latestEntry = recentEntries[recentEntries.length - 1];

    if (!latestEntry.emotionAfter) {
      return null;
    }

    const { fear, greed, confidence, stress } = latestEntry.emotionAfter;

    // 恐怖と貪欲を0-100のスケールに変換
    const fearScore = this.normalizeEmotion(fear, true); // 低い方が良い
    const greedScore = this.normalizeEmotion(greed, true); // 低い方が良い（バランス）
    const confidenceScore = this.normalizeEmotion(confidence, false); // 高い方が良い
    const stressScore = this.normalizeEmotion(stress, true); // 低い方が良い

    // 恐怖と貪欲のバランスを計算（0=Extreme Fear, 100=Extreme Greed）
    // 実際には、恐怖が高いと0に近づき、貪欲が高いと100に近づく
    const fearIndex = 100 - fearScore;
    const greedIndex = greedScore;
    const current = (fearIndex * 0.6 + greedIndex * 0.4);

    // トレンドを計算
    const trend = this.calculateTrend(recentEntries);

    return {
      current: Math.round(current),
      label: this.getFearGreedLabel(current),
      trend,
      components: {
        fear: Math.round(fearScore),
        greed: Math.round(greedScore),
        confidence: Math.round(confidenceScore),
        stress: Math.round(stressScore)
      },
      timestamp: new Date(latestEntry.date)
    };
  }

  /**
   * 感情と取引結果の相関を分析
   */
  analyzeEmotionTradeCorrelation(entries: JournalEntry[]): EmotionTradeCorrelation[] {
    const correlations: EmotionTradeCorrelation[] = [];

    // 各感情タイプについて相関を計算
    const emotions: Array<'fear' | 'greed' | 'confidence' | 'stress'> = [
      'fear',
      'greed',
      'confidence',
      'stress'
    ];

    for (const emotion of emotions) {
      const correlation = this.calculateCorrelationForEmotion(entries, emotion);
      if (correlation) {
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * 感情状態の履歴を生成
   */
  generateEmotionalStateHistory(entries: JournalEntry[]): EmotionalStateHistory[] {
    const history: EmotionalStateHistory[] = [];

    for (const entry of entries) {
      if (!entry.emotionAfter) continue;

      const { fear, greed, confidence, stress } = entry.emotionAfter;
      const overall = (fear + greed + confidence + stress) / 4;

      let tradeResult: 'win' | 'loss' | 'breakeven' | undefined;
      if (entry.status === 'CLOSED' && entry.profit !== undefined) {
        if (entry.profit > 0) tradeResult = 'win';
        else if (entry.profit < 0) tradeResult = 'loss';
        else tradeResult = 'breakeven';
      }

      history.push({
        timestamp: new Date(entry.date),
        fear,
        greed,
        confidence,
        stress,
        overall,
        tradeResult,
        profit: entry.profit
      });
    }

    return history;
  }

  /**
   * 包括的なセンチメント分析レポートを生成
   */
  generateSentimentReport(entries: JournalEntry[]): SentimentAnalysisReport | null {
    const recentEntries = this.getRecentEntries(entries);

    if (recentEntries.length < this.config.minDataPoints) {
      return null;
    }

    const currentFearGreedIndex = this.calculateFearGreedIndex(recentEntries);
    if (!currentFearGreedIndex) {
      return null;
    }

    const emotionTradeCorrelations = this.analyzeEmotionTradeCorrelation(recentEntries);
    const emotionalStateHistory = this.generateEmotionalStateHistory(recentEntries);
    const insights = this.generateInsights(emotionalStateHistory);
    const recommendations = this.generateRecommendations(insights, emotionTradeCorrelations);

    return {
      timestamp: new Date(),
      currentFearGreedIndex,
      emotionTradeCorrelations,
      emotionalStateHistory,
      insights,
      recommendations
    };
  }

  /**
   * 特定感情の相関を計算
   */
  private calculateCorrelationForEmotion(
    entries: JournalEntry[],
    emotionType: 'fear' | 'greed' | 'confidence' | 'stress'
  ): EmotionTradeCorrelation | null {
    const validEntries = entries.filter(
      e => e.emotionAfter && e.status === 'CLOSED' && e.profit !== undefined
    );

    if (validEntries.length < 5) {
      return null;
    }

    // 感情レベルと利益のデータを抽出
    const emotionProfits = validEntries.map(e => ({
      emotion: e.emotionAfter![emotionType],
      profit: e.profit!
    }));

    // 感情レベルでグループ分け（低: 1-2, 中: 3, 高: 4-5）
    const lowEmotion = emotionProfits.filter(ep => ep.emotion <= 2);
    const highEmotion = emotionProfits.filter(ep => ep.emotion >= 4);

    if (lowEmotion.length === 0 || highEmotion.length === 0) {
      return null;
    }

    // 平均利益を計算
    const lowEmotionProfit = lowEmotion.reduce((sum, ep) => sum + ep.profit, 0) / lowEmotion.length;
    const highEmotionProfit = highEmotion.reduce((sum, ep) => sum + ep.profit, 0) / highEmotion.length;

    // 相関係数を計算（ピアソン）
    const correlationCoefficient = this.calculatePearsonCorrelation(
      emotionProfits.map(ep => ep.emotion),
      emotionProfits.map(ep => ep.profit)
    );

    const difference = lowEmotionProfit - highEmotionProfit;
    const percentage = lowEmotionProfit !== 0 ? (difference / Math.abs(lowEmotionProfit)) * 100 : 0;

    // 有意性を判定
    let significance: 'high' | 'medium' | 'low';
    const absCorrelation = Math.abs(correlationCoefficient);
    if (absCorrelation >= 0.5) significance = 'high';
    else if (absCorrelation >= 0.3) significance = 'medium';
    else significance = 'low';

    // 推奨事項を生成
    const recommendation = this.generateCorrelationRecommendation(
      emotionType,
      correlationCoefficient,
      difference
    );

    return {
      emotionType,
      correlationCoefficient: Math.round(correlationCoefficient * 100) / 100,
      significance,
      impactOnProfit: {
        lowEmotionProfit: Math.round(lowEmotionProfit * 100) / 100,
        highEmotionProfit: Math.round(highEmotionProfit * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        percentage: Math.round(percentage)
      },
      recommendation
    };
  }

  /**
   * ピアソン相関係数を計算
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSq = 0;
    let sumYSq = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumXSq += diffX * diffX;
      sumYSq += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSq * sumYSq);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * インサイトを生成
   */
  private generateInsights(history: EmotionalStateHistory[]): SentimentAnalysisReport['insights'] {
    if (history.length === 0) {
      return {
        dominantEmotion: 'N/A',
        emotionalStability: 50,
        emotionalVolatility: 0,
        bestEmotionalState: { fear: 3, greed: 3, confidence: 3, stress: 3 },
        worstEmotionalState: { fear: 3, greed: 3, confidence: 3, stress: 3 }
      };
    }

    // 平均感情レベルを計算
    const avgFear = history.reduce((sum, h) => sum + h.fear, 0) / history.length;
    const avgGreed = history.reduce((sum, h) => sum + h.greed, 0) / history.length;
    const avgConfidence = history.reduce((sum, h) => sum + h.confidence, 0) / history.length;
    const avgStress = history.reduce((sum, h) => sum + h.stress, 0) / history.length;

    // 優勢な感情を特定
    const emotions = {
      fear: avgFear,
      greed: avgGreed,
      confidence: avgConfidence,
      stress: avgStress
    };
    const dominantEmotion = Object.entries(emotions).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // 感情の安定性を計算（標準偏差の逆数）
    const overallEmotions = history.map(h => h.overall);
    const meanOverall = overallEmotions.reduce((a, b) => a + b, 0) / overallEmotions.length;
    const variance = overallEmotions.reduce((sum, val) => sum + Math.pow(val - meanOverall, 2), 0) / overallEmotions.length;
    const emotionalVolatility = Math.sqrt(variance);
    const emotionalStability = Math.max(0, 100 - emotionalVolatility * 20);

    // 最高・最悪の感情状態を特定
    const withProfit = history.filter(h => h.profit !== undefined);
    let bestState = { fear: 3, greed: 3, confidence: 3, stress: 3 };
    let worstState = { fear: 3, greed: 3, confidence: 3, stress: 3 };
    let maxProfit = -Infinity;
    let minProfit = Infinity;

    for (const h of withProfit) {
      if (h.profit! > maxProfit) {
        maxProfit = h.profit!;
        bestState = { fear: h.fear, greed: h.greed, confidence: h.confidence, stress: h.stress };
      }
      if (h.profit! < minProfit) {
        minProfit = h.profit!;
        worstState = { fear: h.fear, greed: h.greed, confidence: h.confidence, stress: h.stress };
      }
    }

    return {
      dominantEmotion,
      emotionalStability: Math.round(emotionalStability),
      emotionalVolatility: Math.round(emotionalVolatility * 100) / 100,
      bestEmotionalState: bestState,
      worstEmotionalState: worstState
    };
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(
    insights: SentimentAnalysisReport['insights'],
    correlations: EmotionTradeCorrelation[]
  ): string[] {
    const recommendations: string[] = [];

    // 優勢な感情に基づく推奨
    if (insights.dominantEmotion === 'fear' || insights.dominantEmotion === 'stress') {
      recommendations.push('恐怖やストレスが高い状態が続いています。リラクゼーション技法や休憩を取り入れてください。');
    } else if (insights.dominantEmotion === 'greed') {
      recommendations.push('貪欲が高まっている可能性があります。慎重になり、ポジションサイズを小さくしてください。');
    }

    // 感情の安定性に基づく推奨
    if (insights.emotionalStability < 50) {
      recommendations.push('感情の変動が大きいです。感情が安定するまで、取引規模を縮小してください。');
    }

    // 相関分析に基づく推奨
    for (const corr of correlations) {
      if (corr.significance === 'high') {
        if (corr.emotionType === 'fear' && corr.correlationCoefficient < -0.3) {
          recommendations.push('恐怖が高い時のパフォーマンスが低下しています。恐怖レベルが3以上の時は取引を控えてください。');
        } else if (corr.emotionType === 'greed' && corr.correlationCoefficient < -0.3) {
          recommendations.push('貪欲が高い時のパフォーマンスが低下しています。過度な自信には要注意です。');
        } else if (corr.emotionType === 'stress' && corr.correlationCoefficient < -0.3) {
          recommendations.push('ストレスが高い時の判断の質が低下しています。ストレス管理技法を実践してください。');
        } else if (corr.emotionType === 'confidence' && corr.correlationCoefficient > 0.3) {
          recommendations.push('自信が高い時ほどパフォーマンスが良いです。ただし、過度な自信には注意してください。');
        }
      }
    }

    // 最高の感情状態に基づく推奨
    const { bestEmotionalState } = insights;
    recommendations.push(
      `あなたの最高のパフォーマンス時の感情状態は、` +
      `恐怖: ${bestEmotionalState.fear}/5, ` +
      `貪欲: ${bestEmotionalState.greed}/5, ` +
      `自信: ${bestEmotionalState.confidence}/5, ` +
      `ストレス: ${bestEmotionalState.stress}/5 です。` +
      `この状態に近づくよう意識してください。`
    );

    return recommendations;
  }

  /**
   * 相関推奨メッセージを生成
   */
  private generateCorrelationRecommendation(
    emotionType: string,
    correlation: number,
    difference: number
  ): string {
    const emotionNames = {
      fear: '恐怖',
      greed: '貪欲',
      confidence: '自信',
      stress: 'ストレス'
    };

    const emotionName = emotionNames[emotionType as keyof typeof emotionNames];

    if (emotionType === 'fear' || emotionType === 'stress') {
      // 恐怖やストレスは低い方が良い
      if (correlation < -0.3) {
        return `${emotionName}が高い時、パフォーマンスが平均${Math.abs(difference).toFixed(0)}ドル低下しています。${emotionName}レベルが3以上の時は取引を控えてください。`;
      } else if (correlation > 0.3) {
        return `${emotionName}が高い時の方がパフォーマンスが良いという予想外の結果です。慎重に分析してください。`;
      } else {
        return `${emotionName}とパフォーマンスの間に明確な相関はありません。`;
      }
    } else if (emotionType === 'greed') {
      // 貪欲は中程度が良い
      if (correlation < -0.3) {
        return `貪欲が高い時、パフォーマンスが平均${Math.abs(difference).toFixed(0)}ドル低下しています。過度な自信は危険です。`;
      } else if (correlation > 0.3) {
        return `貪欲が高い時の方がパフォーマンスが良いですが、バランスが重要です。`;
      } else {
        return `貪欲とパフォーマンスの間に明確な相関はありません。中程度のレベル（3/5）を維持してください。`;
      }
    } else {
      // 自信は高い方が良い
      if (correlation > 0.3) {
        return `自信が高い時、パフォーマンスが平均${difference.toFixed(0)}ドル向上しています。自信を持って取引してください。`;
      } else if (correlation < -0.3) {
        return `自信が高い時の方がパフォーマンスが悪いという予想外の結果です。過度な自信に注意してください。`;
      } else {
        return `自信とパフォーマンスの間に明確な相関はありません。`;
      }
    }
  }

  /**
   * 感情値を0-100スケールに正規化
   */
  private normalizeEmotion(value: number, lowerIsBetter: boolean): number {
    // 1-5のスケールを0-100に変換
    const normalized = ((value - 1) / 4) * 100;
    return lowerIsBetter ? 100 - normalized : normalized;
  }

  /**
   * 恐怖・貪欲ラベルを取得
   */
  private getFearGreedLabel(value: number): FearGreedIndex['label'] {
    if (value <= 20) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Greed';
    return 'Extreme Greed';
  }

  /**
   * トレンドを計算
   */
  private calculateTrend(entries: JournalEntry[]): FearGreedIndex['trend'] {
    if (entries.length < 3) return 'stable';

    const recent = entries.slice(-3).filter(e => e.emotionAfter);
    if (recent.length < 3) return 'stable';

    const scores = recent.map(e => {
      if (!e.emotionAfter) return 50;
      return (e.emotionAfter.fear + e.emotionAfter.greed) / 2;
    });

    const first = scores[0];
    const last = scores[scores.length - 1];
    const diff = last - first;

    if (diff > 0.5) return 'increasing';
    if (diff < -0.5) return 'decreasing';
    return 'stable';
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
export const createSentimentAnalyzer = (
  config?: Partial<SentimentAnalysisConfig>
): SentimentAnalyzer => {
  return new SentimentAnalyzer(config);
};
