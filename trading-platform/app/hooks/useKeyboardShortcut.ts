import { useEffect } from 'react';
import { keyboardShortcutManager, KeyboardShortcut } from '@/app/lib/KeyboardShortcutManager';

export function useKeyboardShortcut(
  shortcut: Omit<KeyboardShortcut, 'description' | 'category'> & { 
    description?: string;
    category?: KeyboardShortcut['category'];
  },
  dependencies: React.DependencyList = []
): void {
  useEffect(() => {
    const fullShortcut: KeyboardShortcut = {
      ...shortcut,
      description: shortcut.description || '',
      category: shortcut.category || 'general',
    };

    keyboardShortcutManager.register(fullShortcut);

    return () => {
      keyboardShortcutManager.unregister(fullShortcut);
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}
