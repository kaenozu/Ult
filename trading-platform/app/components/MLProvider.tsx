'use client';

import { useEffect } from 'react';
import { mlIntegrationService } from '@/app/lib/services/MLIntegrationService';

/**
 * MLProvider - Initializes ML models on app startup
 * 
 * This component handles the asynchronous initialization of ML models.
 * It provides graceful degradation when models are not available.
 */
export function MLProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    mlIntegrationService
      .initialize()
      .catch(() => {
        // Continue anyway - app works fine without ML models
      });
  }, []);

  return <>{children}</>;
}
