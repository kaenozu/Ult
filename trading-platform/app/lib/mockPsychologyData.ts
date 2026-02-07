/**
 * Psychology Mock Data
 * 
 * Provides mock/demo data for psychology features
 */

import type {
  MentalHealthMetrics,
  EmotionScore,
  CoachingRecommendation,
  PsychologyAnalysisResult,
} from '@/app/types/psychology';

/**
 * Generate mock mental health metrics
 */
export function generateMockMentalHealth(): MentalHealthMetrics {
  const disciplineScore = 75 + Math.random() * 20;
  const emotionalStability = 70 + Math.random() * 25;
  const stressLevel = 20 + Math.random() * 30;
  const fatigueLevel = 15 + Math.random() * 25;
  
  const overallScore = (
    disciplineScore * 0.3 +
    emotionalStability * 0.3 +
    (100 - stressLevel) * 0.2 +
    (100 - fatigueLevel) * 0.2
  );

  let state: 'optimal' | 'cautious' | 'stressed' | 'tilt' | 'burnout' = 'optimal';
  if (overallScore >= 75) {
    state = 'optimal';
  } else if (overallScore >= 60) {
    state = 'cautious';
  } else if (overallScore >= 45) {
    state = 'stressed';
  } else {
    state = 'tilt';
  }

  return {
    overall_score: overallScore,
    stress_level: stressLevel,
    discipline_score: disciplineScore,
    emotional_stability: emotionalStability,
    fatigue_level: fatigueLevel,
    state,
    days_since_break: Math.floor(Math.random() * 10),
    consecutive_losing_days: Math.floor(Math.random() * 3),
    consecutive_winning_days: Math.floor(Math.random() * 4),
    risk_of_tilt: stressLevel / 100 * 0.7,
    risk_of_burnout: fatigueLevel / 100 * 0.6,
    recommendations: [
      state !== 'optimal' ? '定期的な休憩を取ることを推奨します' : '良好な状態を維持してください',
    ],
  };
}

/**
 * Generate mock emotion scores
 */
export function generateMockEmotions(): EmotionScore[] {
  const emotions: EmotionScore[] = [];
  
  // Randomly select 1-3 emotions
  const emotionTypes = ['discipline', 'confidence', 'neutral', 'cautious'];
  const selectedCount = 1 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < selectedCount; i++) {
    const emotion = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
    emotions.push({
      emotion: emotion as 'discipline' | 'confidence' | 'neutral' | 'cautious',
      score: 0.5 + Math.random() * 0.4,
      confidence: 0.7 + Math.random() * 0.3,
      indicators: ['トレード履歴から検出'],
    });
  }
  
  return emotions;
}

/**
 * Generate mock coaching recommendations
 */
export function generateMockRecommendations(mentalHealth: MentalHealthMetrics): CoachingRecommendation[] {
  const recommendations: CoachingRecommendation[] = [];

  if (mentalHealth.state === 'stressed' || mentalHealth.state === 'tilt') {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: 'ストレスレベルが高い',
      message: `現在のストレスレベルは${mentalHealth.stress_level.toFixed(0)}です。休憩を取ることをお勧めします。`,
      actions: [
        '15分間の休憩を取る',
        '深呼吸を3回行う',
        'ストレッチをする',
        'トレード画面から離れる',
      ],
    });
  }

  if (mentalHealth.discipline_score < 70) {
    recommendations.push({
      type: 'advice',
      priority: 'medium',
      title: '規律スコアが低下',
      message: `規律スコアは${mentalHealth.discipline_score.toFixed(0)}です。トレードルールを再確認してください。`,
      actions: [
        'トレードルールを見直す',
        'ストップロスを必ず設定する',
        'ポジションサイズを守る',
        'トレード前チェックリストを使う',
      ],
    });
  }

  if (mentalHealth.consecutive_losing_days >= 2) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: '連続負けが続いています',
      message: `${mentalHealth.consecutive_losing_days}日連続で負けています。戦略を見直す時期かもしれません。`,
      actions: [
        '今日はトレードを控える',
        '戦略を再評価する',
        'バックテストを実施する',
        'メンターに相談する',
      ],
    });
  }

  if (mentalHealth.days_since_break > 7) {
    recommendations.push({
      type: 'info',
      priority: 'medium',
      title: '休憩が必要です',
      message: `${mentalHealth.days_since_break}日間休憩なしでトレードしています。`,
      actions: [
        '週末は完全に休む',
        '趣味の時間を作る',
        '運動する',
        '家族や友人と過ごす',
      ],
    });
  }

  // Always provide at least one positive or neutral recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      title: '良好な状態です',
      message: '現在の心理状態は良好です。この調子を維持しましょう。',
      actions: [
        '現在のルーティンを継続',
        'トレードジャーナルを記入',
        '成功したトレードを分析',
        '学習時間を確保',
      ],
    });
  }

  return recommendations;
}

/**
 * Generate mock psychology analysis result
 */
export function generateMockPsychologyAnalysis(): PsychologyAnalysisResult {
  const mentalHealth = generateMockMentalHealth();
  const emotions = generateMockEmotions();
  const recommendations = generateMockRecommendations(mentalHealth);

  let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
  if (mentalHealth.state === 'burnout' || mentalHealth.state === 'tilt') {
    warningLevel = 'critical';
  } else if (mentalHealth.state === 'stressed') {
    warningLevel = 'high';
  } else if (mentalHealth.state === 'cautious') {
    warningLevel = 'medium';
  } else if (mentalHealth.risk_of_tilt > 0.5) {
    warningLevel = 'low';
  }

  return {
    mental_health: mentalHealth,
    dominant_emotions: emotions,
    recent_violations: [],
    trading_pattern_issues: [],
    should_stop_trading: mentalHealth.state === 'tilt' || mentalHealth.state === 'burnout',
    warning_level: warningLevel,
    coaching_recommendations: recommendations,
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Get psychology data from local storage or generate mock
 */
export function getPsychologyData(): PsychologyAnalysisResult {
  // In production, this would fetch real analysis
  // For now, we generate mock data
  return generateMockPsychologyAnalysis();
}
