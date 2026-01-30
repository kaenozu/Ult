import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JournalEntry } from '../types';

interface JournalStore {
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set) => ({
      journal: [],

      addJournalEntry: (entry) => set((state) => ({
        journal: [...state.journal, entry],
      })),
    }),
    {
      name: 'journal-storage',
    }
  )
);