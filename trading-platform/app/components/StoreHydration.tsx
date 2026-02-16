'use client';

import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';

export function StoreHydration() {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // Manually trigger hydration on mount to ensure client-side storage is used
        usePortfolioStore.persist.rehydrate();
        setHydrated(true);

        console.log('[StoreHydration] Portfolio store rehydrated');
    }, []);

    return null; // This component doesn't render anything
}
