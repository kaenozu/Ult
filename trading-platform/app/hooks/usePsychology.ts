/**
 * Psychology Management Hook
 * 
 * TRADING-025: トレーディング心理学と感情取引防止機能のフック
 * 心理監視、クーリングオフ、規律スコアの計算を簡単に使えるようにする
 */

import { useEffect, useMemo, useRef } from 'react';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import { useJournalStore } from '@/app/store/journalStore';
import { PsychologyMonitor } from '@/app/lib/risk/PsychologyMonitor';
import { CoolingOffManager } from '@/app/lib/risk/CoolingOffManager';
import { DisciplineScoreCalculator } from '@/app/lib/psychology/DisciplineScoreCalculator';
import { Order } from '@/app/types';
import type { DisciplineScoreProps, PsychologyAlert } from '@/app/types/psychology';
import type { DisciplineScore, PsychologyAlert as RiskPsychologyAlert } from '@/app/types/risk';

/**
 * 心理管理フック
 */
export function usePsychology() {
  const psychologyState = usePsychologyStore();
  const { journal } = useJournalStore();

  // Use refs to maintain singleton instances per component
  const psychologyMonitorRef = useRef<PsychologyMonitor | null>(null);
  const coolingOffManagerRef = useRef<CoolingOffManager | null>(null);
  const disciplineCalculatorRef = useRef<DisciplineScoreCalculator | null>(null);

  // Initialize services
  useEffect(() => {
    if (!psychologyMonitorRef.current) {
      psychologyMonitorRef.current = new PsychologyMonitor();
    }
    if (!coolingOffManagerRef.current) {
      coolingOffManagerRef.current = new CoolingOffManager();
    }
    if (!disciplineCalculatorRef.current) {
      disciplineCalculatorRef.current = new DisciplineScoreCalculator();
    }
  }, []);

  /**
   * 取引を記録し、心理分析を実行
   */
  const recordTrade = (order: Order) => {
    if (!psychologyMonitorRef.current) return;

    // Security: Validate order object to prevent injection
    if (!order || typeof order !== 'object') {
      console.error('Invalid order: must be a valid Order object');
      return;
    }

    psychologyMonitorRef.current.recordTrade(order);

    // Generate alerts
    const alerts = psychologyMonitorRef.current.generatePsychologyAlerts();
    alerts.forEach((alert: RiskPsychologyAlert) => {
      // Map RiskPsychologyAlert to PsychologyAlert
      const newAlert: PsychologyAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: alert.type === 'overtrading' ? 'violation' : (alert.type === 'revenge_trading' ? 'tilt' : 'stress'),
        severity: alert.severity === 'high' ? 'critical' : (alert.severity === 'medium' ? 'warning' : 'info'),
        title: alert.type.toUpperCase(),
        message: alert.message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        requires_action: true,
        suggested_action: alert.recommendation
      };
      psychologyState.addAlert(newAlert);
    });

    // Check if cooling off should be triggered
    const metrics = psychologyMonitorRef.current.analyzeTradingBehavior();
    if (metrics.consecutiveLosses >= 3 && coolingOffManagerRef.current) {
      const cooldown = coolingOffManagerRef.current.enforceCoolingOff({
        type: 'consecutive_losses',
        severity: Math.min(10, metrics.consecutiveLosses),
        triggerValue: metrics.consecutiveLosses,
        description: `${metrics.consecutiveLosses} consecutive losses detected`
      });
      psychologyState.startCooldown(cooldown);
    }
  };

  /**
   * バイアス分析を実行
   */
  const analyzeBias = (order: Order) => {
    if (!psychologyMonitorRef.current) return null;

    // Security: Validate order object
    if (!order || typeof order !== 'object') {
      console.error('Invalid order: must be a valid Order object');
      return null;
    }

    const analysis = psychologyMonitorRef.current.detectBiases(order);
    // Bias analysis result is now part of mental health metrics in the new store
    // This is a simplified mapping
    return analysis;
  };

  /**
   * 取引可否をチェック
   */
  const canTrade = () => {
    if (!coolingOffManagerRef.current) return { allowed: true };
    return coolingOffManagerRef.current.canTrade();
  };

  /**
   * 規律スコアを計算
   */
  const calculateDisciplineScore = () => {
    if (!disciplineCalculatorRef.current) return null;

    const score = disciplineCalculatorRef.current.calculateDisciplineScore(
      journal,
      psychologyState.cooldownRecords
    );
    psychologyState.setDisciplineScore(typeof score === 'number' ? score : score.overall);
    return score;
  };

  /**
   * 改善エリアを特定
   */
  const identifyImprovements = () => {
    if (!disciplineCalculatorRef.current || !psychologyState.disciplineScore) return [];

    return disciplineCalculatorRef.current.identifyImprovementAreas(
      psychologyState.disciplineScore as unknown as DisciplineScore
    );
  };

  /**
   * クーリングオフを手動で開始
   */
  const startManualCooldown = (minutes: number = 60) => {
    if (!coolingOffManagerRef.current) return;

    // Security: Validate minutes parameter to prevent abuse
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) { // Max 24 hours
      console.error('Invalid cooldown duration: must be between 1 and 1440 minutes');
      return;
    }

    const cooldown = coolingOffManagerRef.current.enforceCoolingOff({
      type: 'manual',
      severity: Math.ceil(minutes / 60), // 1-10 scale based on hours
      triggerValue: minutes,
      description: `Manual cooldown for ${minutes} minutes`
    });
    psychologyState.startCooldown(cooldown);
  };

  /**
   * クーリングオフを手動で終了
   */
  const endManualCooldown = () => {
    if (!coolingOffManagerRef.current) return false;

    const success = coolingOffManagerRef.current.manualEndCooldown();
    if (success && psychologyState.currentCooldown) {
      psychologyState.endCooldown(psychologyState.currentCooldown.id);
    }
    return success;
  };

  /**
   * 今日の統計を取得
   */
  const getTodayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return psychologyState.getCalendarDay(today);
  }, [psychologyState]);

  /**
   * 直近24時間のアラートを取得
   */
  const recentAlerts = useMemo(() => {
    const now = new Date().getTime();
    const cutoff = now - 24 * 60 * 60 * 1000;
    return psychologyState.alerts.filter(a => new Date(a.timestamp).getTime() >= cutoff);
  }, [psychologyState]);

  return {
    // State
    alerts: psychologyState.alerts,
    currentMentalHealth: psychologyState.current_mental_health,
    currentEmotions: psychologyState.current_emotions,
    currentCooldown: psychologyState.currentCooldown,
    disciplineScore: psychologyState.disciplineScore,
    goals: psychologyState.goals,

    // Computed
    recentAlerts,
    todayStats: getTodayStats,

    // Actions
    recordTrade,
    analyzeBias,
    canTrade,
    calculateDisciplineScore,
    identifyImprovements,
    startManualCooldown,
    endManualCooldown,

    // Store actions
    addAlert: psychologyState.addAlert,
    clearAlerts: psychologyState.clearAlerts,
    dismissAlert: psychologyState.dismissAlert,
    updateGoals: psychologyState.updateGoals,
    updateCalendarDay: psychologyState.updateCalendarDay,
    addEmotion: psychologyState.addEmotion,

    // Services (using callbacks for safe access)
    getPsychologyMonitor: () => psychologyMonitorRef.current,
    getCoolingOffManager: () => coolingOffManagerRef.current,
    getDisciplineCalculator: () => disciplineCalculatorRef.current
  };
}