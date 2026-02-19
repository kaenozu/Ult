'use client';

import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';

export function StoreHydration() {
    const [hydrated, setHydrated] = useState(false);
    
    useEffect(() => {
        // Manually trigger hydration on mount to ensure client-side storage is used
        usePortfolioStore.persist.rehydrate();
        // Use setTimeout to avoid synchronous setState in effect
        const timer = setTimeout(() => {
            setHydrated(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    if (!hydrated) return null;

    return null;
}
