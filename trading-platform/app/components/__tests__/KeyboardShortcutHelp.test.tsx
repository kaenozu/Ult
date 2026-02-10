import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KeyboardShortcutHelp } from '../KeyboardShortcutHelp';

// Mock UI Store
const mockSetKeyboardShortcuts = jest.fn();

jest.mock('@/app/store/uiStore', () => ({
  useUIStore: (selector) => {
    const state = {
      showKeyboardShortcuts: true,
      setKeyboardShortcuts: mockSetKeyboardShortcuts
    };
    return selector(state);
  }
}));

// Mock KeyboardShortcutManager
jest.mock('@/app/lib/KeyboardShortcutManager', () => ({
  keyboardShortcutManager: {
    getAllShortcuts: jest.fn(() => [
      { category: 'general', description: 'Test shortcut', key: 'T', action: jest.fn() }
    ]),
    register: jest.fn(),
    unregister: jest.fn(),
    formatShortcut: jest.fn(() => 'T')
  },
  KeyboardShortcutManager: {
    formatShortcut: jest.fn(() => 'T')
  }
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Keyboard: () => <span data-testid="icon-keyboard" />,
  X: () => <span data-testid="icon-close" />
}));

describe('KeyboardShortcutHelp', () => {
  beforeEach(() => {
    mockSetKeyboardShortcuts.mockClear();
  });

  it('renders correctly when open', () => {
    render(<KeyboardShortcutHelp />);

    // Check for accessibility roles
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'keyboard-shortcuts-title');

    // Check title
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByTestId('icon-keyboard')).toBeInTheDocument();
  });

  it('renders categories and shortcuts', () => {
    render(<KeyboardShortcutHelp />);
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('Test shortcut')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    render(<KeyboardShortcutHelp />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(mockSetKeyboardShortcuts).toHaveBeenCalledWith(false);
  });

  it('closes when clicking outside the modal content', () => {
    render(<KeyboardShortcutHelp />);
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    expect(mockSetKeyboardShortcuts).toHaveBeenCalledWith(false);
  });

  it('does not close when clicking inside the modal content', () => {
    render(<KeyboardShortcutHelp />);
    const content = screen.getByText('Keyboard Shortcuts');
    fireEvent.click(content);
    expect(mockSetKeyboardShortcuts).not.toHaveBeenCalled();
  });

  it('closes when Escape key is pressed', () => {
    render(<KeyboardShortcutHelp />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockSetKeyboardShortcuts).toHaveBeenCalledWith(false);
  });
});
