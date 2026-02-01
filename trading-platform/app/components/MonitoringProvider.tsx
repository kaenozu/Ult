'use client';

/**
 * Monitoring Provider Component
 * 
 * Initializes monitoring and error tracking on the client side.
 * Should be included at the root of the application.
 */

import { useEffect } from 'react';
import { initializeMonitoring } from '@/app/lib/monitoring';

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize monitoring on client mount
    initializeMonitoring({
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      enableWebVitals: process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS !== 'false',
    });
  }, []);

  return <>{children}</>;
}
