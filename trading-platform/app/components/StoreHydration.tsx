'use client';

import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';

export function StoreHydration() {
    const [hydrated, setHydrated] = useState(false);
    
    useEffect(() => {
        // Manually trigger hydration on mount to ensure client-side storage is used
        usePortfolioStore.persist.rehydrate();
        setHydrated(true);
    }, []);

    if (!hydrated) return null;

    return null;
}
