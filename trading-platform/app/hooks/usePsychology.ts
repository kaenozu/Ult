/**
 * Psychology Management Hook
 * 
 * TRADING-025: トレーディング心理学と感情取引防止機能のフック
 * 心理監視、クーリングオフ、規律スコアの計算を簡単に使えるようにする
 */

import { useEffect, useMemo } from 'react';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import { useJournalStore } from '@/app/store/journalStore';
import { PsychologyMonitor } from '@/app/lib/risk/PsychologyMonitor';
import { CoolingOffManager } from '@/app/lib/risk/CoolingOffManager';
import { DisciplineScoreCalculator } from '@/app/lib/psychology/DisciplineScoreCalculator';
import { Order } from '@/app/types';

// Singleton instances
let psychologyMonitor: PsychologyMonitor | null = null;
let coolingOffManager: CoolingOffManager | null = null;
let disciplineCalculator: DisciplineScoreCalculator | null = null;

/**
 * 心理管理フック
 */
export function usePsychology() {
  const psychologyState = usePsychologyStore();
  const { journal } = useJournalStore();

  // Initialize services
  useEffect(() => {
    if (!psychologyMonitor) {
      psychologyMonitor = new PsychologyMonitor();
    }
    if (!coolingOffManager) {
      coolingOffManager = new CoolingOffManager();
    }
    if (!disciplineCalculator) {
      disciplineCalculator = new DisciplineScoreCalculator();
    }
  }, []);

  /**
   * 取引を記録し、心理分析を実行
   */
  const recordTrade = (order: Order) => {
    if (!psychologyMonitor) return;

    psychologyMonitor.recordTrade(order);

    // Generate alerts
    const alerts = psychologyMonitor.generatePsychologyAlerts();
    alerts.forEach(alert => psychologyState.addAlert(alert));

    // Check if cooling off should be triggered
    const metrics = psychologyMonitor.analyzeTradingBehavior();
    if (metrics.consecutiveLosses >= 3 && coolingOffManager) {
      const cooldown = coolingOffManager.enforceCoolingOff({
        type: 'consecutive_losses',
        severity: Math.min(10, metrics.consecutiveLosses),
        triggerValue: metrics.consecutiveLosses
      });
      psychologyState.startCooldown(cooldown);
    }
  };

  /**
   * バイアス分析を実行
   */
  const analyzeBias = (order: Order) => {
    if (!psychologyMonitor) return null;

    const analysis = psychologyMonitor.detectBiases(order);
    psychologyState.setBiasAnalysis(analysis);
    return analysis;
  };

  /**
   * 取引可否をチェック
   */
  const canTrade = () => {
    if (!coolingOffManager) return { allowed: true };
    return coolingOffManager.canTrade();
  };

  /**
   * 規律スコアを計算
   */
  const calculateDisciplineScore = () => {
    if (!disciplineCalculator) return null;

    const score = disciplineCalculator.calculateDisciplineScore(
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
    if (!disciplineCalculator || !psychologyState.disciplineScore) return [];

    return disciplineCalculator.identifyImprovementAreas(
      psychologyState.disciplineScore
    );
  };

  /**
   * クーリングオフを手動で開始
   */
  const startManualCooldown = (minutes: number = 60) => {
    if (!coolingOffManager) return;

    const cooldown = coolingOffManager.enforceCoolingOff({
      type: 'manual',
      severity: Math.ceil(minutes / 60), // 1-10 scale based on hours
      triggerValue: minutes
    });
    psychologyState.startCooldown(cooldown);
  };

  /**
   * クーリングオフを手動で終了
   */
  const endManualCooldown = () => {
    if (!coolingOffManager) return false;

    const success = coolingOffManager.manualEndCooldown();
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

    // Services
    psychologyMonitor,
    coolingOffManager,
    disciplineCalculator
  };
}
