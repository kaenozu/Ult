import { create } from 'zustand';

interface NeuralState {
    isActive: boolean;
    latestThought: string;
    sentimentScore: number; // -1 to 1 range effectively, or 0-1
    sentimentLabel: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    setIsActive: (active: boolean) => void;
    addThought: (thought: string, score: number, label: any) => void;
}

export const useNeuralStore = create<NeuralState>((set) => ({
    isActive: false, // "Divine Mode" toggle
    latestThought: "Quantum circuitry initializing...",
    sentimentScore: 0.5,
    sentimentLabel: 'NEUTRAL',
    setIsActive: (active) => set({ isActive: active }),
    addThought: (thought, score, label) => set({
        latestThought: thought,
        sentimentScore: score,
        sentimentLabel: label
    }),
}));
