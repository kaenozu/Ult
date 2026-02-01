import { KeyboardShortcutManager } from '../KeyboardShortcutManager';

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;

  beforeEach(() => {
    manager = new KeyboardShortcutManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Registration', () => {
    it('should register a shortcut', () => {
      const action = jest.fn();
      manager.register({
        key: 'a',
        description: 'Test shortcut',
        category: 'general',
        action,
      });

      const shortcuts = manager.getAllShortcuts();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('a');
    });

    it('should register a shortcut with modifiers', () => {
      const action = jest.fn();
      manager.register({
        key: 's',
        ctrl: true,
        description: 'Save',
        category: 'general',
        action,
      });

      const shortcuts = manager.getAllShortcuts();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].ctrl).toBe(true);
    });

    it('should unregister a shortcut', () => {
      const action = jest.fn();
      manager.register({
        key: 'a',
        description: 'Test',
        category: 'general',
        action,
      });

      manager.unregister({ key: 'a' });

      const shortcuts = manager.getAllShortcuts();
      expect(shortcuts).toHaveLength(0);
    });
  });

  describe('Categories', () => {
    it('should filter shortcuts by category', () => {
      manager.register({
        key: 'a',
        description: 'Navigation shortcut',
        category: 'navigation',
        action: jest.fn(),
      });

      manager.register({
        key: 'b',
        description: 'Trading shortcut',
        category: 'trading',
        action: jest.fn(),
      });

      const navigationShortcuts = manager.getShortcutsByCategory('navigation');
      expect(navigationShortcuts).toHaveLength(1);
      expect(navigationShortcuts[0].key).toBe('a');
    });
  });

  describe('Enable/Disable', () => {
    it('should be enabled by default', () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it('should disable shortcuts', () => {
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });

    it('should enable shortcuts', () => {
      manager.disable();
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });
  });

  describe('Format Shortcut', () => {
    it('should format simple shortcut', () => {
      const formatted = KeyboardShortcutManager.formatShortcut({
        key: 'a',
        description: 'Test',
        category: 'general',
        action: jest.fn(),
      });

      expect(formatted).toBe('A');
    });

    it('should format shortcut with Ctrl', () => {
      const formatted = KeyboardShortcutManager.formatShortcut({
        key: 's',
        ctrl: true,
        description: 'Save',
        category: 'general',
        action: jest.fn(),
      });

      expect(formatted).toBe('Ctrl+S');
    });

    it('should format shortcut with multiple modifiers', () => {
      const formatted = KeyboardShortcutManager.formatShortcut({
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo',
        category: 'general',
        action: jest.fn(),
      });

      expect(formatted).toBe('Ctrl+Shift+Z');
    });
  });

  describe('Cleanup', () => {
    it('should clear all shortcuts on destroy', () => {
      manager.register({
        key: 'a',
        description: 'Test',
        category: 'general',
        action: jest.fn(),
      });

      manager.destroy();

      const shortcuts = manager.getAllShortcuts();
      expect(shortcuts).toHaveLength(0);
    });
  });
});
