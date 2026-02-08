import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MentalHealthMetrics,
  EmotionScore,
  CoachingRecommendation,
  DisciplineRules,
  TradingSession,
  PsychologyAnalysisResult,
  PsychologyAlert,
  DisciplineScore,
} from '../types/psychology';
import type { CooldownRecord, CoolingReason } from '../types/risk';

export type MentalState = 'optimal' | 'cautious' | 'stressed' | 'tilt' | 'burnout';

// Re-export EmotionScore from types for convenience
export type { EmotionScore } from '../types/psychology';

export interface CalendarDay {
  date: string;
  trades: number;
  profit: number;
  emotions: EmotionScore[];
}

export interface PsychologyState {
  // Legacy properties for compatibility
  mentalState: MentalState;
  overallScore: number;
  stressLevel: number;
  disciplineScore: number;
  riskOfTilt: number;
  dominantEmotions: EmotionScore[];
  recommendations: string[];
  lastUpdate: string;

  // Current state
  current_mental_health?: MentalHealthMetrics;
  current_emotions: EmotionScore[];
  active_recommendations: CoachingRecommendation[];

  // Settings
  discipline_rules: DisciplineRules;
  alerts_enabled: boolean;
  coaching_enabled: boolean;

  // History
  sessions: TradingSession[];
  analysis_history: PsychologyAnalysisResult[];

  // Alerts and cooling
  alerts: PsychologyAlert[];
  cooldownRecords: CooldownRecord[];
  currentCooldown: CooldownRecord | null;

  // Goals and calendar
  goals: {
    dailyProfit?: number;
    maxDailyLoss?: number;
    maxTradesPerDay?: number;
    targetWinRate?: number;
  };
  calendar: Record<string, CalendarDay>;

  // Actions
  updateMetrics: (metrics: Partial<Omit<PsychologyState, 'updateMetrics' | 'resetMetrics' | 'addAlert' | 'startCooldown' | 'setDisciplineScore' | 'endCooldown' | 'getCalendarDay' | 'clearAlerts' | 'dismissAlert' | 'updateGoals' | 'updateCalendarDay' | 'addEmotion' | 'addAnalysis' | 'dismissRecommendation'>>) => void;
  resetMetrics: () => void;
  addAlert: (alert: PsychologyAlert) => void;
  clearAlerts: () => void;
  dismissAlert: (alertId: string) => void;
  startCooldown: (cooldown: CooldownRecord) => void;
  endCooldown: (cooldownId: string) => void;
  setDisciplineScore: (score: number) => void;
  getCalendarDay: (date: string) => CalendarDay | undefined;
  updateCalendarDay: (date: string, day: Partial<CalendarDay>) => void;
  updateGoals: (goals: Partial<PsychologyState['goals']>) => void;
  addEmotion: (emotion: EmotionScore) => void;
  addAnalysis: (analysis: PsychologyAnalysisResult) => void;
  dismissRecommendation: (index: number) => void;
}

const initialState: Omit<PsychologyState, 'updateMetrics' | 'resetMetrics' | 'addAlert' | 'startCooldown' | 'setDisciplineScore' | 'endCooldown' | 'getCalendarDay' | 'clearAlerts' | 'dismissAlert' | 'updateGoals' | 'updateCalendarDay' | 'addEmotion' | 'addAnalysis' | 'dismissRecommendation'> = {
  // Legacy
  mentalState: 'optimal',
  overallScore: 100,
  stressLevel: 0,
  disciplineScore: 100,
  riskOfTilt: 0,
  dominantEmotions: [{ emotion: 'neutral', score: 1.0, indicators: ['取引開始前'] }],
  recommendations: ['メンタル状態は良好です。計画通りに取引を続けてください。'],
  lastUpdate: new Date().toISOString(),

  // Current state
  current_mental_health: undefined,
  current_emotions: [],
  active_recommendations: [],

  // Settings
  discipline_rules: {
    max_position_size: 100000,
    max_daily_loss: 5000,
    max_risk_per_trade: 0.02,
    max_trades_per_day: 10,
    min_risk_reward_ratio: 1.5,
    required_stop_loss: true,
    max_consecutive_losses: 3,
    max_trading_hours: 8,
  },
  alerts_enabled: true,
  coaching_enabled: true,

  // History
  sessions: [],
  analysis_history: [],

  // Alerts and cooling
  alerts: [],
  cooldownRecords: [],
  currentCooldown: null,

  // Goals and calendar
  goals: {},
  calendar: {},
};

export const usePsychologyStore = create<PsychologyState>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateMetrics: (metrics) => set((state) => ({
        ...state,
        ...metrics,
        lastUpdate: new Date().toISOString(),
      })),

      resetMetrics: () => set({
        ...initialState,
        lastUpdate: new Date().toISOString(),
      }),

      addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts, alert],
      })),

      clearAlerts: () => set({ alerts: [] }),

      dismissAlert: (alertId) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== alertId),
      })),

      startCooldown: (cooldown) => set((state) => ({
        currentCooldown: cooldown,
        cooldownRecords: [...state.cooldownRecords, cooldown],
      })),

      endCooldown: (cooldownId) => set((state) => ({
        currentCooldown: state.currentCooldown?.id === cooldownId ? null : state.currentCooldown,
        cooldownRecords: state.cooldownRecords.map(c =>
          c.id === cooldownId ? { ...c, endTime: new Date() } : c
        ),
      })),

      setDisciplineScore: (score) => set({ disciplineScore: score }),

      getCalendarDay: (date) => get().calendar[date],

      updateCalendarDay: (date, day) => set((state) => ({
        calendar: {
          ...state.calendar,
          [date]: { ...state.calendar[date], ...day, date },
        },
      })),

      updateGoals: (goals) => set((state) => ({
        goals: { ...state.goals, ...goals },
      })),

      addEmotion: (emotion) => set((state) => ({
        current_emotions: [...state.current_emotions, emotion],
        dominantEmotions: [...state.dominantEmotions.slice(-4), emotion],
      })),

      addAnalysis: (analysis) => set((state) => ({
        analysis_history: [...state.analysis_history, analysis],
        current_mental_health: analysis.mental_health,
        active_recommendations: analysis.coaching_recommendations.filter(r => !r.dismissed),
      })),

      dismissRecommendation: (index) => set((state) => {
        const updated = [...state.active_recommendations];
        if (updated[index]) {
          updated[index] = { ...updated[index], dismissed: true };
        }
        return { active_recommendations: updated.filter(r => !r.dismissed) };
      }),
    }),
    {
      name: 'trader-pro-psychology-storage',
    }
  )
);
