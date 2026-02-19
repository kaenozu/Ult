import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Signal } from '@/app/types';

interface SignalStats {
  totalSignals: number;
  hitRate: number;
  avgReturn: number;
  byType: {
    BUY: { total: number; hits: number };
    SELL: { total: number; hits: number };
    HOLD: { total: number; hits: number };
  };
  byConfidence: {
    high: { total: number; hits: number };
    medium: { total: number; hits: number };
    low: { total: number; hits: number };
  };
}

interface SignalHistoryState {
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  updateSignalResult: (symbol: string, generatedAt: string, result: 'HIT' | 'MISS' | 'PENDING', actualReturn?: number) => void;
  evaluateSignal: (symbol: string, generatedAt: string, actualReturn: number) => void;
  getStatsBySymbol: (symbol: string) => SignalStats;
  getStatsByConfidence: () => SignalStats;
  clearHistory: () => void;
}

const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence > 0.7) return 'high';
  if (confidence > 0.5) return 'medium';
  return 'low';
};

export const useSignalHistoryStore = create<SignalHistoryState>()(
  persist(
    (set, get) => ({
      signals: [],
      addSignal: (signal) => set((state) => ({
        signals: [{ ...signal, generatedAt: signal.generatedAt || new Date().toISOString() }, ...state.signals].slice(0, 100)
      })),
      updateSignalResult: (symbol, generatedAt, result, actualReturn) => set((state) => ({
        signals: state.signals.map(s => 
          s.symbol === symbol && s.generatedAt === generatedAt 
            ? { ...s, result, actualReturn, evaluatedAt: new Date().toISOString() } 
            : s
        )
      })),
      evaluateSignal: (symbol, generatedAt, actualReturn) => {
        const signal = get().signals.find(s => s.symbol === symbol && s.generatedAt === generatedAt);
        if (!signal) return;
        
        const result: 'HIT' | 'MISS' = 
          (signal.type === 'BUY' && actualReturn > 0) || 
          (signal.type === 'SELL' && actualReturn < 0)
            ? 'HIT' 
            : 'MISS';
        
        set((state) => ({
          signals: state.signals.map(s => 
            s.symbol === symbol && s.generatedAt === generatedAt 
              ? { ...s, result, actualReturn, evaluatedAt: new Date().toISOString() } 
              : s
          )
        }));
      },
      getStatsBySymbol: (symbol) => {
        const signals = get().signals.filter(s => s.symbol === symbol && s.result && s.result !== 'PENDING');
        const hits = signals.filter(s => s.result === 'HIT').length;
        const total = signals.length;
        const avgReturn = signals.reduce((sum, s) => sum + (s.actualReturn || 0), 0) / (total || 1);
        
        return {
          totalSignals: total,
          hitRate: total > 0 ? (hits / total) * 100 : 0,
          avgReturn,
          byType: {
            BUY: { total: signals.filter(s => s.type === 'BUY').length, hits: signals.filter(s => s.type === 'BUY' && s.result === 'HIT').length },
            SELL: { total: signals.filter(s => s.type === 'SELL').length, hits: signals.filter(s => s.type === 'SELL' && s.result === 'HIT').length },
            HOLD: { total: signals.filter(s => s.type === 'HOLD').length, hits: signals.filter(s => s.type === 'HOLD' && s.result === 'HIT').length },
          },
          byConfidence: {
            high: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'high').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'high' && s.result === 'HIT').length },
            medium: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'medium').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'medium' && s.result === 'HIT').length },
            low: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'low').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'low' && s.result === 'HIT').length },
          },
        };
      },
      getStatsByConfidence: () => {
        const signals = get().signals.filter(s => s.result && s.result !== 'PENDING');
        const hits = signals.filter(s => s.result === 'HIT').length;
        const total = signals.length;
        const avgReturn = signals.reduce((sum, s) => sum + (s.actualReturn || 0), 0) / (total || 1);
        
        return {
          totalSignals: total,
          hitRate: total > 0 ? (hits / total) * 100 : 0,
          avgReturn,
          byType: {
            BUY: { total: signals.filter(s => s.type === 'BUY').length, hits: signals.filter(s => s.type === 'BUY' && s.result === 'HIT').length },
            SELL: { total: signals.filter(s => s.type === 'SELL').length, hits: signals.filter(s => s.type === 'SELL' && s.result === 'HIT').length },
            HOLD: { total: signals.filter(s => s.type === 'HOLD').length, hits: signals.filter(s => s.type === 'HOLD' && s.result === 'HIT').length },
          },
          byConfidence: {
            high: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'high').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'high' && s.result === 'HIT').length },
            medium: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'medium').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'medium' && s.result === 'HIT').length },
            low: { total: signals.filter(s => getConfidenceLevel(s.confidence) === 'low').length, hits: signals.filter(s => getConfidenceLevel(s.confidence) === 'low' && s.result === 'HIT').length },
          },
        };
      },
      clearHistory: () => set({ signals: [] }),
    }),
    {
      name: 'signal-history-storage',
    }
  )
);
