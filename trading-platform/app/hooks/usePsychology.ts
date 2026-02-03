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

    psychologyMonitorRef.current.recordTrade(order);

    // Generate alerts
    const alerts = psychologyMonitorRef.current.generatePsychologyAlerts();
    alerts.forEach(alert => psychologyState.addAlert(alert));

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

    const analysis = psychologyMonitorRef.current.detectBiases(order);
    psychologyState.setBiasAnalysis(analysis);
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
    psychologyState.setDisciplineScore(score);
    return score;
  };

  /**
   * 改善エリアを特定
   */
  const identifyImprovements = () => {
    if (!disciplineCalculatorRef.current || !psychologyState.disciplineScore) return [];

    return disciplineCalculatorRef.current.identifyImprovementAreas(
      psychologyState.disciplineScore
    );
  };

  /**
   * クーリングオフを手動で開始
   */
  const startManualCooldown = (minutes: number = 60) => {
    if (!coolingOffManagerRef.current) return;

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
    if (success) {
      psychologyState.endCooldown();
    }
    return success;
  };

  /**
   * 今日の統計を取得
   */
  const getTodayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return psychologyState.getCalendarDay(today);
  }, [psychologyState.calendar]);

  /**
   * 直近24時間のアラートを取得
   */
  const recentAlerts = useMemo(() => {
    return psychologyState.getRecentAlerts(24);
  }, [psychologyState.alerts]);

  return {
    // State
    alerts: psychologyState.alerts,
    currentBiasAnalysis: psychologyState.currentBiasAnalysis,
    consecutiveLossInfo: psychologyState.consecutiveLossInfo,
    currentEmotion: psychologyState.currentEmotion,
    tradePlans: psychologyState.tradePlans,
    reflections: psychologyState.reflections,
    currentCooldown: psychologyState.currentCooldown,
    disciplineScore: psychologyState.disciplineScore,
    goals: psychologyState.goals,

    // Computed
    recentAlerts,
    todayStats: getTodayStats,
    alertStats: psychologyState.getAlertStats(),

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
    addTradePlan: psychologyState.addTradePlan,
    updateTradePlan: psychologyState.updateTradePlan,
    deleteTradePlan: psychologyState.deleteTradePlan,
    getTradePlan: psychologyState.getTradePlan,
    addReflection: psychologyState.addReflection,
    getReflection: psychologyState.getReflection,
    updateGoals: psychologyState.updateGoals,
    updateCalendarDay: psychologyState.updateCalendarDay,
    setCurrentEmotion: psychologyState.setCurrentEmotion,

    // Services (refs for advanced usage)
    psychologyMonitor: psychologyMonitorRef.current,
    coolingOffManager: coolingOffManagerRef.current,
    disciplineCalculator: disciplineCalculatorRef.current
  };
}
