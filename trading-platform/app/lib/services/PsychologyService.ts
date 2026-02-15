import { Order, Position } from '@/app/types';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import type { MentalState, EmotionScore, CoachingRecommendation } from '@/app/types/psychology';
import { logger } from '@/app/core/logger';
import { TIME_INTERVALS } from '@/app/lib/constants/common';

/**
 * トレーダー心理分析サービス
 * 取引履歴や行動パターンからストレス、規律、感情状態を分析します。
 */
export class PsychologyService {
  /**
   * 最近の取引から心理メトリクスを更新する
   */
  analyze(orders: Order[], positions: Position[]): void {
    if (orders.length === 0) return;

    const recentOrders = orders.slice(-10); // 直近10件
    const filledOrders = recentOrders.filter(o => o.status === 'FILLED');
    
    if (filledOrders.length === 0) return;

    // 1. ストレスレベルの計算 (連敗や大きなドローダウンに基づく)
    const stressLevel = this.calculateStress(filledOrders);
    
    // 2. 規律スコアの計算 (計画外の取引や過剰な取引頻度)
    const disciplineScore = this.calculateDiscipline(filledOrders);
    
    // 3. 感情スコアの特定
    const emotions = this.identifyEmotions(filledOrders, stressLevel, disciplineScore);
    
    // 4. メンタル状態の決定
    const mentalState = this.determineMentalState(stressLevel, disciplineScore);
    
    // 5. タイト（感情的暴走）リスク
    const riskOfTilt = this.calculateTiltRisk(filledOrders, stressLevel);

    // ストアに反映
    const recommendations = this.generateRecommendations(mentalState, stressLevel, disciplineScore, riskOfTilt);
    
    usePsychologyStore.getState().updateMentalHealth({
      overall_score: Math.round((disciplineScore * 0.6) + ((100 - stressLevel) * 0.4)),
      stress_level: stressLevel,
      discipline_score: disciplineScore,
      emotional_stability: Math.max(0, 100 - stressLevel),
      fatigue_level: 0,
      state: mentalState,
      days_since_break: 0,
      consecutive_losing_days: 0,
      consecutive_winning_days: 0,
      risk_of_tilt: riskOfTilt,
      risk_of_burnout: mentalState === 'burnout' ? 0.8 : 0,
      recommendations: recommendations.map(r => r.message)
    });
    
    // CoachingRecommendationをactive_recommendationsに追加
    const store = usePsychologyStore.getState();
    recommendations.forEach(rec => {
      store.addRecommendation(rec);
    });

    if (mentalState === 'tilt' || mentalState === 'burnout') {
      logger.warn(`[Psychology] Critical mental state detected: ${mentalState}`);
    }
  }

  private calculateStress(orders: Order[]): number {
    let stress = 0;
    
    // 連敗チェック
    let consecutiveLosses = 0;
    for (let i = orders.length - 1; i >= 0; i--) {
      // 簡易的な損益判定（本来は約定価格と比較が必要）
      if (orders[i].side === 'SELL' && i > 0 && orders[i-1].side === 'BUY') {
        const profit = (orders[i].price || 0) - (orders[i-1].price || 0);
        if (profit < 0) consecutiveLosses++;
        else break;
      }
    }
    
    stress += Math.min(consecutiveLosses * 15, 60);
    
    // 取引密度のチェック（短時間に多すぎる取引）
    const lastOrder = orders[orders.length - 1];
    const firstOrder = orders[0];
    if (lastOrder?.timestamp !== undefined && firstOrder?.timestamp !== undefined) {
      const timeSpan = lastOrder.timestamp - firstOrder.timestamp;
      if (timeSpan < TIME_INTERVALS.UPDATE_30_MIN && orders.length > 5) {
        stress += 20;
      }
    }

    return Math.min(stress, 100);
  }

  private calculateDiscipline(orders: Order[]): number {
    let score = 100;
    
    // リベンジトレードの兆候（負けの直後に大きなサイズでエントリー）
    for (let i = 1; i < orders.length; i++) {
      const prevOrder = orders[i - 1];
      const currOrder = orders[i];
      if (prevOrder?.status === 'FILLED' && currOrder?.status === 'FILLED' &&
          prevOrder.timestamp !== undefined && currOrder.timestamp !== undefined) {
        // 前のトレードが損切りの可能性がある場合
        const timeDiff = currOrder.timestamp - prevOrder.timestamp;
        if (timeDiff < 5 * 60 * 1000) { // 5分以内
          score -= 10;
        }
      }
    }

    return Math.max(0, score);
  }

  private identifyEmotions(orders: Order[], stress: number, discipline: number): EmotionScore[] {
    const emotions: EmotionScore[] = [];

    if (stress > 50) {
      emotions.push({ emotion: 'anxiety', score: stress / 100, confidence: 0.8, indicators: ['連敗による不安'] });
    }

    if (discipline < 70) {
      emotions.push({ emotion: 'frustration', score: (100 - discipline) / 100, confidence: 0.75, indicators: ['短期的な再エントリー'] });
    }

    if (emotions.length === 0) {
      emotions.push({ emotion: 'discipline', score: 0.9, confidence: 0.9, indicators: ['安定した取引パターン'] });
    }

    return emotions;
  }

  private determineMentalState(stress: number, discipline: number): MentalState {
    if (stress > 80) return 'tilt';
    if (stress > 60 || discipline < 50) return 'stressed';
    if (stress > 30 || discipline < 80) return 'cautious';
    return 'optimal';
  }

  private calculateTiltRisk(orders: Order[], stress: number): number {
    if (stress > 70) return 0.8;
    if (stress > 40) return 0.4;
    return 0.1;
  }

  private generateRecommendations(state: MentalState, stress: number, discipline: number, tiltRisk: number): CoachingRecommendation[] {
    const recs: CoachingRecommendation[] = [];
    const timestamp = new Date().toISOString();

    if (state === 'tilt') {
      recs.push({
        type: 'urgent',
        priority: 'critical',
        title: '取引停止の警告',
        message: '⚠️ 即座に取引を停止してください。感情的な判断が先行しています。',
        actions: ['プラットフォームを閉じる', '24時間相場から離れる'],
        timestamp,
        dismissed: false
      });
    } else if (state === 'stressed') {
      recs.push({
        type: 'warning',
        priority: 'high',
        title: 'ストレスレベル上昇',
        message: 'ストレスレベルが高まっています。次の取引の前に15分の休憩をとってください。',
        actions: ['15分休憩を取る', 'ポジションサイズを半分にする'],
        timestamp,
        dismissed: false
      });
    } else if (discipline < 80) {
      recs.push({
        type: 'advice',
        priority: 'medium',
        title: '規律スコア低下',
        message: '規律スコアが低下しています。エントリー前にチェックリストを再確認してください。',
        actions: ['チェックリストを確認', '取引計画を見直す'],
        timestamp,
        dismissed: false
      });
    } else {
      recs.push({
        type: 'info',
        priority: 'low',
        title: '良好なメンタル状態',
        message: 'メンタル状態は良好です。計画通りのトレードを維持してください。',
        actions: ['現在の戦略を継続'],
        timestamp,
        dismissed: false
      });
    }

    return recs;
  }
}

export const psychologyService = new PsychologyService();