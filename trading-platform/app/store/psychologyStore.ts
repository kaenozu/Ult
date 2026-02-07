/**
 * Psychology Store
 * 
 * TRADING-025: トレーディング心理学と感情取引防止機能のストア
 * 心理状態、クーリングオフ、規律スコア、感情ログなどを管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PsychologyAlert as RiskPsychologyAlert,
  CooldownRecord,
  DisciplineScore as RiskDisciplineScore
} from '@/app/types/risk';
import type {
  MentalHealthMetrics,
  EmotionScore,
  CoachingRecommendation,
  DisciplineRules,
  TradingSession as PsychologySession,
  PsychologyAnalysisResult,
  DisciplineScoreProps,
  PsychologyAlert as PsychologyAlertType,
} from '@/app/types/psychology';

// Define local interfaces for types not present in main type files
interface PsychologyGoals {
  daily: Record<string, unknown>;
  weekly: Record<string, unknown>;
  monthly: Record<string, unknown>;
}

interface TradingCalendarDay {
  date: string;
  isTradingDay: boolean;
  tradesCount?: number;
  profitLoss?: number;
  emotionScore?: number;
  disciplineScore?: number;
  hasViolation?: boolean;
  isCoolingOff?: boolean;
  notes?: string;
}

interface PsychologyState {
  // Alerts
  alerts: PsychologyAlertType[];
  
  // Current bias analysis (using mental health metrics as a proxy)
  currentMentalHealth?: MentalHealthMetrics;
  
  // Cooling-off records
  cooldownRecords: CooldownRecord[];
  currentCooldown: CooldownRecord | null;
  
  // Discipline score
  disciplineScore: DisciplineScoreProps | null;
  
  // Goals
  goals: PsychologyGoals;
  
  // Trading calendar
  calendar: Record<string, TradingCalendarDay>; // key: YYYY-MM-DD
  
  // Trade Plans & Reflections
  tradePlans: any[];
  reflections: any[];

  // Enhanced Psychology Features
  current_emotions: EmotionScore[];
  active_recommendations: CoachingRecommendation[];
  discipline_rules: DisciplineRules;
  alerts_enabled: boolean;
  coaching_enabled: boolean;
  sessions: PsychologySession[];
  analysis_history: PsychologyAnalysisResult[];
  
  // Actions
  addAlert: (alert: PsychologyAlertType) => void;
  clearAlerts: () => void;
  dismissAlert: (id: string | Date) => void;
  getAlertStats: () => any;
  getRecentAlerts: (hours: number) => PsychologyAlertType[];
  
  setMentalHealth: (metrics: MentalHealthMetrics) => void;
  
  startCooldown: (cooldown: CooldownRecord) => void;
  endCooldown: () => void;
  recordCooldownViolation: () => void;
  
  setDisciplineScore: (score: DisciplineScoreProps) => void;
  
  updateGoals: (goals: Partial<PsychologyGoals>) => void;
  
  updateCalendarDay: (date: string, day: Partial<TradingCalendarDay>) => void;
  getCalendarDay: (date: string) => TradingCalendarDay | undefined;
  
  // Trade Plan Actions
  addTradePlan: (plan: any) => void;
  updateTradePlan: (id: string, plan: any) => void;
  deleteTradePlan: (id: string) => void;
  getTradePlan: (id: string) => any;

  // Reflection Actions
  addReflection: (reflection: any) => void;
  getReflection: (tradeId: string) => any;

  // Enhanced Psychology Actions
  addEmotion: (emotion: EmotionScore) => void;
  addRecommendation: (recommendation: CoachingRecommendation) => void;
  dismissRecommendation: (index: number) => void;
  updateDisciplineRules: (rules: Partial<DisciplineRules>) => void;
  addSession: (session: PsychologySession) => void;
  addAnalysis: (analysis: PsychologyAnalysisResult) => void;
  resetPsychology: () => void;
  
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
      currentMentalHealth: undefined,
      cooldownRecords: [],
      currentCooldown: null,
      disciplineScore: null,
      goals: defaultGoals,
      calendar: {},
      tradePlans: [],
      reflections: [],

      // Enhanced Psychology state
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

      dismissAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => {
          if (id instanceof Date) {
            return (a.timestamp as any) !== id;
          }
          return a.id !== id;
        })
      })),

      getAlertStats: () => {
        const { alerts } = get();
        return {
          total: alerts.length,
          byType: alerts.reduce((acc: any, a) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
          }, {}),
          bySeverity: alerts.reduce((acc: any, a) => {
            acc[a.severity] = (acc[a.severity] || 0) + 1;
            return acc;
          }, {})
        };
      },

      getRecentAlerts: (hours) => {
        const { alerts } = get();
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        return alerts.filter(a => new Date(a.timestamp).getTime() > cutoff);
      },

      // Mental health actions
      setMentalHealth: (metrics) => set({ currentMentalHealth: metrics }),

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
          isTradingDay: true,
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

      // Trade Plan Actions
      addTradePlan: (plan) => set((state) => ({
        tradePlans: [plan, ...state.tradePlans]
      })),

      updateTradePlan: (id, updates) => set((state) => ({
        tradePlans: state.tradePlans.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      deleteTradePlan: (id) => set((state) => ({
        tradePlans: state.tradePlans.filter(p => p.id !== id)
      })),

      getTradePlan: (id) => get().tradePlans.find(p => p.id === id),

      // Reflection Actions
      addReflection: (reflection) => set((state) => ({
        reflections: [reflection, ...state.reflections]
      })),

      getReflection: (tradeId) => get().reflections.find(r => r.tradeId === tradeId),

      // Enhanced Psychology Actions
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
          currentMentalHealth: analysis.mental_health,
          current_emotions: analysis.dominant_emotions,
          active_recommendations: [
            ...analysis.coaching_recommendations.filter(r => !r.dismissed),
            ...state.active_recommendations,
          ].slice(0, 10),
        }));
      },

      resetPsychology: () => {
        set({
          currentMentalHealth: undefined,
          current_emotions: [],
          active_recommendations: [],
          sessions: [],
          analysis_history: [],
        });
      },

      // Reset
      reset: () => set({
        alerts: [],
        currentMentalHealth: undefined,
        cooldownRecords: [],
        currentCooldown: null,
        disciplineScore: null,
        goals: defaultGoals,
        calendar: {},
        tradePlans: [],
        reflections: [],
        current_emotions: [],
        active_recommendations: [],
        sessions: [],
        analysis_history: [],
      })
    }),
    {
      name: 'psychology-storage',
      partialize: (state) => ({
        ...state,
        alerts: state.alerts.map(a => ({
          ...a,
          timestamp: typeof a.timestamp === 'string' ? a.timestamp : a.timestamp
        })),
        sessions: state.sessions.slice(0, 10),
        analysis_history: state.analysis_history.slice(0, 5),
      })
    }
  )
);