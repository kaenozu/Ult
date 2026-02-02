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
    // Initialize ML service in the background
    mlIntegrationService
      .initialize()
      .then(() => {
        const status = mlIntegrationService.getStatus();
        
        if (status.available) {
          console.info('[ML Provider] ML models loaded successfully');
        } else {
          console.info('[ML Provider] Using rule-based predictions (ML models not available)');
        }
      })
      .catch((err) => {
        console.error('[ML Provider] Initialization failed:', err);
        // Continue anyway - app works fine without ML models
      });
  }, []);

  // Don't block rendering - the app works fine without ML models
  return <>{children}</>;
}
