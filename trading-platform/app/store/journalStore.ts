import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JournalEntry } from '../types';

interface JournalStore {
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  removeJournalEntry: (id: string) => void;
  clearJournal: () => void;
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set) => ({
      journal: [],

      addJournalEntry: (entry) =>
        set((state) => ({
          journal: [...state.journal, entry],
        })),

      updateJournalEntry: (id, updates) =>
        set((state) => ({
          journal: state.journal.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        })),

      removeJournalEntry: (id) =>
        set((state) => ({
          journal: state.journal.filter((entry) => entry.id !== id),
        })),

      clearJournal: () => set({ journal: [] }),
    }),
    {
      name: 'trading-journal-storage',
    }
  )
);
