'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/app/store/uiStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider
 *
 * Dynamically manages the HTML element's class based on the current theme.
 * Listens to theme changes from uiStore and updates document.documentElement accordingly.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}
