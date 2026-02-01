'use client';

import { useState, useEffect } from 'react';
import { keyboardShortcutManager, KeyboardShortcutManager } from '@/app/lib/KeyboardShortcutManager';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

export function KeyboardShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(keyboardShortcutManager.getAllShortcuts());

  useEffect(() => {
    // Refresh shortcuts when modal is opened
    if (isOpen) {
      setShortcuts(keyboardShortcutManager.getAllShortcuts());
    }
  }, [isOpen]);

  // Register the help shortcut itself
  useEffect(() => {
    keyboardShortcutManager.register({
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      category: 'general',
      action: () => setIsOpen(true),
    });

    return () => {
      keyboardShortcutManager.unregister({
        key: '?',
        shift: true,
      });
    };
  }, []);

  const categories = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    trading: shortcuts.filter(s => s.category === 'trading'),
    view: shortcuts.filter(s => s.category === 'view'),
    general: shortcuts.filter(s => s.category === 'general'),
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#1a2332] rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Keyboard className="w-6 h-6" />
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(categories).map(([category, categoryShortcuts]) => {
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold capitalize mb-3 text-primary">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-gray-800 rounded"
                    >
                      <span className="text-gray-300">{shortcut.description}</span>
                      <kbd className="px-3 py-1 bg-gray-700 rounded font-mono text-sm">
                        {KeyboardShortcutManager.formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {shortcuts.length === 0 && (
            <p className="text-gray-400 text-center py-8">
              No keyboard shortcuts registered
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-sm text-gray-400 text-center">
            Press <kbd className="px-2 py-1 bg-gray-700 rounded font-mono text-xs">Shift+?</kbd> to
            toggle this help screen
          </p>
        </div>
      </div>
    </div>
  );
}
