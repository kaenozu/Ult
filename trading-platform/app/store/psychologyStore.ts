/**
 * Psychology Store
 * 
 * TRADING-025: トレーディング心理学と感情取引防止機能のストア
 * 心理状態、クーリングオフ、規律スコア、感情ログなどを管理
 * Enhanced with comprehensive emotion detection and mental health tracking
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
import type {
  MentalHealthMetrics,
  EmotionScore,
  CoachingRecommendation,
  DisciplineRules,
  TradingSession as PsychologySession,
  PsychologyAnalysisResult,
} from '@/app/types/psychology';

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
  
  // Enhanced Psychology Features
  current_mental_health?: MentalHealthMetrics;
  current_emotions: EmotionScore[];
  active_recommendations: CoachingRecommendation[];
  discipline_rules: DisciplineRules;
  alerts_enabled: boolean;
  coaching_enabled: boolean;
  sessions: PsychologySession[];
  analysis_history: PsychologyAnalysisResult[];
  
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
  
  // Enhanced Psychology Actions
  updateMentalHealth: (metrics: MentalHealthMetrics) => void;
  addEmotion: (emotion: EmotionScore) => void;
  addRecommendation: (recommendation: CoachingRecommendation) => void;
  dismissRecommendation: (index: number) => void;
  updateDisciplineRules: (rules: Partial<DisciplineRules>) => void;
  addSession: (session: PsychologySession) => void;
  addAnalysis: (analysis: PsychologyAnalysisResult) => void;
  resetPsychology: () => void;
  
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

      // Enhanced Psychology state
      current_mental_health: undefined,
      current_emotions: [],
      active_recommendations: [],
      discipline_rules: {
        max_position_size: 10000,
        max_daily_loss: 1000,
        max_risk_per_trade: 200,
        max_trades_per_day: 10,
        min_risk_reward_ratio: 1.5,
        required_stop_loss: true,
        max_consecutive_losses: 3,
        max_trading_hours: 8,
      },
      alerts_enabled: true,
      coaching_enabled: true,
      sessions: [],
      analysis_history: [],

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

      // Enhanced Psychology Actions
      updateMentalHealth: (metrics: MentalHealthMetrics) => {
        set({ current_mental_health: metrics });
      },

      addEmotion: (emotion: EmotionScore) => {
        set((state) => ({
          current_emotions: [...state.current_emotions, emotion].slice(-5), // Keep last 5
        }));
      },

      addRecommendation: (recommendation: CoachingRecommendation) => {
        set((state) => ({
          active_recommendations: [recommendation, ...state.active_recommendations].slice(0, 10),
        }));
      },

      dismissRecommendation: (index: number) => {
        set((state) => ({
          active_recommendations: state.active_recommendations.filter((_, i) => i !== index),
        }));
      },

      updateDisciplineRules: (rules: Partial<DisciplineRules>) => {
        set((state) => ({
          discipline_rules: {
            ...state.discipline_rules,
            ...rules,
          },
        }));
      },

      addSession: (session: PsychologySession) => {
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 50), // Keep last 50 sessions
        }));
      },

      addAnalysis: (analysis: PsychologyAnalysisResult) => {
        set((state) => ({
          analysis_history: [analysis, ...state.analysis_history].slice(0, 30),
          current_mental_health: analysis.mental_health,
          current_emotions: analysis.dominant_emotions,
          active_recommendations: [
            ...analysis.coaching_recommendations.filter(r => !r.dismissed),
            ...state.active_recommendations,
          ].slice(0, 10),
        }));
      },

      resetPsychology: () => {
        set({
          current_mental_health: undefined,
          current_emotions: [],
          active_recommendations: [],
          sessions: [],
          analysis_history: [],
        });
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
        calendar: {},
        current_mental_health: undefined,
        current_emotions: [],
        active_recommendations: [],
        sessions: [],
        analysis_history: [],
      })
    }),
    {
      name: 'psychology-storage',
      // Custom serialization for Date objects and selective persistence
      partialize: (state) => ({
        ...state,
        alerts: state.alerts.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString()
        })),
        sessions: state.sessions.slice(0, 10),
        analysis_history: state.analysis_history.slice(0, 5),
      })
    }
  )
);
