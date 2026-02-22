'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';

/**
 * Component to ensure client-side stores are properly hydrated from local storage.
 * Runs once on mount.
 */
export function StoreHydration() {
    useEffect(() => {
        // Manually trigger hydration on mount to ensure client-side storage is used
        // Wrapped in setTimeout to avoid cascading renders during hydration
        const timer = setTimeout(() => {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            usePortfolioStore.persist.rehydrate();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
