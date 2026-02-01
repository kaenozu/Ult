'use client';

import { useEffect } from 'react';
import { KeyboardShortcutHelp } from './KeyboardShortcutHelp';
import { AlertConditionManager } from './AlertConditionManager';
import { DashboardCustomizer } from './DashboardCustomizer';
import { useKeyboardShortcut } from '@/app/hooks/useKeyboardShortcut';
import { alertNotificationSystem } from '@/app/lib/AlertNotificationSystem';

export function UserExperienceEnhancements() {
  // Request notification permission on mount
  useEffect(() => {
    alertNotificationSystem.requestNotificationPermission();
  }, []);

  // Example keyboard shortcuts for navigation
  useKeyboardShortcut(
    {
      key: 'h',
      description: 'Go to Home',
      category: 'navigation',
      action: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      },
    },
    []
  );

  useKeyboardShortcut(
    {
      key: 's',
      ctrl: true,
      description: 'Search stocks',
      category: 'navigation',
      action: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
    },
    []
  );

  return (
    <>
      <KeyboardShortcutHelp />
      <AlertConditionManager />
      <DashboardCustomizer />
    </>
  );
}
