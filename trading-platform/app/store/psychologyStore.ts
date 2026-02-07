import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MentalState = 'optimal' | 'cautious' | 'stressed' | 'tilt' | 'burnout';

export interface EmotionScore {
  emotion: 'fear' | 'greed' | 'confidence' | 'anxiety' | 'euphoria' | 'frustration' | 'discipline' | 'neutral';
  score: number; // 0.0 to 1.0
  indicators: string[];
}

export interface PsychologyState {
  mentalState: MentalState;
  overallScore: number; // 0-100
  stressLevel: number; // 0-100
  disciplineScore: number; // 0-100
  riskOfTilt: number; // 0-1.0
  dominantEmotions: EmotionScore[];
  recommendations: string[];
  lastUpdate: string;
  
  // Actions
  updateMetrics: (metrics: Partial<PsychologyState>) => void;
  resetMetrics: () => void;
}

export const usePsychologyStore = create<PsychologyState>()(
  persist(
    (set) => ({
      mentalState: 'optimal',
      overallScore: 100,
      stressLevel: 0,
      disciplineScore: 100,
      riskOfTilt: 0,
      dominantEmotions: [{ emotion: 'neutral', score: 1.0, indicators: ['取引開始前'] }],
      recommendations: ['メンタル状態は良好です。計画通りに取引を続けてください。'],
      lastUpdate: new Date().toISOString(),

      updateMetrics: (metrics) => set((state) => ({
        ...state,
        ...metrics,
        lastUpdate: new Date().toISOString(),
      })),

      resetMetrics: () => set({
        mentalState: 'optimal',
        overallScore: 100,
        stressLevel: 0,
        disciplineScore: 100,
        riskOfTilt: 0,
        dominantEmotions: [{ emotion: 'neutral', score: 1.0, indicators: ['リセット済み'] }],
        recommendations: ['リセットされました。'],
        lastUpdate: new Date().toISOString(),
      }),
    }),
    {
      name: 'trader-pro-psychology-storage',
    }
  )
);
