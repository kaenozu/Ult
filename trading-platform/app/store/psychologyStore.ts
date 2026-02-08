import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CooldownRecord,
} from '@/app/types/risk';
import type {
  PsychologyAlert,
  MentalHealthMetrics,
  DisciplineRules,
  DisciplineViolation,
  EmotionScore,
  CoachingRecommendation,
  TradingSession,
  PsychologyAnalysisResult,
  EmotionType,
  MentalState,
  CoachingPriority,
  CoachingType,
  WarningLevel,
  EnhancedJournalEntry,
} from '@/app/types/psychology';

// ============================================================================
// Trade Plan Types
// ============================================================================

export interface TradePlan {
  id: string;
  symbol: string;
  strategy: string;
  entryReason: string;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  positionSize: number;
  createdAt: Date;
}

// ============================================================================
// Reflection Types
// ============================================================================

export interface Reflection {
  tradeId: string;
  lessonsLearned: string;
  whatWorked: string;
  whatDidntWork: string;
  emotionalState: {
    fear: number;
    greed: number;
    confidence: number;
    stress: number;
    overall: number;
  };
  wouldDoAgain: boolean;
  improvementAreas: string[];
  createdAt: Date;
}

// ============================================================================
// Goals Types
// ============================================================================

export interface DailyGoal {
  maxTrades: number;
  maxLoss: number;
  minDisciplineScore: number;
}

export interface WeeklyGoal {
  maxTrades: number;
  maxLoss: number;
  minDisciplineScore: number;
}

export interface MonthlyGoal {
  maxTrades: number;
  maxLoss: number;
  minDisciplineScore: number;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarDay {
  tradesCount: number;
  profitLoss: number;
  emotionScore: number;
}

// ============================================================================
// Complete Store State
// ============================================================================

export interface PsychologyStoreState {
  // Current mental health
  current_mental_health?: MentalHealthMetrics;

  // Current emotions
  current_emotions: EmotionScore[];

  // Active coaching recommendations
  active_recommendations: CoachingRecommendation[];

  // Discipline settings
  discipline_rules: DisciplineRules;
  alerts_enabled: boolean;
  coaching_enabled: boolean;

  // Alert management
  alerts: PsychologyAlert[];

  // Trade planning
  tradePlans: TradePlan[];

  // Reflections
  reflections: Reflection[];

  // Cooldown management
  currentCooldown: CooldownRecord | null;
  cooldownRecords: CooldownRecord[];

  // Goals
  goals: {
    daily: DailyGoal;
    weekly?: WeeklyGoal;
    monthly?: MonthlyGoal;
  };

  // Calendar tracking
  calendar: Record<string, CalendarDay>;

  // Trading sessions history
  sessions: TradingSession[];

  // Analysis history
  analysis_history: PsychologyAnalysisResult[];

  // Actions
  updateMentalHealth: (metrics: MentalHealthMetrics) => void;
  addEmotion: (emotion: EmotionScore) => void;
  addRecommendation: (recommendation: CoachingRecommendation) => void;
  dismissRecommendation: (index: number) => void;
  updateDisciplineRules: (rules: Partial<DisciplineRules>) => void;
  addSession: (session: TradingSession) => void;
  addAnalysis: (analysis: PsychologyAnalysisResult) => void;
  resetState: () => void;

  // Alert actions
  addAlert: (alert: PsychologyAlert) => void;
  clearAlerts: () => void;
  dismissAlert: (timestamp: string) => void;
  getAlertStats: () => {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  getRecentAlerts: (hours: number) => PsychologyAlert[];

  // Trade plan actions
  addTradePlan: (plan: TradePlan) => void;
  updateTradePlan: (id: string, updates: Partial<TradePlan>) => void;
  deleteTradePlan: (id: string) => void;
  getTradePlan: (id: string) => TradePlan | undefined;

  // Reflection actions
  addReflection: (reflection: Reflection) => void;
  getReflection: (tradeId: string) => Reflection | undefined;

  // Cooldown actions
  startCooldown: (cooldown: CooldownRecord) => void;
  endCooldown: () => void;
  recordCooldownViolation: () => void;

  // Goals actions
  updateGoals: (goals: {
    daily?: Partial<DailyGoal>;
    weekly?: Partial<WeeklyGoal>;
    monthly?: Partial<MonthlyGoal>;
  }) => void;

  // Calendar actions
  updateCalendarDay: (date: string, data: Partial<CalendarDay>) => void;
  getCalendarDay: (date: string) => CalendarDay | undefined;
}

const defaultDailyGoal: DailyGoal = {
  maxTrades: 10,
  maxLoss: 2000,
  minDisciplineScore: 80,
};

export const usePsychologyStore = create<PsychologyStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      current_mental_health: undefined,
      current_emotions: [{ emotion: 'neutral', score: 1.0, confidence: 1.0, indicators: ['取引開始前'] }],
      active_recommendations: [],
      discipline_rules: {},
      alerts_enabled: true,
      coaching_enabled: true,
      alerts: [],
      tradePlans: [],
      reflections: [],
      currentCooldown: null,
      cooldownRecords: [],
      goals: {
        daily: defaultDailyGoal,
      },
      calendar: {},
      sessions: [],
      analysis_history: [],

      // Core actions
      updateMentalHealth: (metrics) => set((state) => ({
        current_mental_health: metrics,
      })),

      addEmotion: (emotion) => set((state) => ({
        current_emotions: [...state.current_emotions, emotion],
      })),

      addRecommendation: (recommendation) => set((state) => ({
        active_recommendations: [...state.active_recommendations, recommendation],
      })),

      dismissRecommendation: (index) => set((state) => {
        const newRecs = [...state.active_recommendations];
        newRecs[index] = { ...newRecs[index], dismissed: true };
        return { active_recommendations: newRecs };
      }),

      updateDisciplineRules: (rules) => set((state) => ({
        discipline_rules: { ...state.discipline_rules, ...rules },
      })),

      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session],
      })),

      addAnalysis: (analysis) => set((state) => ({
        analysis_history: [...state.analysis_history, analysis],
      })),

      resetState: () => set({
        current_mental_health: undefined,
        current_emotions: [{ emotion: 'neutral', score: 1.0, confidence: 1.0, indicators: ['リセット済み'] }],
        active_recommendations: [],
        discipline_rules: {},
        alerts: [],
        tradePlans: [],
        reflections: [],
        currentCooldown: null,
        cooldownRecords: [],
        goals: {
          daily: defaultDailyGoal,
        },
        calendar: {},
        sessions: [],
        analysis_history: [],
      }),

      // Alert actions
      addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts, alert],
      })),

      clearAlerts: () => set({ alerts: [] }),

      dismissAlert: (timestamp) => set((state) => ({
        alerts: state.alerts.filter(a => a.timestamp !== timestamp),
      })),

      getAlertStats: () => {
        const state = get();
        const stats = {
          total: state.alerts.length,
          byType: {} as Record<string, number>,
          bySeverity: {} as Record<string, number>,
        };

        state.alerts.forEach(alert => {
          stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
          stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        });

        return stats;
      },

      getRecentAlerts: (hours) => {
        const state = get();
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        return state.alerts.filter(alert => new Date(alert.timestamp).getTime() >= cutoff);
      },

      // Trade plan actions
      addTradePlan: (plan) => set((state) => ({
        tradePlans: [...state.tradePlans, plan],
      })),

      updateTradePlan: (id, updates) => set((state) => ({
        tradePlans: state.tradePlans.map(plan =>
          plan.id === id ? { ...plan, ...updates } : plan
        ),
      })),

      deleteTradePlan: (id) => set((state) => ({
        tradePlans: state.tradePlans.filter(plan => plan.id !== id),
      })),

      getTradePlan: (id) => get().tradePlans.find(plan => plan.id === id),

      // Reflection actions
      addReflection: (reflection) => set((state) => ({
        reflections: [...state.reflections, reflection],
      })),

      getReflection: (tradeId) => get().reflections.find(r => r.tradeId === tradeId),

      // Cooldown actions
      startCooldown: (cooldown) => set({
        currentCooldown: cooldown,
        cooldownRecords: [...get().cooldownRecords, cooldown],
      }),

      endCooldown: () => set({ currentCooldown: null }),

      recordCooldownViolation: () => set((state) => {
        if (!state.currentCooldown) return state;
        return {
          currentCooldown: {
            ...state.currentCooldown,
            violationCount: state.currentCooldown.violationCount + 1,
            wasRespected: false,
          },
        };
      }),

      // Goals actions
      updateGoals: (newGoals) => set((state) => ({
        goals: {
          ...state.goals,
          ...newGoals,
          daily: { ...state.goals.daily, ...newGoals.daily },
          weekly: newGoals.weekly ? { ...state.goals.weekly, ...newGoals.weekly } as WeeklyGoal : state.goals.weekly,
          monthly: newGoals.monthly ? { ...state.goals.monthly, ...newGoals.monthly } as MonthlyGoal : state.goals.monthly,
        },
      })),

      // Calendar actions
      updateCalendarDay: (date, data) => set((state) => ({
        calendar: {
          ...state.calendar,
          [date]: { ...(state.calendar[date] || {}), ...data },
        },
      })),

      getCalendarDay: (date) => get().calendar[date],
    }),
    {
      name: 'trader-pro-psychology-storage',
    }
  )
);
