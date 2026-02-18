import { create } from 'zustand';
import { PredictionFeatures } from './service';

interface PredictionState {
  predictions: Record<string, number>; // symbol -> confidence
  isLoading: boolean;
  error: string | null;
  features: Record<string, PredictionFeatures>;
  
  setPrediction: (symbol: string, confidence: number, features?: PredictionFeatures) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePredictionStore = create<PredictionState>((set) => ({
  predictions: {},
  isLoading: false,
  error: null,
  features: {},

  setPrediction: (symbol, confidence, features) => set((state) => ({
    predictions: { ...state.predictions, [symbol]: confidence },
    features: features ? { ...state.features, [symbol]: features } : state.features
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
