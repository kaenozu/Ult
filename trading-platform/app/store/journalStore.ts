/**
 * Journal Store with AI Trade Advisor Integration
 * 
 * Integrates pattern recognition and psychology monitoring
 * with the basic journal functionality.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JournalEntry } from '@/app/types';
import { getPatternRecognitionEngine, PatternReport } from '@/app/lib/trading/patternRecognition';
import { getPsychologyMonitor, PsychologyWarning, PsychologyState } from '@/app/lib/trading/psychology';

/**
 * Journal store interface
 */
export interface JournalStore {
  // Basic journal entries
  journal: JournalEntry[];
  
  // Pattern recognition
  patternReport: PatternReport | null;
  isAnalyzingPatterns: boolean;
  
  // Psychology monitoring
  psychologyState: PsychologyState;
  activeWarnings: PsychologyWarning[];
  
  // Actions
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  
  // Pattern recognition actions
  analyzePatterns: () => void;
  getPatternReport: () => PatternReport | null;
  
  // Psychology monitoring actions
  recordTradeForPsychology: (entry: JournalEntry, currentBalance?: number) => PsychologyWarning[];
  getPsychologyState: () => PsychologyState;
  getActiveWarnings: () => PsychologyWarning[];
  clearWarnings: () => void;
  resetPsychology: () => void;
  
  // Initialization
  initializeAIAdvisor: () => void;
}

/**
 * Create journal store
 * Uses 'extended-journal-storage' for persistence to maintain compatibility with previous extended data.
 */
export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      // Initial state
      journal: [],
      patternReport: null,
      isAnalyzingPatterns: false,
      psychologyState: {
        consecutiveLosses: 0,
        consecutiveWins: 0,
        totalLosses: 0,
        totalWins: 0,
        currentStreak: 'neutral',
        riskTolerance: 1.0,
        lastTradeDate: null,
        tradesToday: 0,
        totalTrades: 0,
      },
      activeWarnings: [],

      /**
       * Add a journal entry
       */
      addJournalEntry: (entry) => {
        set((state) => ({
          journal: [entry, ...state.journal]
        }));

        // Trigger pattern analysis
        get().analyzePatterns();

        // Record for psychology monitoring if trade is closed
        if (entry.status === 'CLOSED') {
          get().recordTradeForPsychology(entry);
        }
      },

      /**
       * Update a journal entry
       */
      updateJournalEntry: (id, updates) => {
        set((state) => ({
          journal: state.journal.map(entry =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        }));

        // Trigger pattern analysis if status changed to CLOSED
        const updatedEntry = get().journal.find(e => e.id === id);
        if (updatedEntry && updatedEntry.status === 'CLOSED') {
          get().analyzePatterns();
          get().recordTradeForPsychology(updatedEntry);
        }
      },

      /**
       * Delete a journal entry
       */
      deleteJournalEntry: (id) => {
        set((state) => ({
          journal: state.journal.filter(entry => entry.id !== id)
        }));

        // Trigger pattern analysis
        get().analyzePatterns();
      },

      /**
       * Analyze patterns from journal entries
       */
      analyzePatterns: () => {
        const { journal } = get();
        
        set({ isAnalyzingPatterns: true });

        try {
          const engine = getPatternRecognitionEngine();
          engine.addJournalEntries(journal);
          engine.learnFromJournal();
          
          const report = engine.generateReport();
          set({ patternReport: report, isAnalyzingPatterns: false });
        } catch (error) {
          console.error('Pattern analysis failed:', error);
          set({ isAnalyzingPatterns: false });
        }
      },

      /**
       * Get pattern report
       */
      getPatternReport: () => {
        return get().patternReport;
      },

      /**
       * Record trade for psychology monitoring
       */
      recordTradeForPsychology: (entry, currentBalance) => {
        const monitor = getPsychologyMonitor();
        const warnings = monitor.recordTrade(entry, currentBalance);
        
        set({
          psychologyState: monitor.getState(),
          activeWarnings: monitor.getActiveWarnings(),
        });

        return warnings;
      },

      /**
       * Get psychology state
       */
      getPsychologyState: () => {
        return get().psychologyState;
      },

      /**
       * Get active warnings
       */
      getActiveWarnings: () => {
        return get().activeWarnings;
      },

      /**
       * Clear warnings
       */
      clearWarnings: () => {
        const monitor = getPsychologyMonitor();
        monitor.clearWarnings();
        set({ activeWarnings: [] });
      },

      /**
       * Reset psychology state
       */
      resetPsychology: () => {
        const monitor = getPsychologyMonitor();
        monitor.resetState();
        set({
          psychologyState: monitor.getState(),
          activeWarnings: [],
        });
      },

      /**
       * Initialize AI Advisor
       */
      initializeAIAdvisor: () => {
        const { journal } = get();
        
        // Initialize pattern recognition engine with existing journal
        const engine = getPatternRecognitionEngine();
        engine.addJournalEntries(journal);
        engine.learnFromJournal();
        
        const report = engine.generateReport();
        
        // Initialize psychology monitor with existing closed trades
        const monitor = getPsychologyMonitor();
        const closedTrades = journal.filter(e => e.status === 'CLOSED');
        
        for (const trade of closedTrades) {
          monitor.recordTrade(trade);
        }

        set({
          patternReport: report,
          psychologyState: monitor.getState(),
          activeWarnings: monitor.getActiveWarnings(),
        });
      },
    }),
    {
      name: 'extended-journal-storage',
      partialize: (state) => ({
        journal: state.journal,
        patternReport: state.patternReport,
        psychologyState: state.psychologyState,
        activeWarnings: state.activeWarnings,
      }),
    }
  )
);

/**
 * Alias for backward compatibility during migration
 */
export const useExtendedJournalStore = useJournalStore;
