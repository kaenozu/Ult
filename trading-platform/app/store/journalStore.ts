import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { JournalEntry } from '@/app/types';

interface JournalStore {
    journal: JournalEntry[];
    addJournalEntry: (entry: JournalEntry) => void;
    updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
    deleteJournalEntry: (id: string) => void;
}

export const useJournalStore = create<JournalStore>()(
    persist(
        (set) => ({
            journal: [],
            addJournalEntry: (entry) => set((state) => ({
                journal: [entry, ...state.journal]
            })),
            updateJournalEntry: (id, updates) => set((state) => ({
                journal: state.journal.map(entry =>
                    entry.id === id ? { ...entry, ...updates } : entry
                )
            })),
            deleteJournalEntry: (id) => set((state) => ({
                journal: state.journal.filter(entry => entry.id !== id)
            })),
        }),
        {
            name: 'journal-storage',
        }
    )
);
