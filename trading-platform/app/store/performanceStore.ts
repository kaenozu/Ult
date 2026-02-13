import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PerformanceScore, AISignalResult, DualMatchEntry, DualScanResult } from '../lib/PerformanceScreenerService';

// PerformanceScore に AI情報を付加した型（UI表示用）
interface DualMatchResult extends PerformanceScore {
    confidence: number;
    aiSignalType: string;
    dualScore: number;
}

/**
 * Generic result wrapper 
 */
interface ScreenerResult<T> {
    results: T[];
    totalScanned: number;
    filteredCount: number;
    scanDuration: number;
    lastUpdated: string;
}

interface DualData {
    performance: ScreenerResult<PerformanceScore>;
    aiSignals: ScreenerResult<AISignalResult>;
    dualMatches: DualMatchEntry[];
    dualMatchSymbols: string[];
}

interface PerformanceState {
    dualData: DualData | null;
    activeTab: 'performance' | 'ai-signals' | 'dual-match';
    market: 'all' | 'japan' | 'usa';
    minWinRate: number;
    minProfitFactor: number;
    minConfidence: number;
    lookbackDays: number;

    // Actions
    setDualData: (data: DualData | null) => void;
    setActiveTab: (tab: 'performance' | 'ai-signals' | 'dual-match') => void;
    setMarket: (market: 'all' | 'japan' | 'usa') => void;
    setMinWinRate: (rate: number) => void;
    setMinProfitFactor: (pf: number) => void;
    setMinConfidence: (confidence: number) => void;
    setLookbackDays: (days: number) => void;
    clearResults: () => void;
    resetSettings: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
    persist(
        (set) => ({
            dualData: null,
            activeTab: 'dual-match',
            market: 'all',
            minWinRate: 20,
            minProfitFactor: 0.8,
            minConfidence: 30,
            lookbackDays: 365,

            setDualData: (dualData) => set({ dualData }),
            setActiveTab: (activeTab) => set({ activeTab }),
            setMarket: (market) => set({ market }),
            setMinWinRate: (minWinRate) => set({ minWinRate }),
            setMinProfitFactor: (minProfitFactor) => set({ minProfitFactor }),
            setMinConfidence: (minConfidence) => set({ minConfidence }),
            setLookbackDays: (lookbackDays) => set({ lookbackDays }),
            clearResults: () => set({ dualData: null }),
            resetSettings: () => set({
                market: 'all',
                minWinRate: 20,
                minProfitFactor: 0.8,
                minConfidence: 30,
                lookbackDays: 365,
            }),
        }),
        {
            name: 'trader-pro-performance-storage',
        }
    )
);
