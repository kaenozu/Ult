/**
 * Psychology Store
 * 
 * TRADING-025: トレーディング心理学と感情取引防止機能のストア
 * 心理状態、クーリングオフ、規律スコア、感情ログなどを管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PsychologyAlert,
  BiasAnalysis,
  ConsecutiveLossInfo,
  EmotionLevel,
  TradePlan,
  TradeReflection,
  CooldownRecord,
  DisciplineScore,
  PsychologyGoals,
  TradingCalendarDay
} from '@/app/types/risk';

interface PsychologyState {
  // Alerts
  alerts: PsychologyAlert[];
  
  // Current bias analysis
  currentBiasAnalysis: BiasAnalysis | null;
  
  // Consecutive loss tracking
  consecutiveLossInfo: ConsecutiveLossInfo | null;
  
  // Current emotion state
  currentEmotion: EmotionLevel | null;
  
  // Trade plans
  tradePlans: TradePlan[];
  
  // Trade reflections
  reflections: TradeReflection[];
  
  // Cooling-off records
  cooldownRecords: CooldownRecord[];
  currentCooldown: CooldownRecord | null;
  
  // Discipline score
  disciplineScore: DisciplineScore | null;
  
  // Goals
  goals: PsychologyGoals;
  
  // Trading calendar
  calendar: Record<string, TradingCalendarDay>; // key: YYYY-MM-DD
  
  // Actions
  addAlert: (alert: PsychologyAlert) => void;
  clearAlerts: () => void;
  dismissAlert: (timestamp: Date) => void;
  
  setBiasAnalysis: (analysis: BiasAnalysis) => void;
  setConsecutiveLossInfo: (info: ConsecutiveLossInfo) => void;
  setCurrentEmotion: (emotion: EmotionLevel) => void;
  
  addTradePlan: (plan: TradePlan) => void;
  updateTradePlan: (id: string, updates: Partial<TradePlan>) => void;
  deleteTradePlan: (id: string) => void;
  getTradePlan: (id: string) => TradePlan | undefined;
  
  addReflection: (reflection: TradeReflection) => void;
  getReflection: (tradeId: string) => TradeReflection | undefined;
  
  startCooldown: (cooldown: CooldownRecord) => void;
  endCooldown: () => void;
  recordCooldownViolation: () => void;
  
  setDisciplineScore: (score: DisciplineScore) => void;
  
  updateGoals: (goals: Partial<PsychologyGoals>) => void;
  
  updateCalendarDay: (date: string, day: Partial<TradingCalendarDay>) => void;
  getCalendarDay: (date: string) => TradingCalendarDay | undefined;
  
  // Statistics
  getAlertStats: () => {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  
  getRecentAlerts: (hours: number) => PsychologyAlert[];
  
  reset: () => void;
}

const defaultGoals: PsychologyGoals = {
  daily: {
    maxTrades: 5,
    maxLoss: 1000,
    minDisciplineScore: 70
  },
  weekly: {
    maxConsecutiveLosses: 2,
    minJournalRate: 80,
    targetEmotionScore: 7
  },
  monthly: {
    targetDisciplineScore: 80,
    planAdherenceTarget: 80
  }
};

export const usePsychologyStore = create<PsychologyState>()(
  persist(
    (set, get) => ({
      // Initial state
      alerts: [],
      currentBiasAnalysis: null,
      consecutiveLossInfo: null,
      currentEmotion: null,
      tradePlans: [],
      reflections: [],
      cooldownRecords: [],
      currentCooldown: null,
      disciplineScore: null,
      goals: defaultGoals,
      calendar: {},

      // Alert actions
      addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts]
      })),

      clearAlerts: () => set({ alerts: [] }),

      dismissAlert: (timestamp) => set((state) => ({
        alerts: state.alerts.filter(a => a.timestamp.getTime() !== timestamp.getTime())
      })),

      // Bias analysis actions
      setBiasAnalysis: (analysis) => set({ currentBiasAnalysis: analysis }),

      setConsecutiveLossInfo: (info) => set({ consecutiveLossInfo: info }),

      setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),

      // Trade plan actions
      addTradePlan: (plan) => set((state) => ({
        tradePlans: [plan, ...state.tradePlans]
      })),

      updateTradePlan: (id, updates) => set((state) => ({
        tradePlans: state.tradePlans.map(plan =>
          plan.id === id ? { ...plan, ...updates } : plan
        )
      })),

      deleteTradePlan: (id) => set((state) => ({
        tradePlans: state.tradePlans.filter(plan => plan.id !== id)
      })),

      getTradePlan: (id) => {
        return get().tradePlans.find(plan => plan.id === id);
      },

      // Reflection actions
      addReflection: (reflection) => set((state) => ({
        reflections: [reflection, ...state.reflections]
      })),

      getReflection: (tradeId) => {
        return get().reflections.find(r => r.tradeId === tradeId);
      },

      // Cooldown actions
      startCooldown: (cooldown) => set((state) => ({
        currentCooldown: cooldown,
        cooldownRecords: [cooldown, ...state.cooldownRecords]
      })),

      endCooldown: () => set({ currentCooldown: null }),

      recordCooldownViolation: () => set((state) => {
        if (!state.currentCooldown) return state;
        
        const updated = {
          ...state.currentCooldown,
          violationCount: state.currentCooldown.violationCount + 1,
          wasRespected: false
        };
        
        return {
          currentCooldown: updated,
          cooldownRecords: state.cooldownRecords.map(r =>
            r.id === updated.id ? updated : r
          )
        };
      }),

      // Discipline score actions
      setDisciplineScore: (score) => set({ disciplineScore: score }),

      // Goals actions
      updateGoals: (goals) => set((state) => ({
        goals: {
          daily: { ...state.goals.daily, ...goals.daily },
          weekly: { ...state.goals.weekly, ...goals.weekly },
          monthly: { ...state.goals.monthly, ...goals.monthly }
        }
      })),

      // Calendar actions
      updateCalendarDay: (date, updates) => set((state) => {
        const existing = state.calendar[date] || {
          date,
          tradesCount: 0,
          profitLoss: 0,
          emotionScore: 0,
          disciplineScore: 0,
          hasViolation: false,
          isCoolingOff: false,
          notes: ''
        };
        
        return {
          calendar: {
            ...state.calendar,
            [date]: { ...existing, ...updates }
          }
        };
      }),

      getCalendarDay: (date) => {
        return get().calendar[date];
      },

      // Statistics
      getAlertStats: () => {
        const alerts = get().alerts;
        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};

        alerts.forEach(alert => {
          byType[alert.type] = (byType[alert.type] || 0) + 1;
          bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        });

        return {
          total: alerts.length,
          byType,
          bySeverity
        };
      },

      getRecentAlerts: (hours) => {
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        return get().alerts.filter(alert => alert.timestamp.getTime() >= cutoff);
      },

      // Reset
      reset: () => set({
        alerts: [],
        currentBiasAnalysis: null,
        consecutiveLossInfo: null,
        currentEmotion: null,
        tradePlans: [],
        reflections: [],
        cooldownRecords: [],
        currentCooldown: null,
        disciplineScore: null,
        goals: defaultGoals,
        calendar: {}
      })
    }),
    {
      name: 'psychology-storage',
      // Custom serialization for Date objects
      partialize: (state) => ({
        ...state,
        alerts: state.alerts.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString()
        }))
      })
    }
  )
);
